<script setup>
import { ref, computed, watch, onMounted } from "vue"
import CorpusMap from "@/components/CorpusMap.vue"
import { fetchMap, fetchAbstract, apiMode } from "@/lib/api"
import { clusterColor } from "@/lib/demo"

const points = ref([])
const loading = ref(true)
const error = ref("")
const colorBy = ref("cluster")
const search = ref("")
const selected = ref(null)
const selectedAbstract = ref("")
const abstractLoading = ref(false)
const mapRef = ref(null)

const disabled = ref(new Set()) // klaster yang dimatikan dari filter

// Tema (klaster) unik: pasangan (cluster, cluster_label) → dipakai untuk legenda.
const clusters = computed(() => {
  const seen = new Map()
  for (const p of points.value) {
    if (p.cluster === null || p.cluster === undefined) continue
    if (!seen.has(p.cluster)) seen.set(p.cluster, p.cluster_label || `Tema ${p.cluster}`)
  }
  return [...seen.entries()]
    .map(([id, label]) => ({ id, label, color: clusterColor(id) }))
    .sort((a, b) => a.id - b.id)
})

const activeClusters = computed(() =>
  clusters.value.map((c) => c.id).filter((id) => !disabled.value.has(id)),
)

const yearExtent = computed(() => {
  const ys = points.value.map((p) => p.year).filter(Number.isFinite)
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : [null, null]
})
const yMin = ref(null)
const yMax = ref(null)

// Titik yang lolos filter rentang tahun (klaster ditangani via dim di peta).
const visiblePoints = computed(() => {
  if (yMin.value === null || yMax.value === null) return points.value
  return points.value.filter(
    (p) => !Number.isFinite(p.year) || (p.year >= yMin.value && p.year <= yMax.value),
  )
})

const highlightIds = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (q.length < 2) return []
  return visiblePoints.value.filter((p) => p.title.toLowerCase().includes(q)).map((p) => p.id)
})

function onYMin(e) {
  const v = Number(e.target.value)
  yMin.value = Math.min(v, yMax.value)
}
function onYMax(e) {
  const v = Number(e.target.value)
  yMax.value = Math.max(v, yMin.value)
}

function toggleCluster(id) {
  const next = new Set(disabled.value)
  next.has(id) ? next.delete(id) : next.add(id)
  disabled.value = next
}
function reset() {
  disabled.value = new Set()
  search.value = ""
  selected.value = null
  yMin.value = yearExtent.value[0]
  yMax.value = yearExtent.value[1]
  mapRef.value?.resetView()
}

async function onSelect(p) {
  selected.value = p
  selectedAbstract.value = ""
  abstractLoading.value = true
  try {
    selectedAbstract.value = (await fetchAbstract(p.id)) || ""
  } catch {
    selectedAbstract.value = ""
  } finally {
    abstractLoading.value = false
  }
}

watch(yearExtent, ([lo, hi]) => {
  if (yMin.value === null && lo !== null) yMin.value = lo
  if (yMax.value === null && hi !== null) yMax.value = hi
})

onMounted(async () => {
  try {
    points.value = await fetchMap()
  } catch (e) {
    error.value = e.message || "Gagal memuat data peta."
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <header class="head">
      <div>
        <span class="eyebrow">Fitur · Peta tema riset</span>
        <h1 class="h1">Tema riset jurusan</h1>
        <p class="sub">
          Setiap titik satu judul, didekatkan menurut kemiripan makna (proyeksi UMAP
          2D) dan diwarnai per <strong>tema riset</strong> yang ditemukan otomatis.
          Titik berdekatan = sub-bidang yang bertetangga.
        </p>
      </div>
      <div class="count card">
        <div class="count-n serif">{{ points.length }}</div>
        <div class="count-l faint">judul terpeta</div>
      </div>
    </header>

    <div class="layout">
      <!-- KONTROL -->
      <aside class="panel card card-pad">
        <div class="block">
          <span class="field-label">Warnai berdasarkan</span>
          <div class="seg">
            <button :class="{ on: colorBy === 'cluster' }" @click="colorBy = 'cluster'">Tema</button>
            <button :class="{ on: colorBy === 'year' }" @click="colorBy = 'year'">Tahun</button>
          </div>
        </div>

        <div class="block">
          <label class="field-label" for="q">Sorot judul</label>
          <input id="q" v-model="search" class="input" placeholder="kata kunci judul…" />
        </div>

        <div class="block">
          <div class="legend-head">
            <span class="field-label" style="margin: 0">{{ colorBy === "year" ? "Tahun" : "Tema riset" }}</span>
            <button v-if="disabled.size" class="mini" @click="disabled = new Set()">tampilkan semua</button>
          </div>

          <div v-if="colorBy === 'cluster'" class="legend">
            <button
              v-for="c in clusters"
              :key="c.id"
              class="leg"
              :class="{ off: disabled.has(c.id) }"
              @click="toggleCluster(c.id)"
            >
              <span class="dot" :style="{ background: c.color }" />
              <span class="leg-l">{{ c.label }}</span>
            </button>
          </div>

          <div v-else class="ramp">
            <div class="ramp-bar" />
            <div class="ramp-lbl faint">
              <span>{{ yearExtent[0] }}</span><span>{{ yearExtent[1] }}</span>
            </div>
          </div>
        </div>

        <div v-if="yearExtent[0] !== null" class="block">
          <div class="legend-head">
            <span class="field-label" style="margin: 0">Rentang tahun</span>
            <span class="range-val mono">{{ yMin }}–{{ yMax }}</span>
          </div>
          <div class="dualrange">
            <div class="dr-track" />
            <input
              type="range"
              :min="yearExtent[0]"
              :max="yearExtent[1]"
              :value="yMin"
              @input="onYMin"
            />
            <input
              type="range"
              :min="yearExtent[0]"
              :max="yearExtent[1]"
              :value="yMax"
              @input="onYMax"
            />
          </div>
        </div>

        <button class="btn btn-ghost btn-sm reset" @click="reset">Atur ulang tampilan</button>

        <p class="hint faint">
          Gulir untuk zoom · seret untuk geser · klik titik untuk abstrak.
        </p>
      </aside>

      <!-- PETA -->
      <div class="stage">
        <div v-if="loading" class="stage-state card"><span class="spinner" /> Memuat peta…</div>
        <div v-else-if="error" class="stage-state card err">{{ error }}</div>
        <CorpusMap
          v-else
          ref="mapRef"
          :points="visiblePoints"
          :color-by="colorBy"
          :active-clusters="activeClusters"
          :highlight-ids="highlightIds"
          @select="onSelect"
        />

        <Transition name="fade">
          <div v-if="selected" class="detail card">
            <button class="x" @click="selected = null" aria-label="Tutup">×</button>
            <span class="chip">
              <span class="dot" :style="{ background: clusterColor(selected.cluster) }" />
              {{ selected.cluster_label }}
            </span>
            <h4 class="detail-t">{{ selected.title }}</h4>
            <p class="faint detail-m">{{ selected.year }}</p>
            <p v-if="abstractLoading" class="detail-a faint"><span class="spinner" /> memuat abstrak…</p>
            <p v-else-if="selectedAbstract" class="detail-a">{{ selectedAbstract }}</p>
          </div>
        </Transition>
      </div>
    </div>

    <p v-if="apiMode.demo" class="footnote faint">
      Mode demo — peta menampilkan korpus contoh. Di mode live, titik dibaca langsung
      dari view <code>theses_map</code> Supabase, abstrak diambil saat titik diklik.
    </p>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.h1 {
  font-size: clamp(26px, 3.4vw, 38px);
  margin-top: 10px;
}
.sub {
  margin-top: 12px;
  max-width: 60ch;
  color: var(--muted);
}
.count {
  padding: 14px 22px;
  text-align: center;
  flex: none;
}
.count-n {
  font-size: 34px;
  font-weight: 600;
  color: var(--brand);
  line-height: 1;
}
.count-l {
  font-size: 12px;
  margin-top: 4px;
}

.layout {
  display: grid;
  /* minmax(0, 1fr): batas-min kolom = 0 agar lebar intrinsik <canvas> tak
     memaksa kolom melebar → memutus loop ukuran & overflow horizontal. */
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.panel {
  position: sticky;
  top: 86px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
.block {
  display: flex;
  flex-direction: column;
}
.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 11px;
}
.seg button {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  background: transparent;
  border: 0;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.seg button.on {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.legend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}
.mini {
  font: inherit;
  font-size: 11.5px;
  color: var(--accent);
  background: none;
  border: 0;
  cursor: pointer;
  padding: 0;
}
.range-val {
  font-size: 12px;
  color: var(--muted);
}
.legend {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.leg {
  display: flex;
  align-items: center;
  gap: 9px;
  font: inherit;
  font-size: 12.5px;
  color: var(--text);
  background: none;
  border: 0;
  padding: 6px 7px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, opacity 0.12s;
}
.leg:hover {
  background: var(--surface-2);
}
.leg .dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex: none;
}
.leg.off {
  opacity: 0.4;
}
.leg.off .leg-l {
  text-decoration: line-through;
}
.ramp-bar {
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, #6f93a6, #66101f);
}
.ramp-lbl {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-top: 6px;
}

/* Dual-range tahun */
.dualrange {
  position: relative;
  height: 24px;
}
.dr-track {
  position: absolute;
  top: 11px;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 999px;
  background: var(--border-2);
}
.dualrange input[type="range"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  margin: 0;
  background: none;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}
.dualrange input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  pointer-events: auto;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--brand);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.dualrange input[type="range"]::-moz-range-thumb {
  pointer-events: auto;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--brand);
  cursor: pointer;
}
.reset {
  width: 100%;
}
.hint {
  font-size: 12px;
  line-height: 1.5;
}

.stage {
  position: relative;
  height: min(72vh, 680px);
  min-width: 0;
  overflow: hidden;
}
.stage :deep(.map-wrap) {
  height: 100%;
}
.stage-state {
  height: 100%;
  display: grid;
  place-items: center;
  gap: 10px;
  color: var(--muted);
}
.stage-state.err {
  color: var(--sangat_mirip);
}
.detail {
  position: absolute;
  left: 16px;
  bottom: 16px;
  max-width: 360px;
  padding: 16px 18px;
  padding-right: 38px;
}
.detail .x {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 20px;
  line-height: 1;
  color: var(--faint);
  background: none;
  border: 0;
  cursor: pointer;
}
.detail-t {
  font-family: var(--sans);
  font-weight: 600;
  font-size: 14.5px;
  line-height: 1.4;
  margin-top: 10px;
  color: var(--text);
}
.detail-m {
  margin-top: 6px;
  font-size: 12.5px;
}
.detail-a {
  margin-top: 10px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.footnote {
  margin-top: 18px;
  font-size: 12.5px;
}
.footnote code {
  font-family: var(--mono);
  font-size: 11.5px;
  background: var(--surface-2);
  padding: 1px 6px;
  border-radius: 6px;
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .panel {
    position: static;
  }
  .stage {
    height: 64vh;
  }
}
</style>

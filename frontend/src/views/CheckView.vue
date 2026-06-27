<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue"
import SimilarityGauge from "@/components/SimilarityGauge.vue"
import MatchList from "@/components/MatchList.vue"
import CorpusMap from "@/components/CorpusMap.vue"
import { checkTitle, fetchMap, apiMode } from "@/lib/api"

const title = ref("")
const result = ref(null)
const loading = ref(false)
const error = ref("")
const mapPoints = ref([])
const showMap = ref(false)
const showNearAbstract = ref(false)

const MIN_LIVE = 15 // panjang minimum untuk auto-cek (Fitur 1)
const MIN_CHECK = 5 // panjang minimum untuk tombol Cek (samakan dgn backend/app.py)

let ctrl = null
let timer = null

const top = computed(() => result.value?.top || null)
const gaugePercent = computed(() => top.value?.percent ?? 0)
const matches = computed(() => result.value?.matches || [])
const neighborIds = computed(() => matches.value.slice(0, 6).map((m) => m.id))
const isDuplicate = computed(() => (top.value?.percent ?? 0) >= 85)
const charCount = computed(() => title.value.trim().length)

// Token judul query — untuk menyorot kata yang sama pada judul hasil.
const queryTokens = computed(() =>
  title.value
    .split(/\s+/)
    .map((w) => w.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 2),
)

// ── Fitur 1: pengukur kemiripan real-time (debounce + abort) ────────────────
watch(title, (val) => {
  clearTimeout(timer)
  error.value = ""
  showNearAbstract.value = false
  if (val.trim().length < MIN_LIVE) return
  timer = setTimeout(() => run(val), 500)
})

async function run(val) {
  const q = (val ?? title.value).trim()
  if (q.length < MIN_CHECK) {
    error.value = `Judul terlalu pendek (min ${MIN_CHECK} karakter).`
    return
  }
  ctrl?.abort()
  ctrl = new AbortController()
  loading.value = true
  error.value = ""
  try {
    const res = await checkTitle(q, 10, ctrl.signal)
    result.value = res
    if (!showMap.value) loadMap()
  } catch (e) {
    if (e.name !== "AbortError") error.value = e.message || "Gagal memeriksa judul."
  } finally {
    loading.value = false
  }
}

async function loadMap() {
  try {
    mapPoints.value = await fetchMap()
    showMap.value = true
  } catch {
    /* peta opsional di tampilan ini */
  }
}

function onSubmit() {
  clearTimeout(timer)
  run(title.value)
}
function clearAll() {
  clearTimeout(timer)
  ctrl?.abort()
  title.value = ""
  result.value = null
  error.value = ""
  showNearAbstract.value = false
}

onBeforeUnmount(() => {
  clearTimeout(timer)
  ctrl?.abort()
})
</script>

<template>
  <div class="container">
    <!-- HERO -->
    <section class="hero">
      <div class="hero-left">
        <span class="eyebrow">Cek calon judul</span>
        <h1 class="hero-title">
          Sebelum diajukan,<br />lihat di mana judulmu <em>jatuh</em>.
        </h1>
        <p class="hero-sub">
          Tempel atau ketik calon judul skripsi. Sistem mengukur kedekatan
          <strong>makna</strong>-nya terhadap korpus judul jurusan yang sudah ada —
          bukan sekadar kesamaan kata. Tiap hasil menyertakan <strong>abstrak</strong>
          dan <strong>tahun</strong>nya, agar kamu menilai tumpang-tindih yang nyata.
        </p>

        <div class="composer card">
          <textarea
            v-model="title"
            class="textarea composer-input"
            rows="3"
            placeholder="mis. Sistem Rekomendasi Film Menggunakan Collaborative Filtering"
            @keydown.ctrl.enter="onSubmit"
            @keydown.meta.enter="onSubmit"
          />
          <div class="composer-bar">
            <div class="composer-meta">
              <span class="faint">{{ charCount }} karakter</span>
              <span v-if="charCount > 0 && charCount < MIN_LIVE" class="faint"
                >· ketik ≥ {{ MIN_LIVE }} untuk cek otomatis</span
              >
              <span v-else-if="loading" class="live"><span class="spinner" /> memeriksa…</span>
              <span v-else-if="result" class="live ok">● cek otomatis aktif</span>
            </div>
            <div class="composer-actions">
              <button v-if="title" class="btn btn-ghost btn-sm" @click="clearAll">Bersihkan</button>
              <button class="btn btn-primary btn-sm" :disabled="loading" @click="onSubmit">
                Cek sekarang
              </button>
            </div>
          </div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="apiMode.demo" class="demo-note">
          Mode demo: skor dihitung dari kemiripan teks pada korpus contoh, sebagai
          pratinjau. Di mode live, skor berasal dari model embedding semantik.
        </p>
      </div>

      <!-- GAUGE (signature) -->
      <div class="hero-right">
        <div class="gauge-card card card-pad">
          <SimilarityGauge
            :percent="gaugePercent"
            :category="top?.category || ''"
            :caption="top?.title || ''"
            :loading="loading"
          />
          <template v-if="top?.abstract">
            <button class="near-toggle" @click="showNearAbstract = !showNearAbstract">
              {{ showNearAbstract ? "Sembunyikan abstrak" : "Lihat abstrak judul termirip" }}
            </button>
            <Transition name="fade">
              <p v-if="showNearAbstract" class="near-abstract">{{ top.abstract }}</p>
            </Transition>
          </template>
        </div>
      </div>
    </section>

    <!-- ALERT DUPLIKAT -->
    <Transition name="fade">
      <div v-if="isDuplicate" class="alert">
        <strong>Perhatian:</strong> judul ini sangat mirip dengan
        “{{ top.title }}” ({{ top.percent.toFixed(1) }}%). Pertimbangkan mempertajam
        pembeda topik sebelum mengajukan.
      </div>
    </Transition>

    <!-- HASIL -->
    <section class="results">
      <div class="results-main card card-pad">
        <MatchList :matches="matches" :loading="loading" :query-tokens="queryTokens" />
      </div>

      <aside class="results-side">
        <div class="card card-pad map-card">
          <div class="map-head">
            <h3 class="serif">Posisi di peta tema</h3>
            <RouterLink to="/peta" class="link-more">Buka peta penuh →</RouterLink>
          </div>
          <p class="faint map-desc">
            Titik <span class="qdot" /> kamu, disorot di antara tetangga tematik terdekatnya.
          </p>
          <div class="map-frame">
            <CorpusMap
              v-if="showMap"
              :points="mapPoints"
              :query="result?.coord || null"
              :highlight-ids="neighborIds"
              compact
            />
            <div v-else class="map-placeholder faint">
              Jalankan satu pengecekan untuk menempatkan judulmu di peta.
            </div>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: 1.25fr 0.95fr;
  gap: 32px;
  align-items: start;
}
.eyebrow {
  display: block;
  margin-bottom: 12px;
}
.hero-title {
  font-size: clamp(30px, 4.2vw, 46px);
  font-weight: 600;
}
.hero-title em {
  /* Tanpa italic: huruf 'j' tetap tegak & bersih (italic Fraunces terlalu "quirky").
     Tekanan lewat warna aksen teal — warna identitas "judulmu/query" di app — + weight. */
  font-style: normal;
  font-weight: 700;
  color: var(--accent);
}
.hero-sub {
  margin-top: 16px;
  max-width: 54ch;
  color: var(--muted);
  font-size: 16px;
}
.composer {
  margin-top: 24px;
  padding: 14px;
}
.composer-input {
  border: none;
  background: transparent;
  padding: 6px;
  font-size: 16px;
}
.composer-input:focus {
  outline: none;
  box-shadow: none;
}
.composer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.composer-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  min-width: 0;
}
.live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
}
.live.ok {
  color: var(--aman);
  font-size: 11.5px;
}
.composer-actions {
  display: flex;
  gap: 8px;
  flex: none;
}
.error {
  margin-top: 12px;
  color: var(--sangat_mirip);
  font-size: 13.5px;
}
.demo-note {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--faint);
  max-width: 56ch;
}
.hero-right {
  position: sticky;
  top: 86px;
}
.gauge-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 340px;
}
.near-toggle {
  margin-top: 14px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: 0;
  cursor: pointer;
}
.near-toggle:hover {
  text-decoration: underline;
}
.near-abstract {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
  text-align: left;
  border-left: 2px solid var(--accent-soft);
  padding-left: 12px;
}

.alert {
  margin-top: 26px;
  padding: 14px 18px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(102, 16, 31, 0.32);
  background: rgba(102, 16, 31, 0.06);
  color: #66101f;
  font-size: 14px;
}
.alert strong {
  color: #66101f;
}

.results {
  margin-top: 30px;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 22px;
  align-items: start;
}
.map-card {
  position: sticky;
  top: 86px;
}
.map-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.map-head h3 {
  font-size: 17px;
}
.link-more {
  font-size: 12.5px;
  color: var(--accent);
  white-space: nowrap;
}
.map-desc {
  margin-top: 6px;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.qdot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #2f6e88;
  box-shadow: 0 0 0 3px rgba(47, 110, 136, 0.25);
}
.map-frame {
  margin-top: 12px;
  height: 320px;
}
.map-placeholder {
  height: 100%;
  display: grid;
  place-items: center;
  text-align: center;
  font-size: 13px;
  border: 1px dashed var(--border-2);
  border-radius: var(--radius);
  padding: 20px;
}

@media (max-width: 940px) {
  .hero,
  .results {
    grid-template-columns: 1fr;
  }
  .hero-right,
  .map-card {
    position: static;
  }
  .gauge-card {
    min-height: 300px;
  }
}
</style>

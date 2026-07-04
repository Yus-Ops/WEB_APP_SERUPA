<script setup>
import { ref, reactive, computed } from 'vue'

/**
 * Grafik tren topik antar tahun (FA5) — multi-series line chart.
 * Kepatuhan dataviz: legenda selalu tampil (identitas bukan warna-saja), grid
 * resesif, marker ≥8px, hover crosshair+tooltip, dan toggle Tabel sebagai
 * relief untuk seri berkontras <3:1 (aqua/kuning). Warna = palet CVD-tervalidasi.
 */
const props = defineProps({
  data: { type: Object, required: true }, // { years:[], series:[{key,label,color,values:[]}] }
})

const W = 860
const H = 360
const M = { top: 20, right: 20, bottom: 42, left: 46 }
const plotW = W - M.left - M.right
const plotH = H - M.top - M.bottom

const hidden = reactive(new Set())
const activeIdx = ref(null)
const showTable = ref(false)

const years = computed(() => props.data.years)
const visibleSeries = computed(() => props.data.series.filter((s) => !hidden.has(s.key)))

function niceCeil(v) {
  if (v <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

const yMax = computed(() => {
  const max = Math.max(
    1,
    ...visibleSeries.value.flatMap((s) => s.values),
    ...(visibleSeries.value.length ? [] : [10]),
  )
  return niceCeil(max)
})

const xFor = (i) => M.left + (years.value.length === 1 ? plotW / 2 : (plotW * i) / (years.value.length - 1))
const yFor = (v) => M.top + plotH * (1 - v / yMax.value)

const gridLines = computed(() => {
  const lines = []
  for (let k = 0; k <= 4; k++) {
    const val = (yMax.value / 4) * k
    lines.push({ val, y: yFor(val) })
  }
  return lines
})

function pointsFor(series) {
  return series.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ')
}

function toggle(key) {
  if (hidden.has(key)) hidden.delete(key)
  else if (hidden.size < props.data.series.length - 1) hidden.add(key)
}

const tooltip = computed(() => {
  if (activeIdx.value === null) return null
  const i = activeIdx.value
  return {
    year: years.value[i],
    // Klamp agar tooltip tak melimpah keluar wadah di titik paling tepi.
    leftPct: Math.min(90, Math.max(10, (xFor(i) / W) * 100)),
    rows: visibleSeries.value
      .map((s) => ({ label: s.label, color: s.color, value: s.values[i] }))
      .sort((a, b) => b.value - a.value),
  }
})
</script>

<template>
  <div class="trend">
    <div class="trend__toolbar">
      <div class="trend__legend" role="list">
        <button
          v-for="s in data.series"
          :key="s.key"
          class="legend__item"
          :class="{ 'is-off': hidden.has(s.key) }"
          type="button"
          role="listitem"
          :aria-pressed="!hidden.has(s.key)"
          @click="toggle(s.key)"
        >
          <span class="legend__swatch" :style="{ background: s.color }" aria-hidden="true" />
          {{ s.label }}
        </button>
      </div>
      <button class="trend__tableBtn" type="button" @click="showTable = !showTable">
        {{ showTable ? 'Lihat grafik' : 'Lihat tabel' }}
      </button>
    </div>

    <div v-if="!showTable" class="trend__plot" @mouseleave="activeIdx = null">
      <svg :viewBox="`0 0 ${W} ${H}`" class="trend__svg" role="img"
           aria-label="Tren jumlah skripsi per kelompok topik antar tahun">
        <!-- gridlines + y labels -->
        <g>
          <line
            v-for="g in gridLines"
            :key="'g' + g.val"
            :x1="M.left"
            :x2="W - M.right"
            :y1="g.y"
            :y2="g.y"
            class="grid"
          />
          <text
            v-for="g in gridLines"
            :key="'yl' + g.val"
            :x="M.left - 10"
            :y="g.y + 4"
            class="axis-label"
            text-anchor="end"
          >
            {{ Math.round(g.val) }}
          </text>
        </g>

        <!-- x labels -->
        <text
          v-for="(yr, i) in years"
          :key="'x' + yr"
          :x="xFor(i)"
          :y="H - 14"
          class="axis-label"
          text-anchor="middle"
        >
          {{ yr }}
        </text>

        <!-- active crosshair -->
        <line
          v-if="activeIdx !== null"
          :x1="xFor(activeIdx)"
          :x2="xFor(activeIdx)"
          :y1="M.top"
          :y2="H - M.bottom"
          class="crosshair"
        />

        <!-- series lines -->
        <polyline
          v-for="s in visibleSeries"
          :key="s.key"
          :points="pointsFor(s)"
          class="line"
          :style="{ stroke: s.color }"
        />

        <!-- markers -->
        <g v-for="s in visibleSeries" :key="'m' + s.key">
          <circle
            v-for="(v, i) in s.values"
            :key="i"
            :cx="xFor(i)"
            :cy="yFor(v)"
            :r="activeIdx === i ? 5 : 4"
            :style="{ fill: s.color }"
            class="marker"
          />
        </g>

        <!-- hover hit-areas -->
        <rect
          v-for="(yr, i) in years"
          :key="'hit' + yr"
          :x="xFor(i) - plotW / (years.length * 2)"
          :y="M.top"
          :width="plotW / years.length"
          :height="plotH"
          fill="transparent"
          @mouseenter="activeIdx = i"
          @focus="activeIdx = i"
        />
      </svg>

      <div v-if="tooltip" class="trend__tooltip" :style="{ left: tooltip.leftPct + '%' }">
        <p class="tt__year">{{ tooltip.year }}</p>
        <p v-for="r in tooltip.rows" :key="r.label" class="tt__row">
          <span class="tt__swatch" :style="{ background: r.color }" />
          <span class="tt__label">{{ r.label }}</span>
          <span class="tt__value">{{ r.value }}</span>
        </p>
      </div>
    </div>

    <div v-else class="trend__tableWrap">
      <table class="trend__table">
        <thead>
          <tr>
            <th scope="col">Topik</th>
            <th v-for="yr in years" :key="yr" scope="col">{{ yr }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in data.series" :key="s.key">
            <th scope="row">
              <span class="tt__swatch" :style="{ background: s.color }" />{{ s.label }}
            </th>
            <td v-for="(v, i) in s.values" :key="i">{{ v }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.trend {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.trend__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.trend__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
}
.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  transition: color var(--transition-fast);
}
.legend__item:hover {
  color: var(--color-text);
}
.legend__item.is-off {
  opacity: 0.4;
}
.legend__item.is-off .legend__swatch {
  background: var(--color-text-subtle) !important;
}
.legend__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
.trend__tableBtn {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.trend__tableBtn:hover {
  background: var(--color-primary-050);
}
.trend__plot {
  position: relative;
}
.trend__svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}
.grid {
  stroke: var(--color-border);
  stroke-width: 1;
}
.axis-label {
  fill: var(--color-text-subtle);
  font-size: 13px;
  font-family: var(--font-family-base);
}
.crosshair {
  stroke: var(--color-primary-300);
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
}
.line {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.marker {
  stroke: var(--color-surface);
  stroke-width: 2;
}
.trend__tooltip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  min-width: 180px;
  max-width: 240px;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  pointer-events: none;
  z-index: 2;
}
.tt__year {
  font-weight: var(--font-weight-black);
  font-size: var(--text-sm);
  margin-bottom: 6px;
  color: var(--color-text);
}
.tt__row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--text-sm);
  padding: 1px 0;
}
.tt__swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.tt__label {
  color: var(--color-text-muted);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tt__value {
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}
.trend__tableWrap {
  overflow-x: auto;
}
.trend__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.trend__table th,
.trend__table td {
  padding: 8px 12px;
  text-align: right;
  border-bottom: 1px solid var(--color-border);
  font-variant-numeric: tabular-nums;
}
.trend__table thead th {
  color: var(--color-text-subtle);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.trend__table tbody th[scope='row'] {
  text-align: left;
  font-weight: var(--font-weight-regular);
  color: var(--color-text);
  white-space: nowrap;
}
.trend__table tbody th .tt__swatch {
  display: inline-block;
  margin-right: 8px;
}
</style>

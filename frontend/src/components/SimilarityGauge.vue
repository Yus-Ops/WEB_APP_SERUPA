<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue"
import { bandForPercent, bandByCode } from "@/lib/bands"

const props = defineProps({
  percent: { type: Number, default: 0 },
  category: { type: String, default: "" },
  caption: { type: String, default: "" },
  loading: { type: Boolean, default: false },
})

const clamp = (v) => Math.max(0, Math.min(100, v || 0))

const band = computed(() =>
  props.category ? bandByCode(props.category) : bandForPercent(clamp(props.percent)),
)

// ── Geometri busur 270° (celah di bawah) ────────────────────────────────────
const CX = 100,
  CY = 100,
  R = 80
const START = 135,
  SWEEP = 270
const pt = (deg, r = R) => {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}
const arcPath = (() => {
  const [x0, y0] = pt(START)
  const [x1, y1] = pt(START + SWEEP)
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 1 1 ${x1.toFixed(2)},${y1.toFixed(2)}`
})()

// Tick ambang band (70 & 85) di sepanjang busur.
const ticks = [70, 85].map((p) => {
  const deg = START + (p / 100) * SWEEP
  const [ix, iy] = pt(deg, R - 9)
  const [ox, oy] = pt(deg, R + 9)
  return { p, x1: ix, y1: iy, x2: ox, y2: oy }
})

// ── Hitungan angka beranimasi (ease-out) ────────────────────────────────────
const display = ref(0)
let raf = 0
watch(
  () => props.percent,
  (val) => {
    cancelAnimationFrame(raf)
    const from = display.value
    const to = clamp(val)
    const t0 = performance.now()
    const dur = 520
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      display.value = from + (to - from) * e
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  },
  { immediate: true },
)
onBeforeUnmount(() => cancelAnimationFrame(raf))

const dashOffset = computed(() => 100 - clamp(display.value))
</script>

<template>
  <div class="gauge" :class="{ loading }" :style="{ '--band': band.color, '--glow': band.glow }">
    <div class="ring">
      <svg viewBox="0 0 200 200" class="svg">
        <!-- jalur dasar -->
        <path :d="arcPath" class="track" pathLength="100" />
        <!-- nilai -->
        <path
          :d="arcPath"
          class="value"
          pathLength="100"
          :style="{ strokeDashoffset: dashOffset }"
        />
        <!-- tick ambang -->
        <line
          v-for="t in ticks"
          :key="t.p"
          :x1="t.x1"
          :y1="t.y1"
          :x2="t.x2"
          :y2="t.y2"
          class="tick"
        />
      </svg>

      <div class="center">
        <span class="eyebrow">Skor tertinggi</span>
        <div class="num serif">
          {{ display.toFixed(1) }}<small>%</small>
        </div>
        <span class="band">{{ band.label }}</span>
      </div>
    </div>

    <p class="hint">{{ band.hint }}</p>
    <p v-if="caption" class="caption" :title="caption">
      <span class="faint">terdekat:</span> {{ caption }}
    </p>
  </div>
</template>

<style scoped>
.gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.ring {
  position: relative;
  width: 260px;
  max-width: 100%;
  aspect-ratio: 1;
}
.svg {
  width: 100%;
  height: 100%;
  transform: rotate(0deg);
}
.track {
  fill: none;
  stroke: #e7e1d2;
  stroke-width: 12;
  stroke-linecap: round;
  stroke-dasharray: 100;
}
.value {
  fill: none;
  stroke: var(--band);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-dasharray: 100;
  filter: drop-shadow(0 3px 6px var(--glow));
  transition: stroke 0.4s ease, stroke-dashoffset 0.08s linear;
}
.tick {
  stroke: #c7bfac;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
.num {
  font-weight: 600;
  font-size: 52px;
  line-height: 1;
  color: var(--band);
  letter-spacing: -0.02em;
}
.num small {
  font-size: 20px;
  opacity: 0.7;
  margin-left: 2px;
}
.band {
  font-size: 13px;
  font-weight: 600;
  color: var(--band);
}
.hint {
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted);
  max-width: 280px;
}
.caption {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text);
  max-width: 320px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.gauge.loading .value {
  animation: pulse 1.1s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>

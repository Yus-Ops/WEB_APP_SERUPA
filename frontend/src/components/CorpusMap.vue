<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef } from "vue"
import { clusterColor } from "@/lib/demo"

const props = defineProps({
  points: { type: Array, default: () => [] },
  query: { type: Object, default: null }, // { x, y } | null
  highlightIds: { type: Array, default: () => [] },
  colorBy: { type: String, default: "cluster" }, // 'cluster' | 'year'
  activeClusters: { type: Array, default: null }, // null = semua
  palette: { type: Object, default: null }, // { clusterId: color } — opsional
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(["select"])

const wrap = ref(null)
const canvas = ref(null)
const hover = shallowRef(null) // { point, x, y }
let ctx = null
let ro = null
let raf = 0
let dirty = true
let dragging = false
let moved = false
let pointerStart = null
const size = { w: 0, h: 0, dpr: 1 }
const view = { zoom: 1, panX: 0, panY: 0 }

const PAD = 46

const highlightSet = computed(() => new Set(props.highlightIds))
const activeSet = computed(() =>
  props.activeClusters ? new Set(props.activeClusters) : null,
)

function isActive(p) {
  return !activeSet.value || activeSet.value.has(p.cluster)
}

// ── Batas data (sertakan query agar selalu terlihat) ────────────────────────
const bounds = computed(() => {
  const pts = props.points
  if (!pts.length) return { minX: -1, maxX: 1, minY: -1, maxY: 1 }
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  if (props.query) {
    minX = Math.min(minX, props.query.x)
    maxX = Math.max(maxX, props.query.x)
    minY = Math.min(minY, props.query.y)
    maxY = Math.max(maxY, props.query.y)
  }
  return { minX, maxX, minY, maxY }
})

const yearExtent = computed(() => {
  const ys = props.points.map((p) => p.year).filter((y) => Number.isFinite(y))
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : [2018, 2025]
})

function transform() {
  const b = bounds.value
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const spanX = Math.max(0.001, b.maxX - b.minX)
  const spanY = Math.max(0.001, b.maxY - b.minY)
  const base = Math.min((size.w - PAD * 2) / spanX, (size.h - PAD * 2) / spanY)
  const k = base * view.zoom
  const ox = size.w / 2 + view.panX
  const oy = size.h / 2 + view.panY
  return { k, ox, oy, cx, cy }
}

const sx = (t, wx) => t.ox + (wx - t.cx) * t.k
const sy = (t, wy) => t.oy - (wy - t.cy) * t.k
function screenToWorld(px, py) {
  const t = transform()
  return { x: t.cx + (px - t.ox) / t.k, y: t.cy - (py - t.oy) / t.k }
}

// ── Warna ────────────────────────────────────────────────────────────────────
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function yearColor(year) {
  // tua → muda : sky pekat → bordeaux (recent = "hangat/ramai")
  const [lo, hi] = yearExtent.value
  const t = hi > lo ? (year - lo) / (hi - lo) : 0.5
  const a = hexToRgb("#6f93a6"),
    b = hexToRgb("#66101f")
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
function colorOf(p) {
  if (props.colorBy === "year") return yearColor(p.year)
  return props.palette?.[p.cluster] || clusterColor(p.cluster)
}

// ── Render ───────────────────────────────────────────────────────────────────
let pulse = 0
function draw() {
  if (!ctx) return
  const t = transform()
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
  ctx.clearRect(0, 0, size.w, size.h)

  const hasHi = highlightSet.value.size > 0
  const focusMode = hasHi || !!props.query

  // titik korpus
  for (const p of props.points) {
    const active = isActive(p)
    const X = sx(t, p.x)
    const Y = sy(t, p.y)
    if (X < -20 || X > size.w + 20 || Y < -20 || Y > size.h + 20) continue

    const hi = highlightSet.value.has(p.id)
    const dim = !active || (focusMode && !hi)
    const r = hi ? 5.4 : props.compact ? 2.8 : 3.4

    ctx.globalAlpha = dim ? (active ? 0.28 : 0.09) : 0.92
    ctx.beginPath()
    ctx.arc(X, Y, r, 0, Math.PI * 2)
    ctx.fillStyle = colorOf(p)
    if (hi) {
      ctx.shadowColor = colorOf(p)
      ctx.shadowBlur = 12
    } else {
      ctx.shadowBlur = 0
    }
    ctx.fill()
    ctx.shadowBlur = 0

    if (hi) {
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 1.5
      ctx.strokeStyle = colorOf(p)
      ctx.beginPath()
      ctx.arc(X, Y, r + 3.5, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  // titik query (judulmu) — berdenyut
  if (props.query) {
    const X = sx(t, props.query.x)
    const Y = sy(t, props.query.y)
    const ring = 12 + Math.sin(pulse) * 3
    ctx.strokeStyle = "rgba(47,110,136,0.9)"
    ctx.lineWidth = 1.7
    ctx.beginPath()
    ctx.arc(X, Y, ring, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(X, Y, ring + 7 + Math.sin(pulse) * 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
    // crosshair
    ctx.beginPath()
    ctx.moveTo(X - 18, Y)
    ctx.lineTo(X - 7, Y)
    ctx.moveTo(X + 7, Y)
    ctx.lineTo(X + 18, Y)
    ctx.moveTo(X, Y - 18)
    ctx.lineTo(X, Y - 7)
    ctx.moveTo(X, Y + 7)
    ctx.lineTo(X, Y + 18)
    ctx.stroke()
    // inti
    ctx.shadowColor = "rgba(47,110,136,0.85)"
    ctx.shadowBlur = 14
    ctx.fillStyle = "#2f6e88"
    ctx.beginPath()
    ctx.arc(X, Y, 4.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // cincin hover
  if (hover.value) {
    const X = sx(t, hover.value.point.x)
    const Y = sy(t, hover.value.point.y)
    ctx.strokeStyle = "rgba(44,35,41,0.85)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(X, Y, 8, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function loop() {
  if (props.query) {
    pulse += 0.08
    draw()
  } else if (dirty) {
    draw()
    dirty = false
  }
  raf = requestAnimationFrame(loop)
}
function requestDraw() {
  dirty = true
}

// ── Hit-test hover ───────────────────────────────────────────────────────────
function hitTest(px, py) {
  const t = transform()
  let best = null
  let bestD = 12 * 12
  for (const p of props.points) {
    if (!isActive(p)) continue
    const dx = sx(t, p.x) - px
    const dy = sy(t, p.y) - py
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

// ── Interaksi ────────────────────────────────────────────────────────────────
function onPointerDown(e) {
  dragging = true
  moved = false
  pointerStart = { x: e.clientX, y: e.clientY, panX: view.panX, panY: view.panY }
  canvas.value.setPointerCapture?.(e.pointerId)
}
function onPointerMove(e) {
  const rect = canvas.value.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top
  if (dragging) {
    const dx = e.clientX - pointerStart.x
    const dy = e.clientY - pointerStart.y
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true
    view.panX = pointerStart.panX + dx
    view.panY = pointerStart.panY + dy
    requestDraw()
    return
  }
  const p = hitTest(px, py)
  hover.value = p ? { point: p, x: px, y: py } : null
  if (canvas.value) canvas.value.style.cursor = p ? "pointer" : "grab"
  requestDraw()
}
function onPointerUp(e) {
  if (dragging && !moved) {
    const rect = canvas.value.getBoundingClientRect()
    const p = hitTest(e.clientX - rect.left, e.clientY - rect.top)
    if (p) emit("select", p)
  }
  dragging = false
}
function onPointerLeave() {
  hover.value = null
  dragging = false
  requestDraw()
}
function onWheel(e) {
  e.preventDefault()
  const rect = canvas.value.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const world = screenToWorld(mx, my)
  const factor = Math.exp(-e.deltaY * 0.0016)
  view.zoom = Math.max(0.4, Math.min(10, view.zoom * factor))
  // jaga titik di bawah kursor tetap pada tempatnya
  const t = transform()
  view.panX += mx - sx(t, world.x)
  view.panY += my - sy(t, world.y)
  requestDraw()
}

function resetView() {
  view.zoom = 1
  view.panX = 0
  view.panY = 0
  requestDraw()
}
defineExpose({ resetView })

// ── Ukuran & lifecycle ───────────────────────────────────────────────────────
function resize() {
  if (!wrap.value || !canvas.value) return
  const r = wrap.value.getBoundingClientRect()
  size.w = r.width
  size.h = r.height
  size.dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.value.width = Math.round(size.w * size.dpr)
  canvas.value.height = Math.round(size.h * size.dpr)
  canvas.value.style.width = size.w + "px"
  canvas.value.style.height = size.h + "px"
  requestDraw()
}

onMounted(() => {
  ctx = canvas.value.getContext("2d")
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(wrap.value)
  canvas.value.addEventListener("wheel", onWheel, { passive: false })
  raf = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  canvas.value?.removeEventListener("wheel", onWheel)
})

watch(
  () => [props.points, props.query, props.highlightIds, props.colorBy, props.activeClusters],
  requestDraw,
  { deep: true },
)
</script>

<template>
  <div ref="wrap" class="map-wrap" :class="{ compact }">
    <canvas
      ref="canvas"
      class="map-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerLeave"
    />
    <div
      v-if="hover"
      class="tip"
      :style="{
        left: Math.min(hover.x + 14, size.w - 240) + 'px',
        top: Math.max(hover.y - 10, 8) + 'px',
      }"
    >
      <div class="tip-title">{{ hover.point.title }}</div>
      <div class="tip-meta">
        <span class="tdot" :style="{ background: colorOf(hover.point) }" />
        <span class="tip-topic">{{ hover.point.cluster_label }}</span>
        <template v-if="hover.point.year"> · {{ hover.point.year }}</template>
      </div>
    </div>
    <div v-if="!points.length" class="map-empty faint">Tidak ada data peta.</div>
  </div>
</template>

<style scoped>
.map-wrap {
  position: relative;
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 320px;
  border-radius: var(--radius);
  overflow: hidden;
  background:
    radial-gradient(900px 520px at 72% 6%, rgba(184, 212, 227, 0.42), transparent 60%),
    radial-gradient(720px 520px at 6% 96%, rgba(238, 255, 219, 0.52), transparent 60%),
    #faf8ef;
  border: 1px solid var(--border);
}
.map-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}
.map-canvas:active {
  cursor: grabbing;
}
.tip {
  position: absolute;
  pointer-events: none;
  max-width: 240px;
  padding: 9px 11px;
  border-radius: 11px;
  background: rgba(253, 251, 244, 0.96);
  border: 1px solid var(--border-2);
  box-shadow: var(--shadow-sm);
  z-index: 3;
}
.tip-title {
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text);
}
.tip-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--muted);
}
.tip-topic {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tdot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.map-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 14px;
}
</style>

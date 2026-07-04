<script setup>
import { computed, ref } from 'vue'

/**
 * Distribusi jumlah record per tahun (FA4) — bar chart satu seri.
 * Satu seri ⇒ satu hue (teal merek), tanpa legenda (judul menamai seri).
 * Nilai dilabeli langsung; hover menyorot bar. HTML/CSS agar teks tajam & responsif.
 */
const props = defineProps({
  data: { type: Array, required: true }, // [{ year, count }]
  formatValue: { type: Function, default: (v) => v },
})

const hovered = ref(null)
const max = computed(() => Math.max(1, ...props.data.map((d) => d.count)))
</script>

<template>
  <div class="bars" role="img" aria-label="Distribusi jumlah skripsi per tahun">
    <div
      v-for="(d, i) in data"
      :key="d.year"
      class="bars__col"
      :class="{ 'is-hover': hovered === i }"
      @mouseenter="hovered = i"
      @mouseleave="hovered = null"
    >
      <span class="bars__value">{{ formatValue(d.count) }}</span>
      <div class="bars__track">
        <div class="bars__fill" :style="{ height: (d.count / max) * 100 + '%' }" />
      </div>
      <span class="bars__label">{{ d.year }}</span>
    </div>
  </div>
</template>

<style scoped>
.bars {
  display: flex;
  align-items: flex-end;
  gap: clamp(4px, 1.4vw, 14px);
  height: 240px;
  padding-top: var(--space-5);
}
.bars__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
  min-width: 0;
}
.bars__value {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
  transition: color var(--transition-fast);
}
.is-hover .bars__value {
  color: var(--color-primary-800);
}
.bars__track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  min-height: 0;
}
.bars__fill {
  width: 100%;
  background: var(--color-primary-300);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition:
    background var(--transition-fast),
    height 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  min-height: 3px;
}
.is-hover .bars__fill {
  background: var(--color-primary-700);
}
.bars__label {
  font-size: var(--text-xs);
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
  writing-mode: horizontal-tb;
}
@media (max-width: 640px) {
  .bars__label {
    font-size: 10px;
  }
}
</style>

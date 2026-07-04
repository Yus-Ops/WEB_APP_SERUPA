<script setup>
import { computed } from 'vue'
import { bandForScore, bandByLabel } from '@/lib/format'

/**
 * Pita kemiripan (PRD §7.1). Warna sengaja MENGHINDARI merah (D1): "Tinggi"
 * berarti "tinjau lebih teliti", bukan "ditolak". Bila `band` diberikan, dipakai
 * apa adanya (satu sumber kebenaran backend); bila tidak, dihitung dari `score`.
 */
const props = defineProps({
  score: { type: Number, default: null },
  band: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md
})

const resolved = computed(() =>
  props.band ? bandByLabel(props.band) : bandForScore(props.score ?? 0),
)
</script>

<template>
  <span class="band" :class="[`band--${resolved.key}`, `band--${size}`]">
    <span class="band__dot" aria-hidden="true" />
    {{ resolved.label }}
  </span>
</template>

<style scoped>
.band {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  line-height: 1;
  white-space: nowrap;
}
.band--sm {
  font-size: var(--text-xs);
  padding: 5px 10px;
}
.band--md {
  font-size: var(--text-sm);
  padding: 6px 13px;
}
.band__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.band--rendah {
  color: var(--band-rendah-text);
  background: var(--band-rendah-bg);
}
.band--sedang {
  color: var(--band-sedang-text);
  background: var(--band-sedang-bg);
}
.band--tinggi {
  color: var(--band-tinggi-text);
  background: var(--band-tinggi-bg);
}
</style>

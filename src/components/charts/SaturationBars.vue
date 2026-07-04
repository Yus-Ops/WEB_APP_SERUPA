<script setup>
import { computed } from 'vue'

/**
 * Peta saturasi subbidang (FA6, teaser). Density ordinal (padat/sedang/jarang)
 * → satu hue teal bertingkat (ordinal), tiap bar dilabeli teks + jumlah, sehingga
 * makna tak bergantung warna saja. Sengaja hindari merah (etos D1).
 */
const props = defineProps({
  data: { type: Array, required: true }, // [{ topic, count, level }]
})

const max = computed(() => Math.max(1, ...props.data.map((d) => d.count)))
const levelLabel = { padat: 'Padat', sedang: 'Sedang', jarang: 'Jarang' }
</script>

<template>
  <ul class="sat">
    <li v-for="d in data" :key="d.topic" class="sat__row">
      <div class="sat__head">
        <span class="sat__topic">{{ d.topic }}</span>
        <span class="sat__count">{{ d.count }}</span>
      </div>
      <div class="sat__track">
        <div
          class="sat__fill"
          :class="`sat__fill--${d.level}`"
          :style="{ width: (d.count / max) * 100 + '%' }"
        />
      </div>
      <span class="sat__level" :class="`sat__level--${d.level}`">{{ levelLabel[d.level] }}</span>
    </li>
  </ul>
</template>

<style scoped>
.sat {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.sat__row {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    'head head'
    'track level';
  align-items: center;
  gap: 6px var(--space-3);
}
.sat__head {
  grid-area: head;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.sat__topic {
  font-weight: var(--font-weight-bold);
  font-size: var(--text-sm);
  color: var(--color-text);
}
.sat__count {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-black);
  color: var(--color-primary-800);
  font-variant-numeric: tabular-nums;
}
.sat__track {
  grid-area: track;
  height: 10px;
  background: var(--color-primary-050);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.sat__fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sat__fill--padat {
  background: var(--color-primary-700);
}
.sat__fill--sedang {
  background: var(--color-primary);
}
.sat__fill--jarang {
  background: var(--color-primary-300);
}
.sat__level {
  grid-area: level;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}
.sat__level--padat {
  background: var(--color-primary-100);
  color: var(--color-primary-800);
}
.sat__level--sedang {
  background: var(--color-primary-050);
  color: var(--color-primary-700);
}
.sat__level--jarang {
  background: var(--color-accent-050);
  color: #8a4b12;
}
</style>

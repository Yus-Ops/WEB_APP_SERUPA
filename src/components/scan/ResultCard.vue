<script setup>
import { ref, computed } from 'vue'
import { formatScore } from '@/lib/format'
import BandBadge from '@/components/ui/BandBadge.vue'

/**
 * Kartu hasil kemiripan — susunan mengikuti PRD §11.1 (skor DULU):
 *   1) skor (pita + angka 2 desimal)  2) judul  3) penulis + tahun  4) abstrak.
 */
const props = defineProps({
  result: { type: Object, required: true }, // { rank, score, band, thesis }
  rank: { type: Number, default: null },
})

const expanded = ref(false)
const thesis = computed(() => props.result.thesis || {})
const displayRank = computed(() => props.rank ?? props.result.rank)
const scorePct = computed(() => Math.round((props.result.score || 0) * 100))
const isLong = computed(() => (thesis.value.abstract || '').length > 280)
</script>

<template>
  <article class="result">
    <!-- 1) Skor + pita -->
    <header class="result__score">
      <div class="result__scoreMain">
        <span v-if="displayRank" class="result__rank">#{{ displayRank }}</span>
        <BandBadge :band="result.band" :score="result.score" />
        <span class="result__number" :aria-label="`Skor kemiripan ${formatScore(result.score)}`">
          {{ formatScore(result.score) }}
        </span>
      </div>
      <div class="result__meter" role="presentation">
        <span
          class="result__meterFill"
          :class="`result__meterFill--${result.band.toLowerCase()}`"
          :style="{ width: scorePct + '%' }"
        />
      </div>
    </header>

    <!-- 2) Judul -->
    <h3 class="result__title">{{ thesis.title }}</h3>

    <!-- 3) Penulis + tahun -->
    <p class="result__meta">
      <span class="result__author">{{ thesis.author }}</span>
      <span class="result__dot" aria-hidden="true">·</span>
      <span>{{ thesis.year }}</span>
    </p>

    <!-- 4) Abstrak -->
    <div class="result__abstract" :class="{ 'is-clamped': !expanded && isLong }">
      <p>{{ thesis.abstract }}</p>
    </div>

    <div class="result__footer">
      <button v-if="isLong" class="result__toggle" type="button" @click="expanded = !expanded">
        {{ expanded ? 'Tutup' : 'Baca abstrak lengkap' }}
      </button>
      <a
        v-if="thesis.sourceUrl"
        class="result__source"
        :href="thesis.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        Lihat di repository
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 17L17 7M8 7h9v9" />
        </svg>
      </a>
    </div>
  </article>
</template>

<style scoped>
.result {
  padding: var(--space-5) var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition:
    box-shadow var(--transition-base),
    border-color var(--transition-base);
}
.result:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-200);
}
.result__score {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.result__scoreMain {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.result__rank {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-black);
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
}
.result__number {
  margin-left: auto;
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-black);
  color: var(--color-primary-800);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.result__meter {
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-primary-050);
  overflow: hidden;
}
.result__meterFill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.result__meterFill--rendah {
  background: var(--band-rendah-text);
}
.result__meterFill--sedang {
  background: var(--band-sedang-text);
}
.result__meterFill--tinggi {
  background: var(--band-tinggi-text);
}
.result__title {
  font-size: var(--text-lg);
  line-height: 1.35;
  color: var(--color-text);
  margin-bottom: 6px;
}
.result__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}
.result__author {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
}
.result__abstract {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--color-text-muted);
}
.result__abstract.is-clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.result__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-3);
  flex-wrap: wrap;
}
.result__toggle {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
}
.result__toggle:hover {
  color: var(--color-primary-800);
  text-decoration: underline;
}
.result__source {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
}
</style>

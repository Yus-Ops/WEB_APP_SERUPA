<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCorpusStore } from '@/stores/corpus'
import { buildTopicAnalytics } from '@/lib/topics'
import TrendChart from '@/components/charts/TrendChart.vue'
import SaturationBars from '@/components/charts/SaturationBars.vue'

const corpus = useCorpusStore()
const { items, loading } = storeToRefs(corpus)
onMounted(() => corpus.ensureLoaded())

const analytics = computed(() => buildTopicAnalytics(items.value))
const topicTrends = computed(() => analytics.value.topicTrends)
const saturationMap = computed(() => analytics.value.saturationMap)
const matchedPct = computed(() => analytics.value.matchedPct)
const yearSpan = computed(() => {
  const y = analytics.value.coveredYears
  return y.length ? `${y[0]}–${y[y.length - 1]}` : '—'
})
</script>

<template>
  <div class="trends">
    <header class="trends__head">
      <h2 class="trends__title">Tren & Saturasi Topik</h2>
      <p class="trends__sub">
        Bagaimana fokus penelitian bergeser antar tahun, dan subbidang mana yang sudah padat.
        Membantu mengarahkan mahasiswa ke celah riset yang masih jarang.
      </p>
      <p class="trends__hint">
        Dihitung langsung dari korpus dengan pencocokan kata kunci pada judul &amp; abstrak
        ({{ matchedPct }}% record terklasifikasi). Ini perkiraan berbasis kata kunci, bukan klaster
        makna — skripsi bertema di luar daftar kata kunci belum terhitung, dan satu skripsi bisa
        masuk lebih dari satu subbidang.
      </p>
    </header>

    <p v-if="loading" class="trends__state">Memuat korpus untuk analisis…</p>

    <template v-else>
    <section class="panel">
      <div class="panel__head">
        <div>
          <h3 class="panel__title">Tren Kelompok Topik per Tahun</h3>
          <p class="panel__note">
            Jumlah skripsi 5 subbidang teratas per tahun ({{ yearSpan }}). Klik legenda untuk menyaring.
          </p>
        </div>
      </div>
      <TrendChart :data="topicTrends" />
    </section>

    <div class="trends__grid">
      <section class="panel">
        <h3 class="panel__title">Peta Saturasi Subbidang</h3>
        <p class="panel__note trends__mb">Jumlah skripsi per subbidang di seluruh korpus.</p>
        <SaturationBars :data="saturationMap" />
      </section>

      <aside class="note">
        <span class="note__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></svg>
        </span>
        <h3 class="note__title">Membaca peta ini</h3>
        <ul class="note__list">
          <li><strong>Padat</strong> — subbidang sudah banyak diteliti; topik baru butuh sudut yang jelas berbeda.</li>
          <li><strong>Jarang</strong> — ruang untuk kontribusi baru, mis. telenursing atau keperawatan bencana.</li>
          <li>Saturasi <em>bukan</em> larangan. Ia hanya menunjukkan di mana pembuktian orisinalitas perlu lebih kuat.</li>
        </ul>
      </aside>
    </div>
    </template>
  </div>
</template>

<style scoped>
.trends__head {
  margin-bottom: var(--space-6);
}
.trends__title {
  font-size: var(--text-2xl);
}
.trends__sub {
  color: var(--color-text-muted);
  margin-top: 2px;
  max-width: 68ch;
}
.trends__hint {
  margin-top: var(--space-3);
  max-width: 68ch;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}
.trends__state {
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-muted);
}
.tag {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-subtle);
  background: var(--color-primary-050);
  border: 1px solid var(--color-border);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  vertical-align: middle;
  margin-right: var(--space-2);
}
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-5);
}
.panel__head {
  margin-bottom: var(--space-5);
}
.panel__title {
  font-size: var(--text-lg);
}
.panel__note {
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
  margin-top: 2px;
}
.trends__mb {
  margin-bottom: var(--space-5);
}
.trends__grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--space-5);
  align-items: start;
}
.note {
  background: var(--color-primary-050);
  border: 1px solid var(--color-primary-100);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
.note__icon {
  color: var(--color-primary-700);
}
.note__icon svg {
  width: 26px;
  height: 26px;
}
.note__title {
  font-size: var(--text-lg);
  margin: var(--space-3) 0 var(--space-3);
}
.note__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}
.note__list strong {
  color: var(--color-primary-800);
}
.note__list em {
  font-style: italic;
}
@media (max-width: 900px) {
  .trends__grid {
    grid-template-columns: 1fr;
  }
}
</style>

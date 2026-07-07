<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import corpusService from '@/services/corpusService'
import { useCorpusStore } from '@/stores/corpus'
import { buildTopicAnalytics } from '@/lib/topics'
import { formatNumber, pct } from '@/lib/format'
import BarChart from '@/components/charts/BarChart.vue'
import SaturationBars from '@/components/charts/SaturationBars.vue'

const corpus = useCorpusStore()
const { items: corpusItems } = storeToRefs(corpus)
onMounted(() => corpus.ensureLoaded())
const saturationMap = computed(() => buildTopicAnalytics(corpusItems.value).saturationMap)

// Model embedding aktif (dikonfigurasi di server via EMBED_MODEL). Ditampilkan
// sebagai info; frontend tidak memegang kredensial/HF.
const MODEL_VERSION = 'BAAI/bge-m3'

const stats = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    stats.value = await corpusService.stats()
  } catch (e) {
    error.value = e.message || 'Gagal memuat statistik korpus.'
  } finally {
    loading.value = false
  }
})

const s = computed(() => stats.value || {})
const abstractPct = computed(() => pct(s.value.withAbstract || 0, s.value.totalRecords || 0))
const perYear = computed(() => s.value.perYear || [])
const yearRange = computed(() =>
  s.value.firstYear && s.value.lastYear ? `${s.value.firstYear}–${s.value.lastYear}` : '—',
)

const tiles = computed(() => [
  { label: 'Total record', value: formatNumber(s.value.totalRecords || 0), sub: 'skripsi di korpus' },
  { label: 'Ber-abstrak', value: `${abstractPct.value}%`, sub: `${formatNumber(s.value.withAbstract || 0)} record`, tone: 'success' },
  { label: 'Tanpa abstrak', value: formatNumber(s.value.missingAbstract || 0), sub: 'perlu dilengkapi', tone: 'warning' },
  { label: 'Tahun janggal', value: formatNumber(s.value.suspiciousYear || 0), sub: 'perlu diverifikasi', tone: 'warning' },
  { label: 'Rentang tahun', value: yearRange.value, sub: 'cakupan korpus' },
])
</script>

<template>
  <div class="dash">
    <header class="dash__head">
      <div>
        <h2 class="dash__title">Ringkasan Korpus</h2>
        <p class="dash__sub">
          Kondisi data korpus skripsi FIK UNISSULA.
          <template v-if="s.lastIndexed"> Terakhir diindeks {{ s.lastIndexed }}.</template>
        </p>
      </div>
      <span class="dash__model">Model: {{ MODEL_VERSION }}</span>
    </header>

    <p v-if="loading" class="dash__state">Memuat statistik korpus…</p>

    <div v-else-if="error" class="dash__state dash__state--error">
      <p>{{ error }}</p>
      <p class="dash__stateHint">
        Pastikan Supabase terkonfigurasi dan RPC <code>corpus_stats()</code> sudah dijalankan
        (lihat README.md).
      </p>
    </div>

    <template v-else>
      <!-- Stat tiles -->
      <div class="tiles">
        <div v-for="t in tiles" :key="t.label" class="tile" :class="t.tone && `tile--${t.tone}`">
          <p class="tile__label">{{ t.label }}</p>
          <p class="tile__value">{{ t.value }}</p>
          <p class="tile__sub">{{ t.sub }}</p>
        </div>
      </div>

      <div class="dash__grid">
        <!-- Kualitas data -->
        <section class="panel">
          <h3 class="panel__title">Kualitas Data</h3>
          <div class="quality">
            <div class="quality__row">
              <div class="quality__labels">
                <span>Kelengkapan abstrak</span>
                <strong>{{ abstractPct }}%</strong>
              </div>
              <div class="quality__track">
                <div class="quality__fill" :style="{ width: abstractPct + '%' }" />
              </div>
              <p class="quality__note">
                {{ formatNumber(s.missingAbstract || 0) }} record belum memiliki abstrak — tetap
                di-embed dari judul, tapi sinyal semantiknya lemah hingga abstrak dilengkapi.
              </p>
            </div>
            <div class="quality__flags">
              <div class="flag">
                <span class="flag__dot flag__dot--warn" />
                <span>{{ formatNumber(s.suspiciousYear || 0) }} record bertahun janggal / kosong</span>
              </div>
              <div class="flag">
                <span class="flag__dot flag__dot--ok" />
                <span>{{ formatNumber(s.withAbstract || 0) }} record ber-abstrak lengkap (sinyal semantik kuat)</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Saturasi teaser (data contoh) -->
        <section class="panel">
          <div class="panel__head">
            <h3 class="panel__title">Saturasi Subbidang</h3>
            <RouterLink :to="{ name: 'admin-trends' }" class="panel__link">Lihat tren →</RouterLink>
          </div>
          <SaturationBars :data="saturationMap.slice(0, 5)" />
        </section>
      </div>

      <!-- Distribusi tahun -->
      <section class="panel">
        <div class="panel__head">
          <h3 class="panel__title">Distribusi Record per Tahun</h3>
          <span class="panel__note">Jumlah skripsi masuk korpus tiap tahun</span>
        </div>
        <BarChart :data="perYear" :format-value="formatNumber" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.dash__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}
.dash__title {
  font-size: var(--text-2xl);
}
.dash__sub {
  color: var(--color-text-muted);
  margin-top: 2px;
  max-width: 60ch;
}
.dash__model {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
  background: var(--color-primary-050);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}
.dash__state {
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-muted);
}
.dash__state--error {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.dash__stateHint {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.dash__stateHint code {
  font-size: 0.9em;
  background: var(--color-primary-050);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
}
.tag {
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
  margin-left: var(--space-2);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.tile {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border-top: 3px solid var(--color-primary);
}
.tile--success {
  border-top-color: var(--color-success);
}
.tile--warning {
  border-top-color: var(--color-warning);
}
.tile__label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-subtle);
}
.tile__value {
  font-size: var(--text-3xl);
  font-weight: var(--font-weight-black);
  color: var(--color-text);
  line-height: 1.1;
  margin: 6px 0 2px;
  font-variant-numeric: tabular-nums;
}
.tile__sub {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.dash__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  margin-bottom: var(--space-5);
}
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}
.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.panel__title {
  font-size: var(--text-lg);
}
.panel__link {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
}
.panel__note {
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
}

.quality__labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  margin-bottom: var(--space-2);
}
.quality__labels strong {
  color: var(--color-primary-800);
  font-variant-numeric: tabular-nums;
}
.quality__track {
  height: 12px;
  background: var(--color-primary-050);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.quality__fill {
  height: 100%;
  background: var(--color-success);
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.quality__note {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-3);
}
.quality__flags {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-border);
}
.flag {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.flag__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.flag__dot--warn {
  background: var(--color-warning);
}
.flag__dot--ok {
  background: var(--color-success);
}

@media (max-width: 1100px) {
  .tiles {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 820px) {
  .dash__grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .tiles {
    grid-template-columns: 1fr;
  }
}
</style>

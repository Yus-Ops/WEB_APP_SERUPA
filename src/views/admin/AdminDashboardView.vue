<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { corpusStats, saturationMap } from '@/data/mockTheses'
import { formatNumber, pct } from '@/lib/format'
import BarChart from '@/components/charts/BarChart.vue'
import SaturationBars from '@/components/charts/SaturationBars.vue'

const abstractPct = computed(() => pct(corpusStats.withAbstract, corpusStats.totalRecords))

const tiles = computed(() => [
  { label: 'Total record', value: formatNumber(corpusStats.totalRecords), sub: 'skripsi di korpus' },
  { label: 'Ber-abstrak', value: `${abstractPct.value}%`, sub: `${formatNumber(corpusStats.withAbstract)} record`, tone: 'success' },
  { label: 'Tanpa abstrak', value: formatNumber(corpusStats.missingAbstract), sub: 'perlu dilengkapi', tone: 'warning' },
  { label: 'Tahun janggal', value: formatNumber(corpusStats.suspiciousYear), sub: 'perlu diverifikasi', tone: 'warning' },
  { label: 'Rentang tahun', value: `${corpusStats.firstYear}–${corpusStats.lastYear}`, sub: 'cakupan korpus' },
])
</script>

<template>
  <div class="dash">
    <header class="dash__head">
      <div>
        <h2 class="dash__title">Ringkasan Korpus</h2>
        <p class="dash__sub">
          Kondisi data ±{{ formatNumber(corpusStats.totalRecords) }} skripsi FIK UNISSULA.
          Terakhir diindeks {{ corpusStats.lastIndexed }}.
        </p>
      </div>
      <span class="dash__model">Model: {{ corpusStats.modelVersion }}</span>
    </header>

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
              {{ formatNumber(corpusStats.missingAbstract) }} record belum memiliki abstrak — sinyal
              semantiknya lemah hingga dilengkapi.
            </p>
          </div>
          <div class="quality__flags">
            <div class="flag">
              <span class="flag__dot flag__dot--warn" />
              <span>{{ corpusStats.suspiciousYear }} record bertahun janggal / kosong</span>
            </div>
            <div class="flag">
              <span class="flag__dot flag__dot--ok" />
              <span>{{ formatNumber(corpusStats.withAbstract) }} record siap di-embed</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Saturasi teaser -->
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
      <BarChart :data="corpusStats.perYear" :format-value="formatNumber" />
    </section>
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

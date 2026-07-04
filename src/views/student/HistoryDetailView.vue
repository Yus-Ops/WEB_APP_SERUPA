<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useScansStore } from '@/stores/scans'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/lib/format'
import ResultCard from '@/components/scan/ResultCard.vue'
import ScanDisclaimer from '@/components/scan/ScanDisclaimer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const scans = useScansStore()
const toast = useToastStore()

const scan = computed(() => scans.byId(route.params.id))
const showDelete = ref(false)

// Mode live: bila halaman detail dibuka langsung (mis. dari tautan), pastikan
// riwayat sudah dimuat sebelum mencari scan berdasarkan id.
onMounted(() => scans.ensureLoaded())

const picoEntries = computed(() => {
  const p = scan.value?.input?.pico
  if (!p) return []
  const labels = {
    populasi: 'Populasi',
    intervensi: 'Intervensi',
    pembanding: 'Pembanding',
    outcome: 'Outcome',
    setting: 'Setting',
  }
  return Object.entries(p)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => ({ label: labels[k] || k, value: v }))
})

async function remove() {
  try {
    await scans.remove(scan.value.id)
    toast.info('Riwayat scan dihapus.')
    router.push({ name: 'history' })
  } catch (e) {
    toast.error('Gagal menghapus', e.message || 'Coba lagi.')
  }
}

function printReport() {
  window.print()
}
</script>

<template>
  <div v-if="scan" class="detail">
    <div class="detail__nav">
      <RouterLink :to="{ name: 'history' }" class="detail__back">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Kembali ke riwayat
      </RouterLink>
      <div class="detail__navActions">
        <AppButton variant="secondary" size="sm" @click="printReport">Cetak / PDF</AppButton>
        <AppButton variant="ghost" size="sm" @click="showDelete = true">Hapus</AppButton>
      </div>
    </div>

    <header class="detail__head">
      <span class="eyebrow">Riwayat Scan · {{ formatDateTime(scan.createdAt) }}</span>
      <h2 class="detail__title">{{ scan.input.title }}</h2>
      <p class="detail__summary">{{ scan.input.summary }}</p>

      <div v-if="picoEntries.length" class="detail__pico">
        <span v-for="p in picoEntries" :key="p.label" class="detail__picoItem">
          <span class="detail__picoLabel">{{ p.label }}</span>
          {{ p.value }}
        </span>
      </div>
    </header>

    <ScanDisclaimer />

    <div class="detail__resultsHead">
      <h3 class="detail__resultsTitle">{{ scan.results.length }} penelitian termirip</h3>
      <span class="detail__resultsNote">Diurutkan dari skor tertinggi</span>
    </div>

    <div class="detail__list">
      <ResultCard v-for="r in scan.results" :key="r.thesis.id" :result="r" />
    </div>

    <AppModal v-model="showDelete" title="Hapus riwayat?" size="sm">
      <p class="detail__delText">Riwayat scan ini akan dihapus permanen.</p>
      <template #footer>
        <AppButton variant="ghost" @click="showDelete = false">Batal</AppButton>
        <AppButton variant="danger" @click="remove">Hapus</AppButton>
      </template>
    </AppModal>
  </div>

  <div v-else class="detail__missing">
    <EmptyState
      icon="history"
      title="Riwayat tidak ditemukan"
      message="Scan yang Anda cari mungkin sudah dihapus."
    >
      <AppButton :to="{ name: 'history' }" variant="primary">Kembali ke riwayat</AppButton>
    </EmptyState>
  </div>
</template>

<style scoped>
.detail {
  max-width: 780px;
}
.detail__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.detail__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
}
.detail__back:hover {
  color: var(--color-primary-700);
}
.detail__navActions {
  display: flex;
  gap: var(--space-2);
}
.detail__head {
  margin-bottom: var(--space-5);
}
.detail__title {
  font-size: var(--text-2xl);
  margin: var(--space-2) 0 var(--space-3);
}
.detail__summary {
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}
.detail__pico {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.detail__picoItem {
  font-size: var(--text-sm);
  padding: 6px 12px;
  background: var(--color-primary-050);
  border-radius: var(--radius-md);
  color: var(--color-text);
}
.detail__picoLabel {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
  margin-right: 6px;
}
.detail__resultsHead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  margin: var(--space-6) 0 var(--space-4);
}
.detail__resultsTitle {
  font-size: var(--text-xl);
}
.detail__resultsNote {
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
}
.detail__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.detail__delText {
  color: var(--color-text-muted);
}

@media print {
  .detail__nav,
  .detail__navActions {
    display: none;
  }
}
</style>

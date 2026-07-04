<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useScansStore } from '@/stores/scans'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, formatScore, truncate } from '@/lib/format'
import BandBadge from '@/components/ui/BandBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const scans = useScansStore()
const toast = useToastStore()
const { ordered, loading } = storeToRefs(scans)

const pendingDelete = ref(null)

onMounted(() => scans.seedIfEmpty())

async function confirmDelete() {
  if (!pendingDelete.value) return
  try {
    await scans.remove(pendingDelete.value.id)
    toast.info('Riwayat scan dihapus.')
  } catch (e) {
    toast.error('Gagal menghapus', e.message || 'Coba lagi.')
  } finally {
    pendingDelete.value = null
  }
}
</script>

<template>
  <div class="history">
    <header class="history__head">
      <div>
        <h2 class="history__title">Riwayat Scan</h2>
        <p class="history__sub">Setiap analisis tersimpan otomatis dan bisa dibuka kembali.</p>
      </div>
      <AppButton :to="{ name: 'scan' }" variant="primary">Scan baru</AppButton>
    </header>

    <div v-if="loading && !ordered.length" class="history__empty">
      <EmptyState icon="history" title="Memuat riwayat…" message="Mengambil riwayat scan Anda." />
    </div>

    <div v-else-if="ordered.length" class="history__list">
      <RouterLink
        v-for="scan in ordered"
        :key="scan.id"
        :to="{ name: 'history-detail', params: { id: scan.id } }"
        class="hcard"
      >
        <div class="hcard__main">
          <div class="hcard__topline">
            <BandBadge
              v-if="scan.results[0]"
              :band="scan.results[0].band"
              :score="scan.results[0].score"
              size="sm"
            />
            <span class="hcard__date">{{ formatDateTime(scan.createdAt) }}</span>
          </div>
          <h3 class="hcard__title">{{ scan.input.title }}</h3>
          <p class="hcard__summary">{{ truncate(scan.input.summary, 150) }}</p>
          <p class="hcard__meta">
            {{ scan.results.length }} penelitian termirip · skor tertinggi
            <strong>{{ formatScore(scan.results[0]?.score || 0) }}</strong>
          </p>
        </div>
        <div class="hcard__side">
          <button
            class="hcard__del"
            type="button"
            aria-label="Hapus riwayat"
            @click.prevent="pendingDelete = scan"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
            </svg>
          </button>
          <span class="hcard__arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </RouterLink>
    </div>

    <div v-else class="history__empty">
      <EmptyState
        icon="history"
        title="Belum ada riwayat"
        message="Analisis rencana topik pertama Anda akan muncul di sini."
      >
        <AppButton :to="{ name: 'scan' }" variant="primary">Mulai scan</AppButton>
      </EmptyState>
    </div>

    <AppModal :model-value="!!pendingDelete" title="Hapus riwayat?" size="sm" @update:model-value="pendingDelete = null">
      <p class="del__text">
        Riwayat scan “<strong>{{ truncate(pendingDelete?.input.title, 60) }}</strong>” akan dihapus
        permanen. Tindakan ini tidak dapat dibatalkan.
      </p>
      <template #footer>
        <AppButton variant="ghost" @click="pendingDelete = null">Batal</AppButton>
        <AppButton variant="danger" @click="confirmDelete">Hapus</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.history__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.history__title {
  font-size: var(--text-2xl);
}
.history__sub {
  color: var(--color-text-muted);
  margin-top: 2px;
}
.history__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.hcard {
  display: flex;
  align-items: stretch;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  transition:
    box-shadow var(--transition-base),
    border-color var(--transition-base),
    transform var(--transition-base);
}
.hcard:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-200);
  transform: translateY(-2px);
}
.hcard__main {
  flex: 1;
  min-width: 0;
}
.hcard__topline {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.hcard__date {
  font-size: var(--text-xs);
  color: var(--color-text-subtle);
}
.hcard__title {
  font-size: var(--text-lg);
  color: var(--color-text);
  margin-bottom: 4px;
}
.hcard__summary {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}
.hcard__meta {
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
}
.hcard__meta strong {
  color: var(--color-primary-800);
  font-variant-numeric: tabular-nums;
}
.hcard__side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}
.hcard__del {
  color: var(--color-text-subtle);
  padding: 6px;
  border-radius: var(--radius-sm);
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
}
.hcard__del:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}
.hcard__arrow {
  color: var(--color-primary-300);
}
.hcard:hover .hcard__arrow {
  color: var(--color-primary-600);
}
.del__text {
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}
</style>

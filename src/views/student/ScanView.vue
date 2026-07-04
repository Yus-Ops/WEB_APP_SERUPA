<script setup>
import { ref, reactive } from 'vue'
import { useScansStore } from '@/stores/scans'
import { useToastStore } from '@/stores/toast'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ResultCard from '@/components/scan/ResultCard.vue'
import ScanDisclaimer from '@/components/scan/ScanDisclaimer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppSpinner from '@/components/ui/AppSpinner.vue'

const scans = useScansStore()
const toast = useToastStore()

const form = reactive({ title: '', summary: '', topN: '5' })
const pico = reactive({ populasi: '', intervensi: '', pembanding: '', outcome: '', setting: '' })
const errors = reactive({ title: '', summary: '' })
const showPico = ref(false)
const loading = ref(false)
const result = ref(null)

const topNOptions = [
  { value: '3', label: '3 penelitian termirip' },
  { value: '5', label: '5 penelitian termirip' },
  { value: '10', label: '10 penelitian termirip' },
]

function validate() {
  errors.title = form.title.trim().length >= 8 ? '' : 'Judul minimal 8 karakter.'
  errors.summary =
    form.summary.trim().length >= 30
      ? ''
      : 'Ringkasan minimal 30 karakter (2–4 kalimat) agar topik Anda jelas.'
  return !errors.title && !errors.summary
}

async function submit() {
  if (!validate()) return
  loading.value = true
  result.value = null
  const picoFilled = Object.values(pico).some((v) => v.trim())
  try {
    result.value = await scans.create({
      title: form.title,
      summary: form.summary,
      pico: picoFilled ? { ...pico } : null,
      topN: Number(form.topN),
    })
    toast.success('Analisis selesai & tersimpan ke riwayat.')
  } catch (e) {
    toast.error('Analisis gagal', e.message || 'Coba lagi beberapa saat.')
  } finally {
    loading.value = false
  }
}

function reset() {
  result.value = null
  form.title = ''
  form.summary = ''
  Object.keys(pico).forEach((k) => (pico[k] = ''))
  errors.title = ''
  errors.summary = ''
}
</script>

<template>
  <div class="scan">
    <!-- Kolom input -->
    <aside class="scan__aside">
      <div class="scan__card">
        <div class="scan__cardHead">
          <h2 class="scan__cardTitle">Rencana Topik Skripsi</h2>
          <p class="scan__cardSub">Tulis judul dan ringkasan rencana Anda, lalu klik cek.</p>
        </div>

        <form class="scan__form" novalidate @submit.prevent="submit">
          <AppInput
            v-model="form.title"
            label="Judul rencana skripsi"
            placeholder="mis. Pengaruh terapi musik terhadap kecemasan pasien pre-operasi"
            :error="errors.title"
            required
          />
          <AppTextarea
            v-model="form.summary"
            label="Ringkasan rencana"
            placeholder="Ceritakan singkat (2–4 kalimat): apa masalahnya, apa yang Anda teliti/lakukan, pada siapa, dan di mana."
            :rows="5"
            :error="errors.summary"
            hint="Makin lengkap ceritanya, makin tepat hasilnya — seperti menjelaskan topik ke teman."
            show-count
            required
          />

          <button type="button" class="scan__picoToggle" @click="showPico = !showPico">
            <svg class="scan__chev" :class="{ 'is-open': showPico }" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 5l5 5-5 5" />
            </svg>
            Rincian PICO <span class="scan__opt">(opsional)</span>
          </button>
          <div v-if="showPico" class="scan__pico">
            <p class="scan__picoHelp">
              Boleh dikosongkan. Isi bila ingin memerinci topik: siapa yang diteliti, apa yang
              dilakukan, dibandingkan apa, hasil yang diukur, dan di mana.
            </p>
            <AppInput v-model="pico.populasi" label="Populasi" placeholder="mis. lansia hipertensi" />
            <AppInput v-model="pico.intervensi" label="Intervensi" placeholder="mis. senam ergonomik" />
            <AppInput v-model="pico.pembanding" label="Pembanding" placeholder="mis. perawatan standar" />
            <AppInput v-model="pico.outcome" label="Outcome" placeholder="mis. tekanan darah" />
            <AppInput v-model="pico.setting" label="Tempat" placeholder="mis. puskesmas" />
          </div>

          <AppSelect v-model="form.topN" label="Jumlah hasil" :options="topNOptions" />

          <div class="scan__actions">
            <AppButton type="submit" variant="primary" size="lg" block :loading="loading">
              {{ loading ? 'Memeriksa…' : 'Cek kemiripan' }}
            </AppButton>
            <AppButton v-if="result" type="button" variant="ghost" size="md" block @click="reset">
              Cek rencana lain
            </AppButton>
          </div>
        </form>
      </div>
    </aside>

    <!-- Kolom hasil -->
    <section class="scan__results">
      <!-- Loading -->
      <div v-if="loading" class="scan__loading">
        <AppSpinner :size="32" />
        <p>Membandingkan rencana Anda dengan ±2.000 skripsi FIK…</p>
      </div>

      <!-- Hasil -->
      <template v-else-if="result">
        <div class="scan__resultHead">
          <div>
            <span class="eyebrow">Hasil Analisis</span>
            <h2 class="scan__resultTitle">{{ result.results.length }} penelitian termirip</h2>
          </div>
          <AppButton :to="{ name: 'history-detail', params: { id: result.id } }" variant="secondary" size="sm">
            Buka di riwayat
          </AppButton>
        </div>

        <ScanDisclaimer />

        <div class="scan__queryRecap">
          <p class="scan__recapLabel">Rencana yang Anda cek</p>
          <p class="scan__recapTitle">{{ result.input.title }}</p>
          <p class="scan__recapSummary">{{ result.input.summary }}</p>
        </div>

        <div class="scan__list">
          <ResultCard v-for="r in result.results" :key="r.thesis.id" :result="r" />
        </div>
      </template>

      <!-- Kosong / panduan awal -->
      <div v-else class="scan__intro">
        <EmptyState
          icon="search"
          title="Mulai cek rencana topik Anda"
          message="Hasilnya muncul di sini: daftar skripsi yang paling mirip beserta skor, penulis, tahun, dan abstraknya — untuk Anda diskusikan bersama pembimbing."
        />
        <div class="scan__tips">
          <h3 class="scan__tipsTitle">Tips agar hasil tepat</h3>
          <ul class="scan__tipsList">
            <li><strong>Tulis ringkasan yang jelas.</strong> Ceritakan apa yang diteliti dan pada siapa — jangan hanya judul.</li>
            <li><strong>Pakai istilah spesifik.</strong> “Senam kaki diabetik” lebih baik daripada “olahraga”.</li>
            <li><strong>Skor tinggi bukan berarti ditolak.</strong> Itu tanda untuk ditinjau lebih teliti, bukan keputusan akhir.</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.scan {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: var(--space-8);
  align-items: start;
}
.scan__aside {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-8));
}
.scan__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}
.scan__cardHead {
  margin-bottom: var(--space-5);
}
.scan__cardTitle {
  font-size: var(--text-xl);
}
.scan__cardSub {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: 2px;
}
.scan__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.scan__picoToggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
  margin-bottom: calc(-1 * var(--space-2));
}
.scan__chev {
  width: 18px;
  height: 18px;
  transition: transform var(--transition-fast);
}
.scan__chev.is-open {
  transform: rotate(90deg);
}
.scan__opt {
  color: var(--color-text-subtle);
  font-weight: var(--font-weight-regular);
}
.scan__pico {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-primary-050);
  border-radius: var(--radius-md);
}
.scan__picoHelp {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
  margin-bottom: 2px;
}
.scan__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.scan__results {
  min-height: 60vh;
}
.scan__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-24) var(--space-6);
  color: var(--color-text-muted);
  text-align: center;
}
.scan__resultHead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.scan__resultTitle {
  font-size: var(--text-2xl);
  margin-top: 2px;
}
.scan__queryRecap {
  margin: var(--space-4) 0;
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-md);
}
.scan__recapLabel {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-subtle);
  margin-bottom: 4px;
}
.scan__recapTitle {
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}
.scan__recapSummary {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: 4px;
}
.scan__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-5);
}
.scan__intro {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.scan__tips {
  padding: var(--space-6);
  border-top: 1px solid var(--color-border);
  background: var(--color-primary-050);
}
.scan__tipsTitle {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-primary-700);
  margin-bottom: var(--space-3);
}
.scan__tipsList {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.scan__tipsList li {
  padding-left: var(--space-4);
  position: relative;
}
.scan__tipsList li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
}

@media (max-width: 900px) {
  .scan {
    grid-template-columns: 1fr;
  }
  .scan__aside {
    position: static;
  }
}
</style>

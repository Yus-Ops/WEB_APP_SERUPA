<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useCorpusStore } from '@/stores/corpus'
import { useToastStore } from '@/stores/toast'
import { parseCSV } from '@/lib/csv'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { truncate } from '@/lib/format'

const corpus = useCorpusStore()
const toast = useToastStore()

// Muat korpus (mode live) agar deteksi duplikat bekerja terhadap data server.
onMounted(() => corpus.ensureLoaded())

const tab = ref('manual')

/* ---- Manual ---- */
const mform = reactive({ title: '', author: '', year: '', abstract: '', sourceUrl: '' })
const merr = reactive({ title: '', author: '', year: '' })

function validateManual() {
  merr.title = mform.title.trim().length >= 8 ? '' : 'Judul minimal 8 karakter.'
  merr.author = mform.author.trim() ? '' : 'Penulis wajib diisi.'
  const y = Number(mform.year)
  merr.year = y >= 1990 && y <= 2100 ? '' : 'Tahun tidak valid.'
  return !merr.title && !merr.author && !merr.year
}

async function submitManual() {
  if (!validateManual()) return
  if (corpus.findDuplicateTitle(mform.title)) {
    merr.title = 'Judul identik sudah ada di korpus.'
    return
  }
  try {
    await corpus.add({
      title: mform.title.trim(),
      author: mform.author.trim(),
      year: Number(mform.year),
      abstract: mform.abstract.trim(),
      sourceUrl: mform.sourceUrl.trim(),
    })
    toast.success('Judul ditambahkan ke korpus.')
    Object.assign(mform, { title: '', author: '', year: '', abstract: '', sourceUrl: '' })
  } catch (e) {
    toast.error('Gagal menambah judul', e.message || 'Coba lagi.')
  }
}

/* ---- Batch CSV ---- */
const rawCsv = ref('')
const fileName = ref('')
const dragOver = ref(false)
const report = ref(null) // { rows: [{line, status, reason, record}], counts }

const HEADER_MAP = {
  judul: 'title', title: 'title',
  penulis: 'author', author: 'author', nama: 'author',
  tahun: 'year', year: 'year',
  abstrak: 'abstract', abstract: 'abstract',
  url: 'sourceUrl', tautan: 'sourceUrl', source_url: 'sourceUrl', sourceurl: 'sourceUrl',
}

function analyzeCsv() {
  report.value = null
  const rows = parseCSV(rawCsv.value)
  if (rows.length < 2) {
    toast.error('CSV kosong', 'Butuh baris header + minimal satu baris data.')
    return
  }
  const headers = rows[0].map((h) => HEADER_MAP[h.trim().toLowerCase()] || null)
  if (!headers.includes('title')) {
    toast.error('Kolom judul tidak ditemukan', 'Pastikan ada kolom “judul” atau “title”.')
    return
  }

  const seen = new Set()
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const rec = { title: '', author: '', year: null, abstract: '', sourceUrl: '' }
    rows[i].forEach((cell, ci) => {
      const key = headers[ci]
      if (key) rec[key] = cell.trim()
    })
    const y = Number(rec.year)
    rec.year = y >= 1990 && y <= 2100 ? y : null

    let status = 'valid'
    let reason = ''
    const normTitle = rec.title.toLowerCase().replace(/\s+/g, ' ').trim()
    if (rec.title.trim().length < 8) {
      status = 'invalid'
      reason = 'Judul kosong / terlalu pendek'
    } else if (!rec.year) {
      status = 'invalid'
      reason = 'Tahun tidak valid'
    } else if (corpus.findDuplicateTitle(rec.title) || seen.has(normTitle)) {
      status = 'duplicate'
      reason = 'Judul sudah ada di korpus / batch'
    }
    seen.add(normTitle)
    out.push({ line: i + 1, status, reason, record: rec })
  }

  report.value = {
    rows: out,
    counts: {
      valid: out.filter((r) => r.status === 'valid').length,
      invalid: out.filter((r) => r.status === 'invalid').length,
      duplicate: out.filter((r) => r.status === 'duplicate').length,
    },
  }
}

function onFile(e) {
  const file = (e.target.files || e.dataTransfer?.files)?.[0]
  if (!file) return
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    rawCsv.value = String(reader.result || '')
    analyzeCsv()
  }
  reader.readAsText(file)
}

function onDrop(e) {
  dragOver.value = false
  onFile({ dataTransfer: e.dataTransfer })
}

async function importValid() {
  const valid = report.value.rows.filter((r) => r.status === 'valid').map((r) => r.record)
  try {
    await corpus.addMany(valid)
    toast.success(`${valid.length} judul diimpor ke korpus.`)
    report.value = null
    rawCsv.value = ''
    fileName.value = ''
  } catch (e) {
    toast.error('Impor gagal', e.message || 'Coba lagi.')
  }
}

function downloadTemplate() {
  const csv =
    'judul,penulis,tahun,abstrak,url\n' +
    '"Pengaruh Terapi Musik terhadap Kecemasan Pasien Pre Operasi","Nama Mahasiswa",2023,"Latar belakang: ...","https://repository.unissula.ac.id/thesis/xxxx"\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template-korpus-serupa.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const statusTone = { valid: 'success', invalid: 'danger', duplicate: 'warning' }
const statusLabel = { valid: 'Valid', invalid: 'Gagal', duplicate: 'Duplikat' }
const previewRows = computed(() => report.value?.rows.slice(0, 30) || [])
</script>

<template>
  <div class="upload">
    <header class="upload__head">
      <h2 class="upload__title">Unggah Data</h2>
      <p class="upload__sub">Tambahkan judul ke korpus secara manual atau unggah batch CSV.</p>
    </header>

    <div class="tabs" role="tablist">
      <button class="tab" :class="{ 'is-active': tab === 'manual' }" role="tab" :aria-selected="tab === 'manual'" @click="tab = 'manual'">
        Manual
      </button>
      <button class="tab" :class="{ 'is-active': tab === 'batch' }" role="tab" :aria-selected="tab === 'batch'" @click="tab = 'batch'">
        Batch CSV / Excel
      </button>
    </div>

    <!-- Manual -->
    <section v-if="tab === 'manual'" class="card">
      <form class="form" novalidate @submit.prevent="submitManual">
        <AppInput v-model="mform.title" label="Judul" placeholder="Judul skripsi" :error="merr.title" required />
        <div class="form__row">
          <AppInput v-model="mform.author" label="Penulis" placeholder="Nama penulis" :error="merr.author" required />
          <AppInput v-model="mform.year" label="Tahun" placeholder="2023" inputmode="numeric" :error="merr.year" required />
        </div>
        <AppTextarea v-model="mform.abstract" label="Abstrak" :rows="6" placeholder="Abstrak penelitian…" show-count />
        <AppInput v-model="mform.sourceUrl" label="URL sumber (opsional)" placeholder="https://repository.unissula.ac.id/…" />
        <div class="form__actions">
          <AppButton type="submit" variant="primary">Tambahkan ke korpus</AppButton>
        </div>
      </form>
    </section>

    <!-- Batch -->
    <section v-else class="batch">
      <div class="batch__intro">
        <p>Unggah berkas <strong>.csv</strong> dengan kolom: <code>judul</code>, <code>penulis</code>, <code>tahun</code>, <code>abstrak</code>, <code>url</code>. Sistem memvalidasi kolom, menandai baris gagal, dan mendeteksi duplikat.</p>
        <AppButton variant="ghost" size="sm" @click="downloadTemplate">Unduh template</AppButton>
      </div>

      <label
        class="drop"
        :class="{ 'is-over': dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <input type="file" accept=".csv,text/csv" class="visually-hidden" @change="onFile" />
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
        <p class="drop__title">{{ fileName || 'Seret berkas CSV ke sini atau klik untuk memilih' }}</p>
        <p class="drop__hint">Format .csv, UTF-8</p>
      </label>

      <details class="batch__paste">
        <summary>atau tempel teks CSV</summary>
        <AppTextarea v-model="rawCsv" :rows="5" placeholder="judul,penulis,tahun,abstrak,url&#10;..." />
        <AppButton variant="secondary" size="sm" @click="analyzeCsv">Analisis CSV</AppButton>
      </details>

      <!-- Report -->
      <div v-if="report" class="report">
        <div class="report__summary">
          <div class="rstat rstat--ok"><strong>{{ report.counts.valid }}</strong> valid</div>
          <div class="rstat rstat--warn"><strong>{{ report.counts.duplicate }}</strong> duplikat</div>
          <div class="rstat rstat--err"><strong>{{ report.counts.invalid }}</strong> gagal</div>
          <AppButton
            class="report__import"
            variant="primary"
            size="sm"
            :disabled="report.counts.valid === 0"
            @click="importValid"
          >
            Impor {{ report.counts.valid }} baris valid
          </AppButton>
        </div>

        <div class="report__tableWrap">
          <table class="report__table">
            <thead>
              <tr><th>Baris</th><th>Status</th><th>Judul</th><th>Tahun</th><th>Keterangan</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in previewRows" :key="r.line" :class="`row--${r.status}`">
                <td>{{ r.line }}</td>
                <td><AppBadge :tone="statusTone[r.status]" size="sm">{{ statusLabel[r.status] }}</AppBadge></td>
                <td class="report__title">{{ truncate(r.record.title || '(kosong)', 60) }}</td>
                <td>{{ r.record.year || '—' }}</td>
                <td class="report__reason">{{ r.reason || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="report.rows.length > previewRows.length" class="report__more">
            +{{ report.rows.length - previewRows.length }} baris lagi…
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.upload__head {
  margin-bottom: var(--space-5);
}
.upload__title {
  font-size: var(--text-2xl);
}
.upload__sub {
  color: var(--color-text-muted);
  margin-top: 2px;
}
.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-primary-050);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-5);
}
.tab {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}
.tab.is-active {
  background: var(--color-surface);
  color: var(--color-primary-800);
  box-shadow: var(--shadow-xs);
}
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  max-width: 720px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.form__row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-4);
}
.form__actions {
  display: flex;
  justify-content: flex-end;
}

.batch {
  max-width: 860px;
}
.batch__intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-4);
}
.batch__intro p {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}
.batch__intro code {
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
  background: var(--color-primary-050);
  color: var(--color-primary-800);
  padding: 1px 6px;
  border-radius: 4px;
}
.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-12) var(--space-6);
  text-align: center;
  background: var(--color-surface);
  border: 2px dashed var(--color-primary-200);
  border-radius: var(--radius-lg);
  color: var(--color-primary-600);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast);
}
.drop:hover,
.drop.is-over {
  border-color: var(--color-primary);
  background: var(--color-primary-050);
}
.drop__title {
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}
.drop__hint {
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
}
.batch__paste {
  margin-top: var(--space-4);
}
.batch__paste summary {
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
  padding: var(--space-2) 0;
}
.batch__paste > :not(summary) {
  margin-top: var(--space-3);
}
.batch__paste :deep(.field) {
  margin-bottom: var(--space-3);
}

.report {
  margin-top: var(--space-6);
}
.report__summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
.rstat {
  font-size: var(--text-sm);
  padding: 8px 14px;
  border-radius: var(--radius-md);
}
.rstat strong {
  font-weight: var(--font-weight-black);
}
.rstat--ok {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.rstat--warn {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.rstat--err {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.report__import {
  margin-left: auto;
}
.report__tableWrap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}
.report__table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
  font-size: var(--text-sm);
}
.report__table th {
  text-align: left;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-subtle);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}
.report__table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}
.row--invalid {
  background: rgba(192, 69, 58, 0.03);
}
.report__title {
  max-width: 34ch;
}
.report__reason {
  color: var(--color-text-muted);
}
.report__more {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
}
@media (max-width: 640px) {
  .form__row {
    grid-template-columns: 1fr;
  }
  .batch__intro {
    flex-direction: column;
    gap: var(--space-3);
  }
}
</style>

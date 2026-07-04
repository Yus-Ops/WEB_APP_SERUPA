<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCorpusStore } from '@/stores/corpus'
import { useToastStore } from '@/stores/toast'
import { formatNumber, truncate } from '@/lib/format'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const corpus = useCorpusStore()
const toast = useToastStore()
const { items, loading } = storeToRefs(corpus)

const saving = ref(false)

onMounted(() => corpus.ensureLoaded())

const search = ref('')
const page = ref(1)
const perPage = 8

const editing = ref(null) // record being edited/created
const isNew = ref(false)
const deleting = ref(null)
const draft = reactive({ title: '', author: '', year: '', abstract: '', sourceUrl: '' })
const draftErr = reactive({ title: '', author: '', year: '' })

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.author.toLowerCase().includes(q) ||
      String(t.year).includes(q),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const paged = computed(() => {
  const start = (page.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

watch([search, totalPages], () => {
  if (page.value > totalPages.value) page.value = totalPages.value
  if (page.value < 1) page.value = 1
})

function openCreate() {
  isNew.value = true
  editing.value = { id: null }
  Object.assign(draft, { title: '', author: '', year: '', abstract: '', sourceUrl: '' })
  Object.assign(draftErr, { title: '', author: '', year: '' })
}

function openEdit(rec) {
  isNew.value = false
  editing.value = rec
  Object.assign(draft, {
    title: rec.title,
    author: rec.author,
    year: rec.year ?? '',
    abstract: rec.abstract,
    sourceUrl: rec.sourceUrl ?? '',
  })
  Object.assign(draftErr, { title: '', author: '', year: '' })
}

function validateDraft() {
  draftErr.title = draft.title.trim().length >= 8 ? '' : 'Judul minimal 8 karakter.'
  draftErr.author = draft.author.trim() ? '' : 'Penulis wajib diisi.'
  const y = Number(draft.year)
  draftErr.year = y >= 1990 && y <= 2100 ? '' : 'Tahun tidak valid.'
  return !draftErr.title && !draftErr.author && !draftErr.year
}

async function save() {
  if (!validateDraft()) return
  const payload = {
    title: draft.title.trim(),
    author: draft.author.trim(),
    year: Number(draft.year),
    abstract: draft.abstract.trim(),
    sourceUrl: draft.sourceUrl.trim(),
  }
  if (isNew.value && corpus.findDuplicateTitle(payload.title)) {
    draftErr.title = 'Judul identik sudah ada di korpus.'
    return
  }
  saving.value = true
  try {
    if (isNew.value) {
      await corpus.add(payload)
      toast.success('Judul ditambahkan ke korpus.')
    } else {
      await corpus.update(editing.value.id, payload)
      toast.success('Perubahan disimpan.')
    }
    editing.value = null
  } catch (e) {
    toast.error('Gagal menyimpan', e.message || 'Coba lagi.')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  try {
    await corpus.remove(deleting.value.id)
    toast.info('Judul dihapus dari korpus.')
  } catch (e) {
    toast.error('Gagal menghapus', e.message || 'Coba lagi.')
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="corpus">
    <header class="corpus__head">
      <div>
        <h2 class="corpus__title">Korpus Skripsi</h2>
        <p class="corpus__sub">
          Menampilkan <strong>{{ formatNumber(filtered.length) }}</strong> dari
          {{ formatNumber(items.length) }} judul (sampel korpus). Dapat dicari, disunting, dan dihapus.
        </p>
      </div>
      <AppButton variant="primary" @click="openCreate">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Tambah judul
      </AppButton>
    </header>

    <div class="corpus__search">
      <svg class="corpus__searchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      <input v-model="search" class="corpus__searchInput" type="search" placeholder="Cari judul, penulis, atau tahun…" />
    </div>

    <div v-if="loading && !items.length" class="corpus__empty">
      <EmptyState icon="search" title="Memuat korpus…" message="Mengambil data judul dari server." />
    </div>

    <div v-else-if="filtered.length" class="corpus__tableWrap">
      <table class="corpus__table">
        <thead>
          <tr>
            <th scope="col">Judul & Abstrak</th>
            <th scope="col" class="col-author">Penulis</th>
            <th scope="col" class="col-year">Tahun</th>
            <th scope="col" class="col-act"><span class="visually-hidden">Aksi</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in paged" :key="t.id">
            <td>
              <p class="cell__title">{{ t.title }}</p>
              <p class="cell__abstract">{{ truncate(t.abstract, 130) }}</p>
            </td>
            <td class="col-author">{{ t.author }}</td>
            <td class="col-year">{{ t.year || '—' }}</td>
            <td class="col-act">
              <div class="cell__actions">
                <button class="iconbtn" type="button" aria-label="Sunting" @click="openEdit(t)">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                </button>
                <button class="iconbtn iconbtn--danger" type="button" aria-label="Hapus" @click="deleting = t">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="corpus__empty">
      <EmptyState
        icon="search"
        :title="items.length ? 'Tidak ada judul cocok' : 'Korpus masih kosong'"
        :message="items.length ? `Tidak ada hasil untuk “${search}”.` : 'Belum ada judul. Tambah judul atau unggah data CSV.'"
      />
    </div>

    <!-- Pagination -->
    <div v-if="filtered.length" class="corpus__pager">
      <span class="corpus__pageInfo">Halaman {{ page }} dari {{ totalPages }}</span>
      <div class="corpus__pageBtns">
        <button type="button" class="pagebtn" :disabled="page <= 1" @click="page--">Sebelumnya</button>
        <button type="button" class="pagebtn" :disabled="page >= totalPages" @click="page++">Berikutnya</button>
      </div>
    </div>

    <!-- Edit/Create modal -->
    <AppModal
      :model-value="!!editing"
      :title="isNew ? 'Tambah judul' : 'Sunting judul'"
      size="lg"
      @update:model-value="editing = null"
    >
      <div class="form">
        <AppInput v-model="draft.title" label="Judul" :error="draftErr.title" required />
        <div class="form__row">
          <AppInput v-model="draft.author" label="Penulis" :error="draftErr.author" required />
          <AppInput v-model="draft.year" label="Tahun" inputmode="numeric" :error="draftErr.year" required />
        </div>
        <AppTextarea v-model="draft.abstract" label="Abstrak" :rows="6" show-count />
        <AppInput v-model="draft.sourceUrl" label="URL sumber" placeholder="https://repository.unissula.ac.id/…" />
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="editing = null">Batal</AppButton>
        <AppButton variant="primary" :loading="saving" @click="save">{{ isNew ? 'Tambahkan' : 'Simpan' }}</AppButton>
      </template>
    </AppModal>

    <!-- Delete modal -->
    <AppModal :model-value="!!deleting" title="Hapus judul?" size="sm" @update:model-value="deleting = null">
      <p class="corpus__delText">
        “<strong>{{ truncate(deleting?.title, 70) }}</strong>” akan dihapus dari korpus.
      </p>
      <template #footer>
        <AppButton variant="ghost" @click="deleting = null">Batal</AppButton>
        <AppButton variant="danger" @click="confirmDelete">Hapus</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.corpus__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}
.corpus__title {
  font-size: var(--text-2xl);
}
.corpus__sub {
  color: var(--color-text-muted);
  margin-top: 2px;
}
.corpus__sub strong {
  color: var(--color-text);
}
.corpus__search {
  position: relative;
  margin-bottom: var(--space-4);
}
.corpus__searchIcon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--color-text-subtle);
}
.corpus__searchInput {
  width: 100%;
  padding: 12px 14px 12px 44px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
}
.corpus__searchInput:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus);
}
.corpus__tableWrap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  box-shadow: var(--shadow-sm);
}
.corpus__table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}
.corpus__table th {
  text-align: left;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-subtle);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}
.corpus__table td {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}
.corpus__table tbody tr:last-child td {
  border-bottom: none;
}
.corpus__table tbody tr:hover {
  background: var(--color-primary-050);
}
.cell__title {
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin-bottom: 4px;
  max-width: 52ch;
}
.cell__abstract {
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
  max-width: 60ch;
}
.col-author {
  white-space: nowrap;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
.col-year {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}
.col-act {
  width: 1%;
}
.cell__actions {
  display: flex;
  gap: 4px;
}
.iconbtn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}
.iconbtn:hover {
  background: var(--color-primary-100);
  color: var(--color-primary-800);
}
.iconbtn--danger:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.corpus__pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
.corpus__pageInfo {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.corpus__pageBtns {
  display: flex;
  gap: var(--space-2);
}
.pagebtn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
  transition: border-color var(--transition-fast);
}
.pagebtn:hover:not(:disabled) {
  border-color: var(--color-primary-300);
  background: var(--color-primary-050);
}
.pagebtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  color: var(--color-text-subtle);
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
.corpus__delText {
  color: var(--color-text-muted);
}
</style>

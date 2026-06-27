<script setup>
import { ref, reactive, computed, onMounted } from "vue"
import SimilarityGauge from "@/components/SimilarityGauge.vue"
import { checkTitle, addTitle, apiMode } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { HAS_SUPABASE } from "@/lib/config"

const authMode = HAS_SUPABASE ? "supabase" : "key"
const unlocked = ref(false)
const adminKey = ref("")
const email = ref("")
const password = ref("")
const authError = ref("")
const authBusy = ref(false)

const form = reactive({ title: "", abstract: "", year: new Date().getFullYear() })
const checking = ref(false)
const saving = ref(false)
const checkResult = ref(null)
const error = ref("")
const savedMsg = ref("")
const forceSave = ref(false)

const top = computed(() => checkResult.value?.top || null)
const isDup = computed(() => (top.value?.percent ?? 0) >= 85)
const blockSave = computed(() => isDup.value && !forceSave.value)

onMounted(async () => {
  if (authMode === "supabase" && supabase) {
    const { data } = await supabase.auth.getSession()
    if (data?.session) unlocked.value = true
  }
})

async function unlock() {
  authError.value = ""
  if (authMode === "key") {
    if (!adminKey.value.trim()) {
      authError.value = "Masukkan admin key."
      return
    }
    unlocked.value = true
    return
  }
  authBusy.value = true
  try {
    const { error: e } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (e) throw e
    unlocked.value = true
  } catch (e) {
    authError.value = e.message || "Login gagal."
  } finally {
    authBusy.value = false
  }
}
async function lock() {
  if (authMode === "supabase" && supabase) await supabase.auth.signOut()
  unlocked.value = false
  adminKey.value = ""
}

async function runCheck() {
  error.value = ""
  savedMsg.value = ""
  if (form.title.trim().length < 5) {
    error.value = "Judul terlalu pendek (min 5 karakter)."
    return
  }
  checking.value = true
  forceSave.value = false
  try {
    checkResult.value = await checkTitle(form.title.trim(), 5)
  } catch (e) {
    error.value = e.message || "Gagal memeriksa."
  } finally {
    checking.value = false
  }
}

async function save() {
  error.value = ""
  savedMsg.value = ""
  if (form.title.trim().length < 5) {
    error.value = "Judul terlalu pendek (min 5 karakter)."
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      abstract: form.abstract.trim() || null,
      year: form.year ? Number(form.year) : null,
    }
    const res = await addTitle(payload, adminKey.value)
    savedMsg.value = res.demo
      ? "Tersimpan (simulasi mode demo). Di mode live, judul masuk ke korpus Supabase."
      : "Judul final ditambahkan ke korpus."
    form.title = ""
    form.abstract = ""
    checkResult.value = null
    forceSave.value = false
  } catch (e) {
    error.value = e.message || "Gagal menyimpan."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="container narrow">
    <span class="eyebrow">Gerbang korpus · khusus admin</span>
    <h1 class="h1">Tambah judul final ke korpus</h1>
    <p class="sub">
      Hanya judul yang sudah <strong>disetujui</strong> yang boleh masuk korpus —
      bukan input coba-coba mahasiswa. Periksa dulu sebelum menyimpan agar duplikat
      tidak ikut terindeks.
    </p>

    <!-- GATE -->
    <div v-if="!unlocked" class="card card-pad gate">
      <h3 class="serif gate-t">Masuk sebagai admin</h3>

      <template v-if="authMode === 'key'">
        <label class="field-label" for="key">Admin key</label>
        <input
          id="key"
          v-model="adminKey"
          class="input"
          type="password"
          placeholder="ADMIN_KEY layanan Python"
          @keydown.enter="unlock"
        />
        <p class="faint tiny">
          Dikirim sebagai header <code>X-Admin-Key</code> ke endpoint <code>/add</code>.
          <template v-if="apiMode.demo">Di mode demo, nilai apa pun diterima (penyimpanan disimulasikan).</template>
        </p>
      </template>

      <template v-else>
        <label class="field-label" for="em">Email</label>
        <input id="em" v-model="email" class="input" type="email" placeholder="admin@kampus.ac.id" />
        <label class="field-label" for="pw" style="margin-top: 12px">Kata sandi</label>
        <input id="pw" v-model="password" class="input" type="password" @keydown.enter="unlock" />
      </template>

      <p v-if="authError" class="error">{{ authError }}</p>
      <button class="btn btn-primary unlock" :disabled="authBusy" @click="unlock">
        <span v-if="authBusy" class="spinner" /> Buka kunci
      </button>
    </div>

    <!-- FORM -->
    <div v-else class="grid">
      <div class="card card-pad">
        <div class="form-head">
          <h3 class="serif">Detail judul</h3>
          <button class="btn btn-ghost btn-sm" @click="lock">Kunci</button>
        </div>

        <label class="field-label" for="t">Judul *</label>
        <textarea
          id="t"
          v-model="form.title"
          class="textarea"
          rows="2"
          placeholder="Judul skripsi yang sudah final…"
        />

        <label class="field-label" for="ab">Abstrak</label>
        <textarea
          id="ab"
          v-model="form.abstract"
          class="textarea"
          rows="5"
          placeholder="Abstrak skripsi — ditampilkan di hasil & dipakai melabeli tema klaster (bukan untuk pencarian)."
        />

        <label class="field-label" for="y">Tahun</label>
        <input id="y" v-model="form.year" class="input year" type="number" min="1990" max="2100" />

        <div class="actions">
          <button class="btn" :disabled="checking" @click="runCheck">
            <span v-if="checking" class="spinner" /> Periksa dulu
          </button>
          <button class="btn btn-primary" :disabled="saving || blockSave" @click="save">
            <span v-if="saving" class="spinner" /> Simpan ke korpus
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="savedMsg" class="ok">{{ savedMsg }}</p>
      </div>

      <!-- PRATINJAU PEMERIKSAAN -->
      <aside class="card card-pad preview">
        <h3 class="serif preview-t">Pratinjau pemeriksaan</h3>
        <template v-if="checkResult">
          <SimilarityGauge
            :percent="top?.percent ?? 0"
            :category="top?.category || ''"
            :caption="top?.title || ''"
          />
          <div v-if="blockSave" class="warn">
            Kemiripan tinggi terdeteksi. Bila ini memang judul berbeda, lanjutkan.
            <button class="btn btn-sm warn-btn" @click="forceSave = true">Simpan tetap</button>
          </div>
        </template>
        <p v-else class="faint preview-empty">
          Tekan <strong>Periksa dulu</strong> untuk melihat judul termirip sebelum
          menyimpan. Mencegah duplikat meracuni korpus.
        </p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 880px;
}
.h1 {
  font-size: clamp(26px, 3.4vw, 36px);
  margin-top: 10px;
}
.sub {
  margin-top: 12px;
  color: var(--muted);
  max-width: 60ch;
}
.tiny {
  font-size: 12px;
  margin-top: 8px;
}
.tiny code,
.sub code {
  font-family: var(--mono);
  font-size: 11.5px;
  background: var(--surface-2);
  padding: 1px 6px;
  border-radius: 6px;
}
.gate {
  margin-top: 26px;
  max-width: 440px;
}
.gate-t {
  font-size: 18px;
  margin-bottom: 16px;
}
.unlock {
  width: 100%;
  margin-top: 16px;
}
.grid {
  margin-top: 26px;
  display: grid;
  grid-template-columns: 1.2fr 0.95fr;
  gap: 20px;
  align-items: start;
}
.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.form-head h3 {
  font-size: 18px;
}
.field-label {
  margin-top: 14px;
}
.card-pad .field-label:first-of-type {
  margin-top: 0;
}
.year {
  max-width: 160px;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.actions .btn {
  flex: 1;
}
.error {
  margin-top: 14px;
  color: var(--sangat_mirip);
  font-size: 13.5px;
}
.ok {
  margin-top: 14px;
  color: var(--aman);
  font-size: 13.5px;
}
.preview {
  position: sticky;
  top: 86px;
  min-height: 280px;
}
.preview-t {
  font-size: 17px;
  margin-bottom: 18px;
}
.preview-empty {
  font-size: 13.5px;
  line-height: 1.6;
}
.warn {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(176, 125, 46, 0.42);
  background: rgba(176, 125, 46, 0.1);
  color: #8a5a16;
  font-size: 13px;
  line-height: 1.5;
}
.warn-btn {
  margin-top: 10px;
  border-color: rgba(176, 125, 46, 0.5);
}
@media (max-width: 820px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .preview {
    position: static;
  }
}
</style>

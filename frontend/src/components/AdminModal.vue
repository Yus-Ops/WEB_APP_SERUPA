<script setup>
// Modal admin (gerbang korpus). Menggantikan halaman /admin (perbaikan §3b).
//  - Belum login  → form email/password Supabase (atau simulasi di mode demo).
//  - Sudah login  → form "Tambah judul" + pratinjau pemeriksaan (pindahan AdminView).
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue"
import SimilarityGauge from "@/components/SimilarityGauge.vue"
import { checkTitle, addTitle } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { HAS_SUPABASE } from "@/lib/config"

const emit = defineEmits(["close"])

const unlocked = ref(false)
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

function onKey(e) {
  if (e.key === "Escape") emit("close")
}

onMounted(async () => {
  document.addEventListener("keydown", onKey)
  if (HAS_SUPABASE && supabase) {
    const { data } = await supabase.auth.getSession()
    if (data?.session) unlocked.value = true
  }
})
onBeforeUnmount(() => document.removeEventListener("keydown", onKey))

async function unlock() {
  authError.value = ""
  // Mode demo: tanpa Supabase, autentikasi disimulasikan agar form tetap dapat dicoba.
  if (!HAS_SUPABASE) {
    unlocked.value = true
    return
  }
  if (!email.value || !password.value) {
    authError.value = "Masukkan email dan kata sandi."
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
  if (HAS_SUPABASE && supabase) await supabase.auth.signOut()
  unlocked.value = false
  email.value = ""
  password.value = ""
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
    const res = await addTitle(payload)
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
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="card card-pad modal">
        <button class="x" @click="$emit('close')" aria-label="Tutup">×</button>

        <!-- BELUM LOGIN -->
        <div v-if="!unlocked" class="login">
          <span class="eyebrow">Gerbang korpus · khusus admin</span>
          <h3 class="serif modal-t">Masuk sebagai admin</h3>
          <p class="faint modal-sub">
            Hanya admin yang dapat menambahkan judul final ke korpus — bukan input
            coba-coba mahasiswa.
          </p>

          <template v-if="HAS_SUPABASE">
            <label class="field-label" for="em">Email</label>
            <input
              id="em"
              v-model="email"
              class="input"
              type="email"
              placeholder="admin@unissula.ac.id"
              @keydown.enter="unlock"
            />
            <label class="field-label" for="pw" style="margin-top: 12px">Kata sandi</label>
            <input id="pw" v-model="password" class="input" type="password" @keydown.enter="unlock" />
          </template>
          <p v-else class="demo-auth faint">
            Mode demo — autentikasi disimulasikan. Klik untuk masuk dan mencoba form admin.
          </p>

          <p v-if="authError" class="error">{{ authError }}</p>
          <button class="btn btn-primary unlock" :disabled="authBusy" @click="unlock">
            <span v-if="authBusy" class="spinner" /> Buka kunci
          </button>
        </div>

        <!-- SUDAH LOGIN -->
        <div v-else class="panel-form">
          <div class="form-head">
            <div>
              <span class="eyebrow">Tambah judul final</span>
              <h3 class="serif modal-t">Detail judul</h3>
            </div>
            <button class="btn btn-ghost btn-sm" @click="lock">Keluar</button>
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
            rows="4"
            placeholder="Abstrak — ditampilkan di hasil & melabeli tema klaster (bukan untuk pencarian)."
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

          <!-- PRATINJAU PEMERIKSAAN -->
          <Transition name="fade">
            <div v-if="checkResult" class="preview">
              <SimilarityGauge
                :percent="top?.percent ?? 0"
                :category="top?.category || ''"
                :caption="top?.title || ''"
              />
              <div v-if="blockSave" class="warn">
                Kemiripan tinggi terdeteksi. Bila ini memang judul berbeda, lanjutkan.
                <button class="btn btn-sm warn-btn" @click="forceSave = true">Simpan tetap</button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(44, 35, 41, 0.45);
  backdrop-filter: blur(4px);
  animation: overlay-in 0.18s ease;
}
@keyframes overlay-in {
  from {
    opacity: 0;
  }
}
.modal {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: auto;
  animation: modal-in 0.2s ease;
}
@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }
}
.x {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 22px;
  line-height: 1;
  color: var(--faint);
  background: none;
  border: 0;
  cursor: pointer;
  transition: color 0.15s ease;
}
.x:hover {
  color: var(--ink);
}
.eyebrow {
  display: block;
  margin-bottom: 6px;
}
.modal-t {
  font-size: 20px;
  margin-top: 2px;
}
.modal-sub {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.55;
  max-width: 46ch;
}
.field-label {
  margin-top: 14px;
}
.year {
  max-width: 160px;
}
.demo-auth {
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.6;
}
.unlock {
  width: 100%;
  margin-top: 18px;
}
.form-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
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
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
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
  text-align: center;
}
.warn-btn {
  margin-top: 10px;
  border-color: rgba(176, 125, 46, 0.5);
}
</style>

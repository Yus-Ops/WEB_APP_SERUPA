<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import AuthShell from '@/components/layout/AuthShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ nim: '', password: '' })
const errors = reactive({ nim: '', password: '' })
const showPw = ref(false)
const loading = ref(false)

const points = [
  'Bandingkan rencana topik dengan ±2.000 skripsi FIK.',
  'Lihat penelitian termirip beserta abstrak lengkap.',
  'Simpan dan buka kembali riwayat scan Anda.',
]

function validate() {
  errors.nim = form.nim.trim() ? '' : 'NIM wajib diisi.'
  errors.password = form.password ? '' : 'Kata sandi wajib diisi.'
  return !errors.nim && !errors.password
}

async function submit() {
  if (!validate()) return
  loading.value = true
  // Simulasikan latensi jaringan agar UX terasa nyata.
  await new Promise((r) => setTimeout(r, 500))
  try {
    const user = await auth.login({ nim: form.nim, password: form.password })
    toast.success(`Selamat datang, ${(user.fullName || 'mahasiswa').split(' ')[0]}!`)
    const redirect = route.query.redirect
    if (redirect) router.push(redirect)
    else router.push(auth.homeRoute)
  } catch (e) {
    errors.password = e.message
  } finally {
    loading.value = false
  }
}

function fill(role) {
  if (role === 'admin') {
    form.nim = 'admin'
    form.password = 'admin123'
  } else {
    form.nim = '30901900045'
    form.password = 'serupa123'
  }
}
</script>

<template>
  <AuthShell :points="points">
    <div class="login">
      <h1 class="login__title">Masuk ke Serupa</h1>
      <p class="login__sub">Gunakan NIM dan kata sandi mahasiswa Anda.</p>

      <form class="login__form" novalidate @submit.prevent="submit">
        <AppInput
          v-model="form.nim"
          label="NIM"
          placeholder="Contoh: 30901900045"
          inputmode="text"
          autocomplete="username"
          :error="errors.nim"
          required
        />

        <div class="login__pw">
          <AppInput
            v-model="form.password"
            :type="showPw ? 'text' : 'password'"
            label="Kata Sandi"
            placeholder="Masukkan kata sandi"
            autocomplete="current-password"
            :error="errors.password"
            required
          />
          <button class="login__toggle" type="button" @click="showPw = !showPw">
            {{ showPw ? 'Sembunyikan' : 'Tampilkan' }}
          </button>
        </div>

        <AppButton type="submit" variant="primary" size="lg" block :loading="loading">
          Masuk
        </AppButton>
      </form>

      <div class="login__demo">
        <p class="login__demoTitle">Akun demo (frontend mock)</p>
        <div class="login__demoBtns">
          <button type="button" @click="fill('student')">Isi sebagai Mahasiswa</button>
          <button type="button" @click="fill('admin')">Isi sebagai Admin</button>
        </div>
      </div>

      <p class="login__alt">
        Belum punya akun?
        <RouterLink to="/daftar">Daftar di sini</RouterLink>
      </p>
    </div>
  </AuthShell>
</template>

<style scoped>
.login__title {
  font-size: var(--text-3xl);
}
.login__sub {
  margin: var(--space-2) 0 var(--space-8);
  color: var(--color-text-muted);
}
.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.login__pw {
  position: relative;
}
.login__toggle {
  position: absolute;
  top: 0;
  right: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
}
.login__toggle:hover {
  color: var(--color-primary-800);
}
.login__demo {
  margin-top: var(--space-6);
  padding: var(--space-4);
  border: 1px dashed var(--color-primary-200);
  border-radius: var(--radius-md);
  background: var(--color-primary-050);
}
.login__demoTitle {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-primary-700);
  margin-bottom: var(--space-3);
}
.login__demoBtns {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.login__demoBtns button {
  flex: 1;
  min-width: 140px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
  transition: border-color var(--transition-fast);
}
.login__demoBtns button:hover {
  border-color: var(--color-primary-300);
}
.login__alt {
  margin-top: var(--space-8);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.login__alt a {
  font-weight: var(--font-weight-bold);
}
</style>

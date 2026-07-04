<script setup>
import { ref, reactive } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import AuthShell from '@/components/layout/AuthShell.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const form = reactive({ fullName: '', nim: '', email: '', password: '', confirm: '' })
const errors = reactive({ fullName: '', nim: '', email: '', password: '', confirm: '' })
const loading = ref(false)

const points = [
  'Login memakai NIM — mudah diingat mahasiswa.',
  'Email tetap dicatat untuk pemulihan kata sandi.',
  'Riwayat scan Anda tersimpan aman per akun.',
]

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate() {
  errors.fullName = form.fullName.trim() ? '' : 'Nama lengkap wajib diisi.'
  errors.nim = /^\d{6,}$/.test(form.nim.trim()) ? '' : 'NIM harus berupa angka (min. 6 digit).'
  errors.email = emailRe.test(form.email.trim()) ? '' : 'Format email tidak valid.'
  errors.password = form.password.length >= 6 ? '' : 'Kata sandi minimal 6 karakter.'
  errors.confirm = form.confirm === form.password ? '' : 'Konfirmasi kata sandi tidak cocok.'
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  if (!validate()) return
  loading.value = true
  await new Promise((r) => setTimeout(r, 550))
  try {
    await auth.register({
      fullName: form.fullName,
      nim: form.nim,
      email: form.email,
      password: form.password,
    })
    toast.success('Akun berhasil dibuat!', 'Selamat datang di Serupa.')
    router.push({ name: 'scan' })
  } catch (e) {
    errors.nim = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell :points="points">
    <div class="reg">
      <h1 class="reg__title">Buat akun mahasiswa</h1>
      <p class="reg__sub">Daftar untuk mulai mengecek rencana topik skripsi Anda.</p>

      <form class="reg__form" novalidate @submit.prevent="submit">
        <AppInput
          v-model="form.fullName"
          label="Nama Lengkap"
          placeholder="Nama sesuai KTM"
          autocomplete="name"
          :error="errors.fullName"
          required
        />
        <div class="reg__grid">
          <AppInput
            v-model="form.nim"
            label="NIM"
            placeholder="30901900045"
            inputmode="numeric"
            :error="errors.nim"
            required
          />
          <AppInput
            v-model="form.email"
            type="email"
            label="Email"
            placeholder="nama@std.unissula.ac.id"
            autocomplete="email"
            hint="Untuk pemulihan kata sandi."
            :error="errors.email"
            required
          />
        </div>
        <div class="reg__grid">
          <AppInput
            v-model="form.password"
            type="password"
            label="Kata Sandi"
            placeholder="Min. 6 karakter"
            autocomplete="new-password"
            :error="errors.password"
            required
          />
          <AppInput
            v-model="form.confirm"
            type="password"
            label="Ulangi Kata Sandi"
            placeholder="Ketik ulang"
            autocomplete="new-password"
            :error="errors.confirm"
            required
          />
        </div>

        <AppButton type="submit" variant="primary" size="lg" block :loading="loading">
          Daftar
        </AppButton>
      </form>

      <p class="reg__alt">
        Sudah punya akun?
        <RouterLink to="/masuk">Masuk di sini</RouterLink>
      </p>
    </div>
  </AuthShell>
</template>

<style scoped>
.reg__title {
  font-size: var(--text-3xl);
}
.reg__sub {
  margin: var(--space-2) 0 var(--space-6);
  color: var(--color-text-muted);
}
.reg__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.reg__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.reg__alt {
  margin-top: var(--space-6);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.reg__alt a {
  font-weight: var(--font-weight-bold);
}
@media (max-width: 520px) {
  .reg__grid {
    grid-template-columns: 1fr;
  }
}
</style>

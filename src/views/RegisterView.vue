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

const step = ref('form') // form | otp

const form = reactive({ fullName: '', nim: '', email: '', password: '', confirm: '' })
const errors = reactive({ fullName: '', nim: '', email: '', password: '', confirm: '' })
const loading = ref(false)

// Langkah verifikasi OTP
const otp = reactive({ email: '', code: '' })
const otpError = ref('')
const otpLoading = ref(false)
const resending = ref(false)

const points = [
  'Login memakai NIM — mudah diingat mahasiswa.',
  'Verifikasi lewat email kampus dengan kode OTP.',
  'Riwayat scan Anda tersimpan aman per akun.',
]

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CAMPUS_DOMAIN = 'std.unissula.ac.id'

function validate() {
  errors.fullName = form.fullName.trim() ? '' : 'Nama lengkap wajib diisi.'
  errors.nim = /^\d{6,}$/.test(form.nim.trim()) ? '' : 'NIM harus berupa angka (min. 6 digit).'
  const email = form.email.trim().toLowerCase()
  if (!emailRe.test(email)) errors.email = 'Format email tidak valid.'
  else if (!email.endsWith('@' + CAMPUS_DOMAIN)) errors.email = `Wajib email kampus @${CAMPUS_DOMAIN}.`
  else errors.email = ''
  errors.password = form.password.length >= 6 ? '' : 'Kata sandi minimal 6 karakter.'
  errors.confirm = form.confirm === form.password ? '' : 'Konfirmasi kata sandi tidak cocok.'
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  if (!validate()) return
  loading.value = true
  try {
    const result = await auth.register({
      fullName: form.fullName,
      nim: form.nim,
      email: form.email,
      password: form.password,
    })
    if (result.needsVerification) {
      otp.email = result.email
      otp.code = ''
      otpError.value = ''
      step.value = 'otp'
      toast.info('Kode verifikasi dikirim', `Cek email ${result.email}.`)
    } else {
      toast.success('Akun berhasil dibuat!', 'Selamat datang di Serupa.')
      router.push({ name: 'scan' })
    }
  } catch (e) {
    console.error('[register]', e)
    const msg = e && typeof e.message === 'string' && e.message ? e.message : 'Registrasi gagal. Coba lagi.'
    if (e?.code === 'nim_taken') errors.nim = msg
    // Galat kirim email = masalah server/konfigurasi, bukan validasi kolom → toast.
    else if (e?.code === 'email_send_failed') toast.error('Gagal mengirim email verifikasi', msg)
    else errors.email = msg
  } finally {
    loading.value = false
  }
}

async function verify() {
  otpError.value = ''
  if (!/^\d{4,10}$/.test(otp.code.trim())) {
    otpError.value = 'Masukkan kode dari email.'
    return
  }
  otpLoading.value = true
  try {
    await auth.verifyOtp({ email: otp.email, token: otp.code })
    toast.success('Email terverifikasi!', 'Selamat datang di Serupa.')
    router.push({ name: 'scan' })
  } catch (e) {
    otpError.value = e.message
  } finally {
    otpLoading.value = false
  }
}

async function resend() {
  resending.value = true
  try {
    await auth.resendOtp({ email: otp.email })
    toast.info('Kode dikirim ulang', `Cek email ${otp.email}.`)
  } catch (e) {
    toast.error('Gagal mengirim ulang', e.message || 'Coba lagi.')
  } finally {
    resending.value = false
  }
}

function backToForm() {
  step.value = 'form'
  otp.code = ''
  otpError.value = ''
}
</script>

<template>
  <AuthShell :points="points">
    <!-- Langkah 1: form pendaftaran -->
    <div v-if="step === 'form'" class="reg">
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
            label="Email Kampus"
            placeholder="nama@std.unissula.ac.id"
            autocomplete="email"
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
          Daftar & Kirim Kode
        </AppButton>
      </form>

      <p class="reg__alt">
        Sudah punya akun?
        <RouterLink to="/masuk">Masuk di sini</RouterLink>
      </p>
    </div>

    <!-- Langkah 2: verifikasi OTP -->
    <div v-else class="reg">
      <h1 class="reg__title">Verifikasi email</h1>
      <p class="reg__sub">
        Kami mengirim kode verifikasi ke <strong class="reg__mail">{{ otp.email }}</strong>.
        Masukkan kode itu untuk mengaktifkan akun.
      </p>

      <form class="reg__form" novalidate @submit.prevent="verify">
        <AppInput
          v-model="otp.code"
          label="Kode OTP"
          placeholder="Kode dari email"
          inputmode="numeric"
          autocomplete="one-time-code"
          :error="otpError"
          required
        />
        <AppButton type="submit" variant="primary" size="lg" block :loading="otpLoading">
          Verifikasi & Masuk
        </AppButton>
      </form>

      <div class="reg__otpActions">
        <button type="button" class="reg__link" :disabled="resending" @click="resend">
          {{ resending ? 'Mengirim…' : 'Kirim ulang kode' }}
        </button>
        <button type="button" class="reg__link" @click="backToForm">Ubah data</button>
      </div>

      <p class="reg__hint">
        Tidak menerima email? Cek folder spam, atau pastikan alamat email kampus benar.
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
.reg__mail {
  color: var(--color-primary-800);
  word-break: break-all;
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
.reg__otpActions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-5);
}
.reg__link {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-700);
}
.reg__link:hover {
  color: var(--color-primary-800);
  text-decoration: underline;
}
.reg__link:disabled {
  color: var(--color-text-subtle);
  cursor: default;
  text-decoration: none;
}
.reg__hint {
  margin-top: var(--space-5);
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
}
@media (max-width: 520px) {
  .reg__grid {
    grid-template-columns: 1fr;
  }
}
</style>

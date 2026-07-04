/**
 * Serupa — service autentikasi (Supabase Auth, PRD §8, D6).
 *
 * Alur:
 *   - Daftar: POST /api/register (signUp email kampus asli) → Supabase kirim OTP
 *     ke email → verifyOtp() di klien → sesi aktif.
 *   - Masuk: POST /api/login (NIM → email → sign-in DI SERVER) → server balas
 *     token sesi → setSession() di klien. Email kampus tak pernah bocor ke browser.
 *
 * Bentuk `user`: { id, nim, role: 'student'|'admin', fullName, email }
 */
import { REGISTER_API_URL, LOGIN_API_URL } from './config'

function authError(message, code) {
  const err = new Error(message)
  err.code = code
  return err
}

async function getClient() {
  const { getSupabase } = await import('@/lib/supabase')
  return getSupabase()
}

async function profileToUser(supabase, authUser) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('nim, role, full_name, email')
    .eq('id', authUser.id)
    .maybeSingle()

  const meta = authUser.user_metadata || {}
  return {
    id: authUser.id,
    nim: profile?.nim || meta.nim || '',
    role: profile?.role || meta.role || 'student',
    fullName: profile?.full_name || meta.full_name || '',
    email: profile?.email || authUser.email || '',
  }
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

export default {
  async restore() {
    const supabase = await getClient()
    const { data } = await supabase.auth.getSession()
    if (!data.session?.user) return null
    return profileToUser(supabase, data.session.user)
  },

  async register({ fullName, nim, email, password }) {
    const { res, data } = await postJson(REGISTER_API_URL, { fullName, nim, email, password })
    if (!res.ok) throw authError(data.error || 'Registrasi gagal. Coba lagi.', data.code || 'register_failed')

    // "Confirm email" OFF → server mengembalikan token; langsung pasang sesi.
    if (!data.needsVerification && data.access_token) {
      const supabase = await getClient()
      const { data: sess, error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      if (error || !sess.user) throw authError('Gagal memuat sesi. Coba lagi.', 'session_failed')
      return { needsVerification: false, user: await profileToUser(supabase, sess.user) }
    }
    // Normal: perlu verifikasi OTP ke email.
    return { needsVerification: true, email: data.email || String(email).trim().toLowerCase() }
  },

  /** Verifikasi kode OTP 6 digit yang dikirim ke email (menyelesaikan sign-up). */
  async verifyOtp({ email, token }) {
    const supabase = await getClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email: String(email).trim().toLowerCase(),
      token: String(token).trim(),
      type: 'signup',
    })
    if (error) throw authError('Kode OTP salah atau kedaluwarsa.', 'otp_invalid')
    if (!data.user) throw authError('Verifikasi gagal. Coba lagi.', 'otp_failed')
    return profileToUser(supabase, data.user)
  },

  /** Kirim ulang kode OTP verifikasi ke email. */
  async resendOtp({ email }) {
    const supabase = await getClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: String(email).trim().toLowerCase(),
    })
    if (error) throw authError(error.message || 'Gagal mengirim ulang kode.', 'resend_failed')
  },

  async login({ nim, password }) {
    const { res, data } = await postJson(LOGIN_API_URL, { nim, password })
    if (!res.ok) {
      throw authError(data.error || 'NIM atau kata sandi tidak cocok.', data.code || 'invalid_credentials')
    }
    const supabase = await getClient()
    const { data: sess, error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    if (error || !sess.user) throw authError('Gagal memuat sesi. Coba lagi.', 'session_failed')
    return profileToUser(supabase, sess.user)
  },

  async logout() {
    const supabase = await getClient()
    await supabase.auth.signOut()
  },
}

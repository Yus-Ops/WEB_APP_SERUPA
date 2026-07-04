/**
 * Serupa — service autentikasi. Dua implementasi di balik satu antarmuka:
 *
 *   mock → sesi disimpan di localStorage (demo lokal, tanpa backend).
 *   live → Supabase Auth. Login NIM dipetakan ke email internal (PRD §8, D6);
 *          email ASLI mahasiswa tetap dicatat di `profiles.email` untuk pemulihan.
 *
 * Bentuk `user` yang dikembalikan konsisten di kedua mode:
 *   { id, nim, role: 'student'|'admin', fullName, email }
 */
import { isLive, nimToEmail } from './config'

/* =========================================================================
 * MOCK
 * ======================================================================= */
const LS_SESSION = 'serupa.session'
const LS_USERS = 'serupa.users'

const DEMO_USERS = [
  {
    id: 'u-mhs',
    nim: '30901900045',
    password: 'serupa123',
    role: 'student',
    fullName: 'Aisyah Nur Rahmawati',
    email: 'aisyah@std.unissula.ac.id',
  },
  {
    id: 'u-adm',
    nim: 'admin',
    password: 'admin123',
    role: 'admin',
    fullName: 'Koordinator Skripsi FIK',
    email: 'koordinator@unissula.ac.id',
  },
]

function loadUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_USERS) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}
function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users))
}
function strip(user) {
  const { password, ...safe } = user
  return safe
}
function authError(message, code) {
  const err = new Error(message)
  err.code = code
  return err
}

const mock = {
  async restore() {
    try {
      const raw = localStorage.getItem(LS_SESSION)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  async login({ nim, password }) {
    const key = String(nim || '').trim().toLowerCase()
    const found = [...DEMO_USERS, ...loadUsers()].find(
      (u) => u.nim.toLowerCase() === key && u.password === password,
    )
    if (!found) throw authError('NIM atau kata sandi tidak cocok.', 'invalid_credentials')
    const user = strip(found)
    localStorage.setItem(LS_SESSION, JSON.stringify(user))
    return user
  },
  async register({ fullName, nim, email, password }) {
    const key = String(nim || '').trim().toLowerCase()
    const users = loadUsers()
    if ([...DEMO_USERS, ...users].some((u) => u.nim.toLowerCase() === key)) {
      throw authError('NIM sudah terdaftar. Silakan masuk.', 'nim_taken')
    }
    const rec = {
      id: 'u-' + Date.now().toString(36),
      nim: String(nim).trim(),
      password,
      role: 'student',
      fullName: String(fullName).trim(),
      email: String(email).trim(),
    }
    users.push(rec)
    saveUsers(users)
    const user = strip(rec)
    localStorage.setItem(LS_SESSION, JSON.stringify(user))
    return user
  },
  async logout() {
    localStorage.removeItem(LS_SESSION)
  },
}

/* =========================================================================
 * LIVE (Supabase Auth)
 * ======================================================================= */
async function profileToUser(supabase, authUser) {
  // Ambil profil (nim, role, nama) — dibuat otomatis oleh trigger DB saat sign-up.
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
    email: profile?.email || meta.recovery_email || authUser.email || '',
  }
}

const live = {
  async restore() {
    const { getSupabase } = await import('@/lib/supabase')
    const supabase = getSupabase()
    const { data } = await supabase.auth.getSession()
    if (!data.session?.user) return null
    return profileToUser(supabase, data.session.user)
  },
  async login({ nim, password }) {
    const { getSupabase } = await import('@/lib/supabase')
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: nimToEmail(nim),
      password,
    })
    if (error) throw authError('NIM atau kata sandi tidak cocok.', 'invalid_credentials')
    return profileToUser(supabase, data.user)
  },
  async register({ fullName, nim, email, password }) {
    const { getSupabase } = await import('@/lib/supabase')
    const supabase = getSupabase()
    // Email login = internal ({nim}@domain); email ASLI disimpan sebagai recovery_email.
    const { data, error } = await supabase.auth.signUp({
      email: nimToEmail(nim),
      password,
      options: {
        data: {
          nim: String(nim).trim(),
          full_name: String(fullName).trim(),
          recovery_email: String(email).trim(),
          role: 'student',
        },
      },
    })
    if (error) {
      const taken = /already|registered|exists/i.test(error.message)
      throw authError(
        taken ? 'NIM sudah terdaftar. Silakan masuk.' : error.message,
        taken ? 'nim_taken' : 'register_failed',
      )
    }
    if (!data.user) throw authError('Registrasi gagal. Coba lagi.', 'register_failed')
    return profileToUser(supabase, data.user)
  },
  async logout() {
    const { getSupabase } = await import('@/lib/supabase')
    await getSupabase().auth.signOut()
  },
}

export default isLive ? live : mock

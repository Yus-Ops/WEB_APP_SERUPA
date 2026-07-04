/**
 * Serupa — konfigurasi backend (PRD §3, §8).
 *
 * Aplikasi berjalan SEPENUHNYA di atas backend nyata:
 *   - Supabase (Auth + Postgres/pgvector) untuk identitas, korpus, & riwayat.
 *   - Hugging Face (embedding) via Vercel Serverless Functions untuk scan.
 *
 * Tidak ada lagi mode mock/localStorage. Semua kunci sensitif (service role,
 * token HF) HANYA di server, tidak pernah di berkas ini. Lihat INTEGRATION.md.
 */
const env = import.meta.env

// Kredensial publik Supabase (anon key aman dibawa ke browser; RLS yang menjaga).
export const SUPABASE_URL = env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || ''

// Endpoint serverless untuk scan (embedding + pencarian pgvector).
export const SCAN_API_URL = env.VITE_SCAN_API_URL || '/api/scan'

// Endpoint serverless untuk daftar & masuk. Login pakai NIM di-resolve ke email
// akun di server (email kampus asli tak diekspos ke browser). Lihat api/login.js.
export const REGISTER_API_URL = env.VITE_REGISTER_API_URL || '/api/register'
export const LOGIN_API_URL = env.VITE_LOGIN_API_URL || '/api/login'

/** True bila konfigurasi Supabase publik sudah lengkap. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

if (!supabaseConfigured) {
  // Tidak melempar error di sini: biarkan UI memberi pesan ramah saat aksi
  // dijalankan (getSupabase() akan menjelaskan bila belum dikonfigurasi).
  console.warn(
    '[Serupa] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. ' +
      'Aplikasi memerlukan backend Supabase. Lihat .env.example & INTEGRATION.md.',
  )
}

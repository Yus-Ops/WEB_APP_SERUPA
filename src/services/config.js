/**
 * Serupa — konfigurasi sumber data (frontend-first, PRD §3).
 *
 * SATU sakelar menentukan dari mana data diambil:
 *   - `mock` (default): semuanya lokal (localStorage + mesin kemiripan TF-IDF).
 *     App berjalan penuh TANPA backend — untuk demo & pengembangan UI.
 *   - `live`: Supabase (Auth + Postgres/pgvector) & Hugging Face (embedding)
 *     lewat Vercel Serverless Functions. Lihat INTEGRATION.md.
 *
 * Ganti mode via variabel lingkungan build-time `VITE_DATA_MODE`.
 * Semua kunci sensitif (service role, token HF) HANYA di server, tidak di sini.
 */
const env = import.meta.env

export const DATA_MODE = (env.VITE_DATA_MODE || 'mock').toLowerCase()
export const isLive = DATA_MODE === 'live'
export const isMock = !isLive

// Kredensial publik Supabase (anon key aman dibawa ke browser; RLS yang menjaga).
export const SUPABASE_URL = env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || ''

// Pemetaan NIM → email internal untuk Supabase Auth (PRD §8, D6).
// Login mahasiswa: `{nim}@{domain}`. Email asli tetap dicatat untuk pemulihan.
export const STUDENT_EMAIL_DOMAIN = env.VITE_STUDENT_EMAIL_DOMAIN || 'std.unissula.ac.id'

// Endpoint serverless untuk scan (embedding + pencarian pgvector).
export const SCAN_API_URL = env.VITE_SCAN_API_URL || '/api/scan'

/** True bila mode live tetapi konfigurasi Supabase belum lengkap. */
export const liveMisconfigured = isLive && (!SUPABASE_URL || !SUPABASE_ANON_KEY)

if (liveMisconfigured) {
  // Tidak melempar error: biarkan UI memberi pesan yang ramah saat aksi dijalankan.
  console.warn(
    '[Serupa] VITE_DATA_MODE=live tetapi VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. ' +
      'Lihat .env.example & INTEGRATION.md.',
  )
}

/** Ubah NIM (atau email) menjadi email login Supabase. */
export function nimToEmail(identifier) {
  const id = String(identifier || '').trim()
  if (!id) return ''
  return id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`
}

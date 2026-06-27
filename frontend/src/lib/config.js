// Konfigurasi runtime + deteksi mode.
// Semua variabel ini AMAN di klien (prefix VITE_). Lihat .env.example.

export const PYTHON_API = (import.meta.env.VITE_PYTHON_API || "").trim().replace(/\/+$/, "")
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim()
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim()

// Apakah Supabase tersedia untuk membaca data peta & login admin.
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

// MODE DEMO: aktif bila layanan Python (sumber operasi AI) belum dikonfigurasi.
// Saat demo, /check & /add disimulasikan di sisi klien dengan korpus contoh,
// sehingga `npm run dev` langsung menampilkan UI lengkap tanpa backend.
export const DEMO_MODE = !PYTHON_API

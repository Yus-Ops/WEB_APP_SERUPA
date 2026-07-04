/**
 * Serupa — klien Supabase untuk browser (mode live).
 *
 * Memakai ANON KEY + Row Level Security (PRD §9). Aman dibawa ke frontend:
 * RLS di server yang menentukan baris mana yang boleh dibaca/ditulis tiap user.
 * Kunci SERVICE ROLE tidak pernah ada di sini — hanya di Serverless Functions.
 *
 * Klien dibuat malas (lazy) & hanya saat mode live, sehingga build/mode mock
 * tidak pernah menyentuhnya.
 */
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/services/config'

let client = null

export function getSupabase() {
  if (client) return client
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY (lihat INTEGRATION.md).',
    )
  }
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'serupa.supabase.auth',
    },
  })
  return client
}

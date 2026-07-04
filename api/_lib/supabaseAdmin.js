/**
 * Serupa — klien Supabase untuk sisi server (Vercel Functions & scripts).
 *
 *   adminClient()      → SERVICE ROLE, mem-bypass RLS. HANYA di server.
 *                        Dipakai untuk pencarian pgvector (baca embeddings).
 *   userClient(token)  → ANON + JWT user. Menulis scan/scan_results ATAS NAMA
 *                        user sehingga RLS memasang user_id = auth.uid() (PRD §9).
 *
 * Kunci service role TIDAK PERNAH dikirim ke browser.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.SUPABASE_ANON_KEY

export function adminClient() {
  if (!URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset.')
  }
  return createClient(URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function userClient(accessToken) {
  if (!URL || !ANON_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY belum diset.')
  }
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function anonClient() {
  if (!URL || !ANON_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY belum diset.')
  }
  // Anon murni (tanpa JWT) untuk sign-up / sign-in atas nama pengguna dari server.
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

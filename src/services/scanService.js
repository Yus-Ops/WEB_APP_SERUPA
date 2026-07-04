/**
 * Serupa — service scan mahasiswa (tabel `scans` + `scan_results`, PRD §9/§10).
 *
 * Analisis kemiripan lewat POST /api/scan (Vercel Function): embedding HF +
 * pencarian pgvector, hasil disimpan ke Supabase. Riwayat dibaca via Supabase
 * (RLS: hanya scan milik sendiri, PRD §9).
 *
 * Bentuk scan (kontrak §11.2):
 *   { id, createdAt, input: { title, summary, pico }, topN,
 *     results: [{ rank, score, band, thesis: { id, title, author, year, abstract, sourceUrl } }] }
 */
import { SCAN_API_URL } from './config'

async function db() {
  const { getSupabase } = await import('@/lib/supabase')
  return getSupabase()
}

async function accessToken() {
  const { data } = await (await db()).auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sesi berakhir. Silakan masuk kembali.')
  return token
}

function mapScanRow(row) {
  const results = (row.scan_results || [])
    .map((r) => ({
      rank: r.rank,
      score: r.score,
      band: r.band,
      thesis: {
        id: r.thesis?.id,
        title: r.thesis?.title || '',
        author: r.thesis?.author || '',
        year: r.thesis?.year ?? null,
        abstract: r.thesis?.abstract || '',
        sourceUrl: r.thesis?.source_url || '',
      },
    }))
    .sort((a, b) => a.rank - b.rank)
  return {
    id: row.id,
    createdAt: row.created_at,
    input: { title: row.input_title, summary: row.input_summary, pico: row.input_pico || null },
    topN: row.top_n,
    results,
  }
}

const SCAN_SELECT = `
  id, input_title, input_summary, input_pico, top_n, created_at,
  scan_results ( rank, score, band, thesis:theses ( id, title, author, year, abstract, source_url ) )
`

export default {
  snapshot: () => [],
  async list() {
    const { data, error } = await (await db())
      .from('scans')
      .select(SCAN_SELECT)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return (data || []).map(mapScanRow)
  },
  async create({ title, summary, pico = null, topN = 5 }) {
    const token = await accessToken()
    const res = await fetch(SCAN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, summary, pico, topN }),
    })
    if (!res.ok) {
      let msg = 'Analisis gagal. Coba lagi.'
      try {
        msg = (await res.json()).error || msg
      } catch {
        /* keep default */
      }
      throw new Error(msg)
    }
    const data = await res.json()
    return {
      id: data.scan_id,
      createdAt: data.created_at || new Date().toISOString(),
      input: data.input || { title, summary, pico },
      topN,
      results: data.results || [],
    }
  },
  async remove(id) {
    const { error } = await (await db()).from('scans').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
  async clearAll() {
    // Hapus semua scan milik user (RLS membatasi ke baris sendiri).
    const supabase = await db()
    const { data } = await supabase.auth.getUser()
    const uid = data.user?.id
    if (!uid) return
    const { error } = await supabase.from('scans').delete().eq('user_id', uid)
    if (error) throw new Error(error.message)
  },
}

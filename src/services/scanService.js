/**
 * Serupa — service scan mahasiswa (tabel `scans` + `scan_results`, PRD §9/§10).
 *
 *   mock → mesin kemiripan TF-IDF lokal (lib/similarity) + localStorage.
 *   live → POST /api/scan (Vercel Function): embedding HF + pencarian pgvector,
 *          hasil disimpan ke Supabase. Riwayat dibaca via Supabase (RLS: hanya
 *          scan milik sendiri, PRD §9).
 *
 * Bentuk scan konsisten di kedua mode (kontrak §11.2):
 *   { id, createdAt, input: { title, summary, pico }, topN,
 *     results: [{ rank, score, band, thesis: { id, title, author, year, abstract, sourceUrl } }] }
 */
import { isLive, SCAN_API_URL } from './config'
import { analyze } from '@/lib/similarity'

/* =========================================================================
 * MOCK
 * ======================================================================= */
const LS = 'serupa.scans'

const SEED_QUERIES = [
  {
    title: 'Hubungan Motivasi Perawat dengan Kepatuhan Hand Hygiene di Rumah Sakit',
    summary:
      'Studi cross sectional yang mengukur keterkaitan tingkat motivasi kerja perawat dengan kepatuhan lima momen cuci tangan untuk menekan infeksi nosokomial di bangsal rawat inap.',
  },
  {
    title: 'Penerapan Telenursing untuk Pemantauan Tekanan Darah Lansia Hipertensi',
    summary:
      'Mengembangkan pemantauan jarak jauh tekanan darah lansia hipertensi melalui aplikasi seluler dan konsultasi daring dengan perawat komunitas di wilayah puskesmas.',
  },
]

function localRead() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}
function localWrite(scans) {
  localStorage.setItem(LS, JSON.stringify(scans))
}
function newId() {
  return 's-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const mock = {
  snapshot: () => localRead(),
  async list() {
    return localRead()
  },
  async create({ title, summary, pico = null, topN = 5 }) {
    // Simulasikan latensi embed + pencarian agar UX setara mode live.
    await new Promise((r) => setTimeout(r, 700))
    const scan = {
      id: newId(),
      createdAt: new Date().toISOString(),
      input: { title: title.trim(), summary: summary.trim(), pico },
      topN,
      results: analyze({ title, summary, pico }, { topN }),
    }
    localWrite([scan, ...localRead()])
    return scan
  },
  async remove(id) {
    localWrite(localRead().filter((s) => s.id !== id))
  },
  async clearAll() {
    localWrite([])
  },
  /** Isi riwayat contoh saat pertama kali (agar halaman tidak kosong). */
  async seedIfEmpty() {
    const current = localRead()
    if (current.length) return current
    const now = Date.now()
    const seeded = SEED_QUERIES.map((q, i) => ({
      id: 's-contoh-' + (i + 1),
      createdAt: new Date(now - (i + 1) * 3 * 86400000).toISOString(),
      input: { title: q.title, summary: q.summary, pico: null },
      topN: 5,
      results: analyze(q, { topN: 5 }),
    }))
    localWrite(seeded)
    return seeded
  },
}

/* =========================================================================
 * LIVE (Serverless + Supabase)
 * ======================================================================= */
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

const live = {
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
  async seedIfEmpty() {
    return null // Tidak menanam data contoh ke akun nyata.
  },
}

export default isLive ? live : mock

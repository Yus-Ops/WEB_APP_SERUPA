/**
 * POST /api/scan — Vercel Serverless Function (PRD §8, §10, §11.2).
 *
 * Alur:
 *   1. Verifikasi JWT Supabase (Authorization: Bearer <access_token>).
 *   2. Bangun teks query (judul + ringkasan + PICO) → embedding via HF.
 *   3. Pencarian cosine terhadap korpus (pgvector) lewat RPC match_theses.
 *   4. Simpan ke `scans` + `scan_results` ATAS NAMA user (RLS, PRD §9).
 *   5. Balikkan hasil sesuai kontrak §11.2: { scan_id, input, results[] }.
 *
 * Kunci HF & service role hanya hidup di sini (server), tidak di browser (§8/§12).
 */
import { adminClient, userClient } from './_lib/supabaseAdmin.js'
import { embedTexts, MODEL_VERSION } from './_lib/embed.js'
import { buildQueryText } from './_lib/text.js'
import { bandForScore } from './_lib/band.js'

const TOP_N_MAX = Number(process.env.SCAN_TOP_N_MAX || 20)

function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }

  try {
    // --- 1. Autentikasi -----------------------------------------------------
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Tidak terautentikasi.' })

    const supaUser = userClient(token)
    const { data: userData, error: userErr } = await supaUser.auth.getUser()
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'Sesi tidak valid. Silakan masuk kembali.' })
    }
    const user = userData.user

    // --- 2. Validasi input --------------------------------------------------
    const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
    const title = String(body.title || '').trim()
    const summary = String(body.summary || '').trim()
    const pico = body.pico && typeof body.pico === 'object' ? body.pico : null
    let topN = Number.parseInt(body.topN, 10)
    topN = Number.isFinite(topN) ? Math.max(1, Math.min(TOP_N_MAX, topN)) : 5

    if (title.length < 8) return res.status(400).json({ error: 'Judul minimal 8 karakter.' })
    if (summary.length < 30) {
      return res.status(400).json({ error: 'Ringkasan minimal 30 karakter (2–4 kalimat).' })
    }

    // --- 3. Embedding query (HF) -------------------------------------------
    const queryText = buildQueryText({ title, summary, pico })
    const [embedding] = await embedTexts([queryText])

    // --- 4. Pencarian pgvector (service role: boleh baca embeddings) --------
    const admin = adminClient()
    const { data: matches, error: matchErr } = await admin.rpc('match_theses', {
      query_embedding: embedding,
      match_count: topN,
      model_version: MODEL_VERSION,
    })
    if (matchErr) throw new Error('Pencarian kemiripan gagal: ' + matchErr.message)

    const results = (matches || []).map((m, i) => {
      const score = round2(m.similarity)
      return {
        rank: i + 1,
        score,
        band: bandForScore(score),
        thesis: {
          id: m.thesis_id,
          title: m.title,
          author: m.author,
          year: m.year,
          abstract: m.abstract,
          sourceUrl: m.source_url,
        },
      }
    })

    // --- 5. Simpan scan + hasil (atas nama user → RLS) ----------------------
    const { data: scanRow, error: scanErr } = await supaUser
      .from('scans')
      .insert({
        user_id: user.id,
        input_title: title,
        input_summary: summary,
        input_pico: pico,
        top_n: topN,
      })
      .select('id, created_at')
      .single()
    if (scanErr) throw new Error('Gagal menyimpan scan: ' + scanErr.message)

    if (results.length) {
      const rows = results.map((r) => ({
        scan_id: scanRow.id,
        thesis_id: r.thesis.id,
        rank: r.rank,
        score: r.score,
        band: r.band,
      }))
      const { error: srErr } = await supaUser.from('scan_results').insert(rows)
      if (srErr) throw new Error('Gagal menyimpan hasil: ' + srErr.message)
    }

    return res.status(200).json({
      scan_id: scanRow.id,
      created_at: scanRow.created_at,
      input: { title, summary, pico },
      results,
    })
  } catch (e) {
    console.error('[api/scan]', e)
    return res.status(500).json({ error: e.message || 'Terjadi kesalahan pada server.' })
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

/**
 * Serupa — precompute embedding korpus → tabel `thesis_embeddings` (PRD §8, §10).
 *
 * Meng-embed hanya judul yang BELUM punya vektor untuk model aktif (idempoten &
 * dapat dilanjutkan). Jalankan setelah import-corpus:
 *   node scripts/embed-corpus.mjs
 * Perlu env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HF_TOKEN, EMBED_MODEL.
 *
 * Memakai helper embedding yang SAMA dengan /api/scan (api/_lib) agar teks
 * passage & pooling konsisten antara korpus dan query.
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { embedTexts, MODEL_VERSION } from '../api/_lib/embed.js'
import { buildPassageText } from '../api/_lib/text.js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('✖ Set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
if (!process.env.HF_TOKEN) {
  console.error('✖ Set HF_TOKEN.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
const PAGE = Number(process.env.EMBED_PAGE || 200) // record diambil per putaran
const BATCH = Number(process.env.EMBED_BATCH || 24) // input per panggilan HF

async function run() {
  console.log(`• Model: ${MODEL_VERSION}`)
  let total = 0

  for (;;) {
    const { data: pending, error } = await supabase.rpc('theses_missing_embedding', {
      model: MODEL_VERSION,
      lim: PAGE,
    })
    if (error) {
      console.error('✖ Gagal mengambil daftar pending:', error.message)
      process.exit(1)
    }
    if (!pending || pending.length === 0) break

    for (let i = 0; i < pending.length; i += BATCH) {
      const chunk = pending.slice(i, i + BATCH)
      const texts = chunk.map((t) => buildPassageText({ title: t.title, abstract: t.abstract }))
      const vectors = await embedTexts(texts)

      const rows = chunk.map((t, j) => ({
        thesis_id: t.id,
        model_version: MODEL_VERSION,
        embedding: vectors[j],
      }))
      const { error: upErr } = await supabase
        .from('thesis_embeddings')
        .upsert(rows, { onConflict: 'thesis_id,model_version' })
      if (upErr) {
        console.error('✖ Gagal upsert embedding:', upErr.message)
        process.exit(1)
      }
      total += chunk.length
      process.stdout.write(`\r  ↳ ${total} embedding tersimpan…`)
    }
  }

  console.log(`\n✔ Selesai. ${total} embedding baru untuk model ${MODEL_VERSION}.`)
  if (total === 0) console.log('  (Semua judul sudah punya embedding untuk model ini.)')
}

run().catch((e) => {
  console.error('\n✖', e.message)
  process.exit(1)
})

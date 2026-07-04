/**
 * Serupa — impor Corpus.csv → tabel `theses` (PRD §9, Fase 3).
 *
 * Corpus.csv memakai pemisah ';' dengan kolom: nama;judul;abstrak;tahun;prodi.
 * Jalankan SEKALI setelah skema dibuat:
 *   node scripts/import-corpus.mjs
 * Perlu env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (lihat .env.example).
 * Node 18+ (fetch & ESM bawaan).
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { parseCSV } from '../src/lib/csv.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = process.env.CORPUS_CSV || resolve(__dirname, '../Corpus.csv')
const BATCH = 500

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('✖ Set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di .env terlebih dulu.')
  process.exit(1)
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

function currentYear() {
  return new Date().getFullYear()
}

function main() {
  const raw = readFileSync(CSV_PATH, 'utf8')
  const rows = parseCSV(raw, ';')
  if (rows.length < 2) {
    console.error('✖ CSV kosong atau tak terbaca:', CSV_PATH)
    process.exit(1)
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const col = {
    author: header.indexOf('nama'),
    title: header.indexOf('judul'),
    abstract: header.indexOf('abstrak'),
    year: header.indexOf('tahun'),
    prodi: header.indexOf('prodi'),
  }
  if (col.title < 0) {
    console.error('✖ Kolom "judul" tidak ditemukan. Header terbaca:', header.join(', '))
    process.exit(1)
  }

  const records = []
  let skipped = 0
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const title = (r[col.title] || '').trim()
    if (title.length < 5) {
      skipped++
      continue
    }
    const y = Number.parseInt((r[col.year] || '').trim(), 10)
    records.push({
      title,
      author: (r[col.author] || '').trim() || null,
      abstract: (r[col.abstract] || '').trim() || null,
      year: Number.isFinite(y) && y >= 1990 && y <= currentYear() + 1 ? y : null,
      prodi: ((col.prodi >= 0 && r[col.prodi]) || 'fik').trim().toLowerCase() || 'fik',
    })
  }
  console.log(`• Terbaca ${records.length} record valid (lewati ${skipped} baris tak layak).`)
  return records
}

async function run() {
  const records = main()
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH)
    const { error } = await supabase.from('theses').insert(chunk)
    if (error) {
      console.error(`✖ Gagal insert batch ${i}-${i + chunk.length}:`, error.message)
      process.exit(1)
    }
    inserted += chunk.length
    console.log(`  ↳ ${inserted}/${records.length} tersimpan`)
  }
  console.log(`✔ Selesai. ${inserted} judul masuk ke tabel theses.`)
  console.log('  Lanjut: node scripts/embed-corpus.mjs untuk menghitung embedding.')
}

run().catch((e) => {
  console.error('✖', e.message)
  process.exit(1)
})

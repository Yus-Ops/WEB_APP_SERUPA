/**
 * Serupa — konversi Corpus.csv → theses_import.csv yang COCOK dengan tabel
 * `theses` untuk diimpor lewat dashboard Supabase (Table Editor → Import data).
 *
 * Corpus.csv: pemisah ';', header nama;judul;abstrak;tahun;prodi (+ BOM).
 * Output    : pemisah ',', header title,author,year,abstract,prodi,source_url,
 *             kolom bertanda kutip yang benar (abstrak multi-baris aman).
 *
 * Jalankan:  node scripts/prepare-theses-csv.mjs   (atau: npm run prepare:csv)
 * Tanpa perlu env/koneksi — murni transformasi berkas.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parseCSV, toCSV } from '../src/lib/csv.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IN = process.env.CORPUS_CSV || resolve(__dirname, '../Corpus.csv')
const OUT = resolve(__dirname, '../theses_import.csv')

const rows = parseCSV(readFileSync(IN, 'utf8'), ';')
if (rows.length < 2) {
  console.error('✖ Corpus.csv kosong / tak terbaca:', IN)
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
  console.error('✖ Kolom "judul" tak ditemukan. Header:', header.join(', '))
  process.exit(1)
}

const currentYear = new Date().getFullYear()
const out = []
let skipped = 0
for (let i = 1; i < rows.length; i++) {
  const r = rows[i]
  const title = (r[col.title] || '').trim()
  if (title.length < 5) {
    skipped++
    continue
  }
  const y = Number.parseInt((r[col.year] || '').trim(), 10)
  out.push({
    title,
    author: (r[col.author] || '').trim(),
    year: Number.isFinite(y) && y >= 1990 && y <= currentYear + 1 ? y : '',
    abstract: (r[col.abstract] || '').trim(),
    prodi: ((col.prodi >= 0 && r[col.prodi]) || 'fik').trim().toLowerCase() || 'fik',
    source_url: '',
  })
}

const headers = [
  { key: 'title', label: 'title' },
  { key: 'author', label: 'author' },
  { key: 'year', label: 'year' },
  { key: 'abstract', label: 'abstract' },
  { key: 'prodi', label: 'prodi' },
  { key: 'source_url', label: 'source_url' },
]

writeFileSync(OUT, toCSV(headers, out), 'utf8')
console.log(`✔ ${out.length} baris ditulis → theses_import.csv (lewati ${skipped} baris tak layak).`)
console.log('  Impor via Supabase → Table Editor → theses → Insert → Import data from CSV.')

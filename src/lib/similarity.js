/**
 * Serupa — mesin kemiripan MOCK (frontend-first, PRD §3 & §11.2).
 *
 * Backend nyata memakai embedding + pgvector (PRD §8/§10). Sampai endpoint
 * tersedia, modul ini menghasilkan skor yang REALISTIS & DETERMINISTIK memakai
 * TF-IDF cosine terhadap korpus contoh, sehingga:
 *   - urutan hasil masuk akal (judul near-duplicate naik ke atas),
 *   - skor tersebar wajar di tiga pita (Tinggi/Sedang/Rendah),
 *   - tata letak UI tidak berubah saat backend nyata dipasang.
 *
 * Bentuk keluaran mengikuti kontrak §11.2: { rank, score, band, thesis }.
 *
 * Catatan: memakai import RELATIF (bukan alias @/) agar modul ini bisa
 * diuji/kalibrasi langsung dengan Node tanpa bundler.
 */
import { theses } from '../data/mockTheses.js'
import { bandForScore } from './format.js'

// Kata umum Indonesia + boilerplate abstrak (latar/tujuan/metode) — dibuang agar
// sinyal topikal (mis. "oksitosin", "stunting", "hemodialisa") lebih menonjol.
const STOPWORDS = new Set(
  `yang dan di ke dari pada untuk dengan atau ini itu adalah dalam tidak akan
   para oleh sebagai juga karena namun serta agar bila jika maka telah dapat
   saat antara terhadap secara lebih paling sangat hanya masih sudah belum
   ada tanpa yaitu ialah yakni bahwa suatu salah satu tersebut serta bagi hal
   latar belakang tujuan metode hasil penelitian ini merupakan menggunakan
   jenis pendekatan berdasarkan menunjukkan responden sampel data pengumpulan
   dilakukan diketahui mengetahui variabel kelompok nilai antara adalah`
    .split(/\s+/)
    .filter(Boolean),
)

/** Stem konservatif: hanya buang akhiran klitik agar istilah medis tak rusak. */
function stem(w) {
  return w.replace(/(nya|kah|lah|pun)$/, '')
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map(stem)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

function termFreq(tokens) {
  const m = new Map()
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1)
  return m
}

// ---- Precompute korpus (sekali saat modul dimuat) ------------------------
// Judul diberi bobot 2x karena paling padat sinyal topik.
const CORPUS = theses.map((t) => {
  const titleTokens = tokenize(t.title)
  const tokens = [...titleTokens, ...titleTokens, ...tokenize(t.abstract)]
  return { thesis: t, tf: termFreq(tokens) }
})

const N = CORPUS.length
const DF = new Map()
for (const doc of CORPUS) {
  for (const term of doc.tf.keys()) DF.set(term, (DF.get(term) || 0) + 1)
}

function idf(term) {
  return Math.log((N + 1) / ((DF.get(term) || 0) + 1)) + 1
}

/** TF map → vektor berbobot TF-IDF + norma L2. */
function toVector(tf) {
  const v = new Map()
  let sumSq = 0
  for (const [term, freq] of tf) {
    const w = freq * idf(term)
    v.set(term, w)
    sumSq += w * w
  }
  return { v, norm: Math.sqrt(sumSq) || 1 }
}

const CORPUS_VECTORS = CORPUS.map((d) => ({ thesis: d.thesis, ...toVector(d.tf) }))

function cosine(a, b) {
  const [small, big] = a.v.size < b.v.size ? [a.v, b.v] : [b.v, a.v]
  let dot = 0
  for (const [term, w] of small) {
    const w2 = big.get(term)
    if (w2) dot += w * w2
  }
  return dot / (a.norm * b.norm)
}

/**
 * Kalibrasi tampilan (MOCK): cosine TF-IDF dipetakan MONOTONIK ke rentang skor
 * yang menyerupai similarity embedding (agar UI terasa nyata). Karena monotonik,
 * URUTAN hasil tetap jujur. Backend nyata mengganti ini dengan cosine embedding.
 */
function calibrate(cos) {
  return Math.min(0.98, 0.3 + 0.68 * Math.sqrt(Math.max(0, cos)))
}

/** Gabungkan input mahasiswa menjadi teks query (strategi asimetri D4/§10). */
export function buildQueryText({ title = '', summary = '', pico = null } = {}) {
  const picoText = pico ? Object.values(pico).filter(Boolean).join(' ') : ''
  // Judul 2x agar setara pembobotan korpus.
  return [title, title, summary, picoText].join(' ')
}

/**
 * Jalankan analisis kemiripan.
 * @returns {Array<{rank, score, band, thesis}>} Top-N mengikuti kontrak §11.2.
 */
export function analyze(input, { topN = 5 } = {}) {
  const tokens = tokenize(buildQueryText(input))
  const qVec = toVector(termFreq(tokens))

  const scored = CORPUS_VECTORS.map((doc) => {
    const raw = tokens.length ? cosine(qVec, doc) : 0
    return { thesis: doc.thesis, raw, score: Number(calibrate(raw).toFixed(2)) }
  })

  scored.sort((a, b) => b.raw - a.raw || b.score - a.score)

  return scored.slice(0, topN).map((s, i) => ({
    rank: i + 1,
    score: s.score,
    band: bandForScore(s.score).label,
    thesis: {
      id: s.thesis.id,
      title: s.thesis.title,
      author: s.thesis.author,
      year: s.thesis.year,
      abstract: s.thesis.abstract,
      sourceUrl: s.thesis.sourceUrl,
    },
  }))
}

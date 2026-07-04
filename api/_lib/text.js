/**
 * Serupa — pembangun teks untuk embedding (PRD §10, strategi asimetri D4).
 *
 * Korpus di-embed dari (judul + abstrak) sebagai "passage"; query mahasiswa
 * di-embed dari (judul + ringkasan + PICO) sebagai "query". Menyeimbangkan
 * kekayaan teks kedua sisi supaya jarak vektor mencerminkan makna, bukan panjang.
 *
 * BAAI/bge-m3 (default) tidak wajib memakai prefix. Bila memakai model keluarga
 * e5 yang mensyaratkan prefix, set EMBED_QUERY_INSTRUCTION / EMBED_PASSAGE_INSTRUCTION.
 */
const QUERY_INSTRUCTION = process.env.EMBED_QUERY_INSTRUCTION || ''
const PASSAGE_INSTRUCTION = process.env.EMBED_PASSAGE_INSTRUCTION || ''

function clean(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Teks passage untuk satu record korpus (dipakai script embed-corpus). */
export function buildPassageText({ title = '', abstract = '' } = {}) {
  const body = [clean(title), clean(abstract)].filter(Boolean).join('. ')
  return PASSAGE_INSTRUCTION + body
}

/** Teks query dari input mahasiswa (dipakai /api/scan). */
export function buildQueryText({ title = '', summary = '', pico = null } = {}) {
  const picoText = pico ? Object.values(pico).map(clean).filter(Boolean).join(' ') : ''
  const body = [clean(title), clean(summary), picoText].filter(Boolean).join('. ')
  return QUERY_INSTRUCTION + body
}

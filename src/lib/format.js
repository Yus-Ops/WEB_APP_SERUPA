/**
 * Serupa — helper format & tampilan.
 *
 * Berisi SATU sumber kebenaran untuk pemetaan skor → pita kemiripan (PRD §11).
 * Selaras dengan D1/D2: angka tampil lebih dulu, pita hanya mencegah
 * over-interpretasi selisih kecil (0.82 vs 0.81 tidak bermakna) — pita BUKAN vonis.
 */

// Ambang pita HANYA untuk tampilan. Backend boleh mengirim `band` sendiri
// (satu sumber kebenaran); frontend tetap tahan bila hanya menerima `score`.
export const BAND_THRESHOLDS = { tinggi: 0.75, sedang: 0.6 }

export const BANDS = {
  tinggi: {
    key: 'tinggi',
    label: 'Tinggi',
    hint: 'Perlu ditinjau lebih teliti bersama pembimbing — bukan berarti ditolak.',
  },
  sedang: {
    key: 'sedang',
    label: 'Sedang',
    hint: 'Ada kedekatan makna; perlu dilihat lebih lanjut.',
  },
  rendah: {
    key: 'rendah',
    label: 'Rendah',
    hint: 'Kemiripan rendah; topik relatif berbeda.',
  },
}

/** Petakan skor numerik ke objek pita. Fallback frontend bila backend tak mengirim band. */
export function bandForScore(score) {
  const s = Number(score) || 0
  if (s >= BAND_THRESHOLDS.tinggi) return BANDS.tinggi
  if (s >= BAND_THRESHOLDS.sedang) return BANDS.sedang
  return BANDS.rendah
}

/** Ambil objek pita dari label string ('Tinggi'/'Sedang'/'Rendah'). */
export function bandByLabel(label) {
  const key = String(label || '').toLowerCase()
  return BANDS[key] || BANDS.rendah
}

/** Skor tampil: selalu 2 desimal (PRD §11.1 / D2). */
export function formatScore(score) {
  return (Number(score) || 0).toFixed(2)
}

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function toDate(value) {
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(value) {
  const d = toDate(value)
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}

export function formatDateTime(value) {
  const d = toDate(value)
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d)
}

/** Waktu relatif ringkas: "baru saja", "3 jam lalu", "2 hari lalu". */
export function relativeTime(value) {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'baru saja'
  if (min < 60) return `${min} menit lalu`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} hari lalu`
  return formatDate(d)
}

export function truncate(text, max = 220) {
  const s = String(text || '')
  if (s.length <= max) return s
  return s.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

/** Inisial 1–2 huruf dari nama, untuk avatar. */
export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

export function formatNumber(n) {
  return new Intl.NumberFormat('id-ID').format(Number(n) || 0)
}

/** Persentase 1 desimal dari part/whole. */
export function pct(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 1000) / 10
}

/**
 * Serupa — pemetaan skor → pita kemiripan (PRD §11, D1/D2).
 * HARUS konsisten dengan src/lib/format.js (satu sumber kebenaran ambang).
 * Backend menghitung `band` agar frontend cukup menampilkan (§11.2).
 */
export const BAND_THRESHOLDS = { tinggi: 0.75, sedang: 0.6 }

export function bandForScore(score) {
  const s = Number(score) || 0
  if (s >= BAND_THRESHOLDS.tinggi) return 'Tinggi'
  if (s >= BAND_THRESHOLDS.sedang) return 'Sedang'
  return 'Rendah'
}

// Metadata band kemiripan — warna, label, ambang.
// Ambang (70 / 85) SINKRON dengan BANDS di backend/app.py:
//   0.85 -> sangat_mirip, 0.70 -> mirip, selebihnya aman.
// Warna dipetakan langsung ke palet proyek (CLAUDE.md), membentuk progresi
// dingin→hangat→pekat: Pale Sky (aman) → Smoky Rose (mirip) → Night Bordeaux.
// Bila kamu mengkalibrasi ulang ambang di backend (lihat §8 CLAUDE.md),
// samakan angka di sini agar warna UI konsisten.

export const BANDS = {
  sangat_mirip: {
    code: "sangat_mirip",
    label: "Sangat mirip",
    hint: "Kemungkinan duplikat — perlu ditinjau",
    color: "#66101f", // Night Bordeaux
    glow: "rgba(102, 16, 31, 0.34)",
    min: 85,
  },
  mirip: {
    code: "mirip",
    label: "Mirip sebagian",
    hint: "Periksa pembeda topik",
    color: "#8a4f53", // Smoky Rose (dipekatkan agar terbaca di kertas)
    glow: "rgba(133, 90, 92, 0.34)",
    min: 70,
  },
  aman: {
    code: "aman",
    label: "Relatif aman",
    hint: "Tumpang tindih makna rendah",
    color: "#2f7088", // Pale Sky (dipekatkan)
    glow: "rgba(47, 112, 136, 0.32)",
    min: 0,
  },
}

export const BAND_ORDER = [BANDS.sangat_mirip, BANDS.mirip, BANDS.aman]

export function bandForPercent(percent) {
  if (percent >= BANDS.sangat_mirip.min) return BANDS.sangat_mirip
  if (percent >= BANDS.mirip.min) return BANDS.mirip
  return BANDS.aman
}

export function bandByCode(code) {
  return BANDS[code] || BANDS.aman
}

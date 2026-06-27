// ============================================================================
// Mode demo — korpus contoh + kemiripan sisi-klien.
//
// Tujuan: agar `npm run dev` langsung menampilkan UI yang HIDUP tanpa backend.
// Kemiripan di sini DISIMULASIKAN (kosinus trigram karakter + Jaccard token),
// BUKAN embedding semantik. Bentuk keluarannya sengaja dibuat sama persis
// dengan respons /check dari app.py (model BARU: judul + abstrak + tahun +
// klaster topik) agar penggantian ke mode LIVE mulus.
//
// Lingkup: SATU jurusan (S1 Ilmu Keperawatan). Tidak ada prodi/penulis — sesuai
// CLAUDE.md §6. Pengganti "prodi" sebagai pewarna peta adalah KLASTER TOPIK yang
// (di mode live) ditemukan otomatis oleh KMeans + dilabeli TF-IDF atas abstrak.
//
// CATATAN DATA: korpus contoh di bawah BERTEMA KEPERAWATAN. Label klaster di sini
// hanyalah fallback demo; di mode LIVE label SELALU dibaca dari kolom cluster_label
// (Supabase) — hasil TF-IDF atas abstrak anggota klaster, BUKAN ditulis manual.
// ============================================================================

import { bandForPercent } from "./bands"

// ── Klaster topik: label kata kunci + warna (peta) + pusat (data UMAP tiruan) ─
// Label sengaja DISKRIMINATIF: kata yang muncul di hampir semua judul keperawatan
// (pasien, perawat, asuhan, rumah sakit…) dibuang agar tiap tema saling beda.
export const CLUSTERS = {
  0: { label: "hipertensi · kepatuhan · tekanan darah", color: "#66101f", center: [-6.4, 3.6] },
  1: { label: "kecemasan · pre operasi · nyeri", color: "#2f7088", center: [-2.6, 6.4] },
  2: { label: "diabetes · ulkus · luka", color: "#b07d2e", center: [5.6, 3.6] },
  3: { label: "asi eksklusif · menyusui · ibu", color: "#5f7d3f", center: [6.6, -1.8] },
  4: { label: "lansia · kualitas hidup · keluarga", color: "#4f6480", center: [-1.4, -5.8] },
  5: { label: "stunting · gizi · balita", color: "#9c4f6b", center: [3.0, -6.2] },
  6: { label: "beban kerja · kinerja · kepuasan", color: "#855a5c", center: [-6.0, -1.2] },
}

const CLUSTER_FALLBACK = "#8a8e91" // Grey Olive — klaster tak dikenal (mode live)

export function clusterColor(cluster) {
  return CLUSTERS[cluster]?.color || CLUSTER_FALLBACK
}
export function clusterLabel(cluster) {
  return CLUSTERS[cluster]?.label || "lainnya"
}

// Bangun peta warna {clusterId: color} dari daftar titik (untuk legenda peta).
// Klaster dikenal memakai warna tetap; klaster tak dikenal mendapat Grey Olive.
export function makeClusterPalette(clusters) {
  const uniq = [...new Set((clusters || []).filter((c) => c !== null && c !== undefined))]
  const map = {}
  for (const c of uniq) map[c] = clusterColor(c)
  return map
}

// ── Korpus contoh KEPERAWATAN — [judul, cluster, tahun, abstrak]. Sebagian sengaja
//    dibuat sebagai parafrase berdekatan agar pengecek menampilkan "sangat mirip". ─
const SEED = [
  // 0 — Penyakit kronis & kepatuhan (hipertensi)
  ["Hubungan Tingkat Pengetahuan dengan Kepatuhan Minum Obat pada Penderita Hipertensi", 0, 2021,
    "Penelitian ini menganalisis hubungan tingkat pengetahuan dengan kepatuhan minum obat antihipertensi; makin baik pengetahuan, makin patuh penderita mengontrol tekanan darah."],
  ["Hubungan Pengetahuan dengan Kepatuhan Konsumsi Obat Antihipertensi di Puskesmas", 0, 2023,
    "Studi korelasi menunjukkan pengetahuan yang baik tentang hipertensi berhubungan dengan kepatuhan konsumsi obat dan keteraturan kontrol tekanan darah."],
  ["Pengaruh Edukasi Kesehatan terhadap Kepatuhan Pengobatan Penderita Hipertensi", 0, 2022,
    "Edukasi kesehatan terbukti meningkatkan kepatuhan pengobatan dan menurunkan tekanan darah pada penderita hipertensi setelah intervensi."],
  ["Faktor-Faktor yang Berhubungan dengan Kepatuhan Diet Rendah Garam pada Penderita Hipertensi", 0, 2020,
    "Pengetahuan, dukungan keluarga, dan motivasi berhubungan dengan kepatuhan menjalani diet rendah garam untuk mengendalikan tekanan darah."],
  ["Hubungan Dukungan Keluarga dengan Kepatuhan Kontrol Tekanan Darah Penderita Hipertensi", 0, 2024,
    "Dukungan keluarga yang tinggi berhubungan dengan kepatuhan kontrol rutin dan kestabilan tekanan darah penderita hipertensi."],
  ["Efektivitas Rebusan Daun Seledri terhadap Penurunan Tekanan Darah Penderita Hipertensi", 0, 2023,
    "Pemberian rebusan daun seledri secara teratur efektif menurunkan tekanan darah sistolik maupun diastolik pada penderita hipertensi."],

  // 1 — Kecemasan & nyeri perioperatif
  ["Pengaruh Teknik Relaksasi Napas Dalam terhadap Tingkat Kecemasan Pasien Pre Operasi", 1, 2022,
    "Teknik relaksasi napas dalam menurunkan tingkat kecemasan pasien yang akan menjalani operasi dibanding sebelum intervensi."],
  ["Pengaruh Relaksasi Napas Dalam terhadap Ansietas Pasien Sebelum Pembedahan", 1, 2024,
    "Latihan napas dalam efektif menurunkan ansietas pasien menjelang pembedahan sehingga pasien lebih tenang menghadapi operasi."],
  ["Pengaruh Terapi Musik terhadap Penurunan Kecemasan Pasien Pre Operatif", 1, 2021,
    "Pemberian terapi musik sebelum operasi menurunkan skor kecemasan pasien dan menstabilkan tanda-tanda vital."],
  ["Efektivitas Teknik Distraksi terhadap Intensitas Nyeri Post Operasi Sectio Caesarea", 1, 2023,
    "Teknik distraksi menurunkan intensitas nyeri pada ibu post sectio caesarea sebagai manajemen nyeri non-farmakologis."],
  ["Hubungan Tingkat Kecemasan dengan Kualitas Tidur Pasien Menjelang Pembedahan", 1, 2020,
    "Tingkat kecemasan yang tinggi berhubungan dengan buruknya kualitas tidur pasien pada malam menjelang pembedahan."],
  ["Pengaruh Kompres Hangat terhadap Penurunan Skala Nyeri Pasien Post Apendektomi", 1, 2022,
    "Kompres hangat menurunkan skala nyeri pasien pasca apendektomi sebagai intervensi manajemen nyeri."],

  // 2 — Diabetes melitus & perawatan luka
  ["Pengaruh Perawatan Luka Modern Dressing terhadap Penyembuhan Ulkus Diabetik", 2, 2022,
    "Modern dressing mempercepat penyembuhan ulkus diabetik dengan menjaga kelembapan luka dibanding teknik konvensional."],
  ["Efektivitas Modern Dressing dalam Penyembuhan Luka Ulkus Kaki Diabetik", 2, 2024,
    "Penggunaan modern dressing efektif mempercepat granulasi dan penyembuhan luka pada kaki penderita diabetes melitus."],
  ["Hubungan Kadar Gula Darah dengan Proses Penyembuhan Luka Diabetes Melitus", 2, 2021,
    "Kadar gula darah yang terkontrol berhubungan dengan proses penyembuhan luka yang lebih cepat pada pasien diabetes melitus."],
  ["Pengaruh Senam Kaki Diabetik terhadap Sensitivitas Kaki Penderita Diabetes Melitus", 2, 2023,
    "Senam kaki diabetik meningkatkan sirkulasi dan sensitivitas kaki sehingga menurunkan risiko ulkus pada penderita diabetes melitus."],
  ["Gambaran Perawatan Kaki pada Penderita Diabetes Melitus Tipe 2", 2, 2020,
    "Studi menggambarkan perilaku perawatan kaki penderita diabetes melitus tipe 2 untuk mencegah komplikasi luka dan ulkus."],
  ["Hubungan Kepatuhan Diet dengan Kadar Glukosa Darah Pasien Diabetes Melitus", 2, 2022,
    "Kepatuhan menjalankan diet berhubungan dengan kestabilan kadar glukosa darah pada pasien diabetes melitus."],

  // 3 — Maternitas & laktasi (ASI)
  ["Hubungan Pengetahuan Ibu dengan Pemberian ASI Eksklusif pada Bayi", 3, 2021,
    "Pengetahuan ibu yang baik berhubungan dengan keberhasilan pemberian ASI eksklusif selama enam bulan pertama bayi."],
  ["Hubungan Pengetahuan Ibu Menyusui dengan Keberhasilan ASI Eksklusif", 3, 2023,
    "Tingkat pengetahuan ibu menyusui berhubungan signifikan dengan keberhasilan pemberian ASI eksklusif pada bayi."],
  ["Pengaruh Pijat Oksitosin terhadap Produksi ASI pada Ibu Postpartum", 3, 2022,
    "Pijat oksitosin merangsang refleks let-down sehingga meningkatkan produksi ASI pada ibu postpartum."],
  ["Faktor yang Memengaruhi Kejadian Depresi Postpartum pada Ibu Primipara", 3, 2024,
    "Dukungan suami, kesiapan peran, dan kondisi ekonomi memengaruhi kejadian depresi postpartum pada ibu primipara."],
  ["Hubungan Inisiasi Menyusu Dini dengan Kelancaran Produksi ASI Ibu Nifas", 3, 2020,
    "Inisiasi menyusu dini berhubungan dengan kelancaran produksi ASI dan keberhasilan menyusui pada ibu nifas."],
  ["Pengaruh Perawatan Payudara terhadap Kelancaran Pengeluaran ASI Ibu Nifas", 3, 2022,
    "Perawatan payudara yang teratur meningkatkan kelancaran pengeluaran ASI pada ibu nifas pasca melahirkan."],

  // 4 — Gerontik & kualitas hidup (lansia)
  ["Hubungan Dukungan Keluarga dengan Kualitas Hidup Lansia di Panti Werdha", 4, 2021,
    "Dukungan keluarga yang tinggi berhubungan dengan kualitas hidup yang lebih baik pada lansia yang tinggal di panti werdha."],
  ["Hubungan Dukungan Keluarga dengan Kualitas Hidup pada Lanjut Usia", 4, 2023,
    "Semakin besar dukungan keluarga, semakin baik kualitas hidup lanjut usia dalam aspek fisik maupun psikologis."],
  ["Hubungan Tingkat Kemandirian dengan Kualitas Hidup Lansia Penderita Rematik", 4, 2022,
    "Tingkat kemandirian dalam aktivitas sehari-hari berhubungan dengan kualitas hidup lansia yang menderita rematik."],
  ["Gambaran Tingkat Depresi pada Lansia yang Tinggal di Panti Sosial", 4, 2020,
    "Studi menggambarkan tingkat depresi pada lansia di panti sosial yang dipengaruhi kesepian dan minimnya kunjungan keluarga."],
  ["Pengaruh Senam Lansia terhadap Kualitas Tidur pada Lanjut Usia", 4, 2024,
    "Senam lansia yang dilakukan rutin meningkatkan kualitas tidur lanjut usia dan menurunkan keluhan insomnia."],
  ["Hubungan Aktivitas Fisik dengan Risiko Jatuh pada Lansia", 4, 2022,
    "Aktivitas fisik yang baik berhubungan dengan menurunnya risiko jatuh pada lansia melalui peningkatan keseimbangan tubuh."],

  // 5 — Kesehatan anak & gizi (stunting)
  ["Hubungan Pola Asuh dengan Kejadian Stunting pada Balita", 5, 2021,
    "Pola asuh dan praktik pemberian makan berhubungan dengan kejadian stunting pada balita di wilayah penelitian."],
  ["Hubungan Pola Asuh Ibu dengan Kejadian Stunting pada Anak Balita", 5, 2023,
    "Pola asuh ibu yang kurang tepat berhubungan dengan tingginya kejadian stunting pada anak balita."],
  ["Hubungan Status Gizi dengan Perkembangan Motorik Anak Usia Prasekolah", 5, 2022,
    "Status gizi anak berhubungan dengan pencapaian perkembangan motorik kasar dan halus pada usia prasekolah."],
  ["Faktor yang Berhubungan dengan Kejadian Diare pada Balita", 5, 2020,
    "Higiene, ketersediaan air bersih, dan perilaku cuci tangan berhubungan dengan kejadian diare pada balita."],
  ["Pengaruh Pemberian MP-ASI terhadap Status Gizi Bayi Usia 6-12 Bulan", 5, 2024,
    "Pemberian MP-ASI yang tepat meningkatkan status gizi bayi usia 6-12 bulan berdasarkan indikator berat badan."],
  ["Hubungan Pengetahuan Ibu tentang Imunisasi dengan Kelengkapan Imunisasi Dasar Balita", 5, 2022,
    "Pengetahuan ibu tentang imunisasi berhubungan dengan kelengkapan imunisasi dasar pada balita."],

  // 6 — Manajemen & kinerja perawat
  ["Hubungan Beban Kerja dengan Kinerja Perawat di Ruang Rawat Inap", 6, 2021,
    "Beban kerja yang tinggi berhubungan dengan menurunnya kinerja perawat dalam memberikan pelayanan di ruang rawat inap."],
  ["Hubungan Beban Kerja Perawat dengan Kinerja Pelayanan di Bangsal", 6, 2023,
    "Tingginya beban kerja berhubungan dengan kinerja pelayanan perawat yang menurun di bangsal."],
  ["Hubungan Motivasi Kerja dengan Kinerja Perawat Pelaksana", 6, 2022,
    "Motivasi kerja yang tinggi berhubungan dengan kinerja perawat pelaksana yang lebih optimal."],
  ["Hubungan Komunikasi Terapeutik dengan Tingkat Kepuasan Pasien Rawat Inap", 6, 2020,
    "Penerapan komunikasi terapeutik yang baik berhubungan dengan tingginya tingkat kepuasan pasien rawat inap."],
  ["Hubungan Beban Kerja dengan Tingkat Stres Kerja Perawat", 6, 2024,
    "Beban kerja yang berat berhubungan dengan meningkatnya tingkat stres kerja pada perawat."],
  ["Hubungan Penerapan Patient Safety dengan Kepuasan Pasien Rawat Inap", 6, 2022,
    "Penerapan budaya patient safety berhubungan dengan peningkatan kepuasan pasien selama menjalani rawat inap."],
]

// PRNG deterministik (mulberry32) — agar koordinat stabil tiap muat.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rng) {
  // Box-Muller
  let u = 0,
    v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function round(n) {
  return Math.round(n * 1000) / 1000
}

// ── Bangun korpus: id, koordinat 2D berklaster per topik, label klaster ──────
export const CORPUS = (() => {
  const rng = mulberry32(20260616)
  return SEED.map(([title, cluster, year, abstract], i) => {
    const c = CLUSTERS[cluster].center
    const x = c[0] + gaussian(rng) * 1.3
    const y = c[1] + gaussian(rng) * 1.3
    return {
      id: i + 1,
      title,
      abstract,
      year,
      cluster,
      cluster_label: CLUSTERS[cluster].label,
      x: round(x),
      y: round(y),
    }
  })
})()

// ── Kemiripan tiruan (string) ───────────────────────────────────────────────
function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const STOP = new Set(["dan", "yang", "untuk", "pada", "di", "ke", "dari", "dengan", "atau", "terhadap", "dalam", "the", "of"])

function tokens(s) {
  return normalize(s)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
}

function trigrams(s) {
  const t = ` ${normalize(s)} `
  const g = new Map()
  for (let i = 0; i < t.length - 2; i++) {
    const k = t.slice(i, i + 3)
    g.set(k, (g.get(k) || 0) + 1)
  }
  return g
}

function cosine(a, b) {
  let dot = 0,
    na = 0,
    nb = 0
  for (const v of a.values()) na += v * v
  for (const v of b.values()) nb += v * v
  for (const [k, v] of a) if (b.has(k)) dot += v * b.get(k)
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}

function jaccard(a, b) {
  const A = new Set(a),
    B = new Set(b)
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  const uni = A.size + B.size - inter
  return uni ? inter / uni : 0
}

// Praproses korpus sekali (judul saja — Aturan C: abstrak TIDAK untuk pencarian).
const PREP = CORPUS.map((row) => ({ row, tri: trigrams(row.title), tok: tokens(row.title) }))

function simScore(qTri, qTok, p) {
  const raw = Math.max(0, Math.min(1, 0.58 * cosine(qTri, p.tri) + 0.42 * jaccard(qTok, p.tok)))
  // Kalibrasi ringan (monoton, 0->0, 1->1): kemiripan STRING cenderung lebih
  // rendah daripada kemiripan EMBEDDING semantik. Kurva ini mengangkat rentang
  // menengah-tinggi agar parafrase jelas masuk band "mirip"/"sangat mirip" —
  // mendekati perilaku mode live, tanpa mengubah urutan peringkat.
  return 1.5 * raw - 0.5 * raw * raw
}

// ── Tiruan endpoint /check (bentuk respons sama dengan app.py) ──────────────
export function mockCheck(title, k = 10) {
  const q = String(title || "").trim()
  const qTri = trigrams(q)
  const qTok = tokens(q)

  const scored = PREP.map((p) => ({ p, sim: simScore(qTri, qTok, p) })).sort((a, b) => b.sim - a.sim)

  const matches = scored.slice(0, k).map(({ p, sim }) => {
    const percent = Math.round(sim * 1000) / 10
    const band = bandForPercent(percent)
    return {
      id: p.row.id,
      title: p.row.title,
      abstract: p.row.abstract,
      year: p.row.year,
      cluster: p.row.cluster,
      cluster_label: p.row.cluster_label,
      similarity: sim,
      percent,
      category: band.code,
      category_label: `${band.label} — ${band.hint}`,
      x: p.row.x,
      y: p.row.y,
    }
  })

  // Perkiraan posisi query di peta: centroid berbobot dari tetangga teratas.
  const top = scored.slice(0, 3).filter((s) => s.sim > 0.02)
  let coord = null
  if (top.length) {
    const w = top.reduce((s, t) => s + (t.sim + 0.05), 0)
    coord = {
      x: round(top.reduce((s, t) => s + t.p.row.x * (t.sim + 0.05), 0) / w),
      y: round(top.reduce((s, t) => s + t.p.row.y * (t.sim + 0.05), 0) / w),
    }
  }

  return { query: q, matches, top: matches[0] || null, coord }
}

// ── Abstrak satu judul (tiruan query by id, dipakai saat klik titik peta) ────
export function abstractById(id) {
  return CORPUS.find((r) => r.id === id)?.abstract ?? null
}

// ── Tiruan data peta (sama dengan view theses_map) ──────────────────────────
export function mockMap() {
  return CORPUS.map(({ id, title, year, x, y, cluster, cluster_label }) => ({
    id,
    title,
    year,
    x,
    y,
    cluster,
    cluster_label,
  }))
}

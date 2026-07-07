/**
 * Serupa — analitik subbidang berbasis KATA KUNCI atas korpus nyata (FA5/FA6).
 *
 * Bukan klaster embedding. Tiap skripsi dicocokkan ke satu/lebih subbidang lewat
 * kata kunci pada judul+abstrak, lalu dihitung kepadatan (saturasi) & tren antar
 * tahun. Angkanya NYATA (dihitung dari tabel `theses`), namun sifatnya perkiraan
 * rule-based: skripsi yang temanya tak tercakup daftar kata kunci tidak terhitung.
 *
 * Menggantikan data contoh lama (src/data/sampleAnalytics.js). Bila kelak modul
 * klaster embedding tersedia, cukup ganti buildTopicAnalytics() sumbernya.
 */

// Palet kategori CVD-safe (dataviz) — dipetakan ke seri tren sesuai peringkat.
const PALETTE = ['#1BAF7A', '#EB6834', '#2A78D6', '#4A3AA7', '#EDA100']

/**
 * Taksonomi subbidang keperawatan (FIK UNISSULA). Urutan tidak memengaruhi hasil
 * (multi-label). Kata kunci dicocokkan sebagai substring pada teks ber-spasi.
 */
export const TOPIC_DEFS = [
  { key: 'maternitas', label: 'Maternitas & Persalinan', kw: ['hamil', 'kehamilan', 'persalinan', 'nifas', 'postpartum', 'laktasi', 'menyusui', ' asi ', 'bblr', 'neonat', 'partum', 'kontrasepsi', 'antenatal', 'preeklamp', 'sectio', 'secsio', ' sc ', 'ketuban'] },
  { key: 'anak', label: 'Kesehatan Anak & Tumbuh Kembang', kw: ['balita', 'anak usia', 'tumbuh kembang', 'prestasi belajar', 'siswa', 'preschool', 'prasekolah', 'toddler', 'stunting', 'imunisasi', 'diare', 'pola asuh', 'remaja', 'sekolah'] },
  { key: 'jiwa', label: 'Kesehatan Jiwa', kw: ['jiwa', 'halusinasi', 'skizofren', 'depresi', 'ansietas', 'kecemasan', 'harga diri rendah', 'isolasi sosial', 'perilaku kekerasan', 'waham'] },
  { key: 'diabetes', label: 'Diabetes Melitus', kw: ['diabet', 'gula darah', 'glukosa', 'hiperglikem'] },
  { key: 'kardio', label: 'Hipertensi & Kardiovaskular', kw: ['hipertensi', 'tekanan darah', 'jantung', 'kardio', 'stroke', 'koroner', 'chf', 'heart failure'] },
  { key: 'respirasi', label: 'Gangguan Pernapasan', kw: ['asma', 'ispa', 'ppok', 'paru', 'pneumonia', 'tb paru', 'tuberkulosis', 'copd', 'sesak', 'batuk'] },
  { key: 'kronik', label: 'Penyakit Kronik & Terminal', kw: ['ginjal', 'hemodialis', 'kanker', 'kemoterapi', 'hiv', 'paliatif', 'terminal', 'kronik', 'hepatitis', 'sirosis'] },
  { key: 'bedah', label: 'Bedah & Muskuloskeletal', kw: ['fraktur', 'post op', 'pre operasi', 'pre operatif', 'bedah', 'apendik', 'appendic', 'hernia', 'luka', 'amputasi', 'ortopedi'] },
  { key: 'gadar', label: 'Gawat Darurat & Kritis', kw: ['gawat darurat', 'igd', 'instalasi gawat', 'kritis', 'icu', 'triase', 'resusitasi', 'kegawat', 'bencana', 'dengue shock', 'dss'] },
  { key: 'infeksi', label: 'Patient Safety & Infeksi', kw: ['cuci tangan', 'hand hygiene', 'keselamatan pasien', 'patient safety', 'infeksi', 'nosokomial', 'sterilisasi', 'jatuh', 'apd'] },
  { key: 'nyeri', label: 'Manajemen Nyeri', kw: ['nyeri', 'relaksasi', 'distraksi', 'kompres', 'murottal', 'aromaterapi'] },
  { key: 'komunitas', label: 'Komunitas & Lansia', kw: ['komunitas', 'masyarakat', 'posyandu', 'lansia', 'phbs', 'kader', 'merokok', 'leptospirosis'] },
  { key: 'gizi', label: 'Gizi & Nutrisi', kw: ['gizi', 'nutrisi', 'malnutrisi', 'nafsu makan', 'makanan'] },
  { key: 'mutu', label: 'Manajemen & Mutu Pelayanan', kw: ['kinerja perawat', 'beban kerja', 'motivasi kerja', 'kepuasan', 'mutu pelayanan', 'caring', 'burnout', 'stres kerja', 'supervisi', 'komunikasi terapeutik', 'dokumentasi asuhan'] },
  { key: 'digital', label: 'Telenursing & Kesehatan Digital', kw: ['telenursing', 'aplikasi', 'media video', 'e-health', 'sistem informasi', 'smartphone', 'facebook', 'media sosial'] },
]

/** Kembalikan daftar key subbidang yang cocok untuk satu skripsi (bisa >1). */
export function classifyThesis(title, abstract) {
  const t = ' ' + `${title || ''} ${abstract || ''}`.toLowerCase() + ' '
  return TOPIC_DEFS.filter((o) => o.kw.some((k) => t.includes(k))).map((o) => o.key)
}

/**
 * Hitung saturasi & tren dari daftar record korpus ({ title, abstract, year }).
 * @returns {{ saturationMap: Array, topicTrends: Object, matchedPct: number, coveredYears: number[] }}
 */
export function buildTopicAnalytics(items) {
  const count = {}
  const perYear = {}
  TOPIC_DEFS.forEach((t) => {
    count[t.key] = 0
    perYear[t.key] = {}
  })
  const yearsSet = new Set()
  let matched = 0
  const list = items || []

  for (const it of list) {
    const y = Number(it.year)
    const validYear = Number.isFinite(y) && y >= 1990 && y <= 2100
    if (validYear) yearsSet.add(y)
    const keys = classifyThesis(it.title, it.abstract)
    if (keys.length) matched++
    for (const k of keys) {
      count[k]++
      if (validYear) perYear[k][y] = (perYear[k][y] || 0) + 1
    }
  }

  const max = Math.max(1, ...Object.values(count))
  const levelOf = (c) => (c >= 0.5 * max ? 'padat' : c >= 0.2 * max ? 'sedang' : 'jarang')

  const saturationMap = TOPIC_DEFS.map((t) => ({
    topic: t.label,
    key: t.key,
    count: count[t.key],
    level: levelOf(count[t.key]),
  }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)

  // Tren: tampilkan 8 tahun terakhir yang ada datanya, seri = 5 subbidang teratas.
  const years = [...yearsSet].sort((a, b) => a - b).slice(-8)
  const series = saturationMap.slice(0, 5).map((d, i) => ({
    key: d.key,
    label: d.topic,
    color: PALETTE[i % PALETTE.length],
    values: years.map((y) => perYear[d.key][y] || 0),
  }))

  return {
    saturationMap,
    topicTrends: { years, series },
    matchedPct: list.length ? Math.round((matched / list.length) * 100) : 0,
    coveredYears: years,
  }
}

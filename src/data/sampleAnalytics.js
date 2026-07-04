/**
 * Serupa — data analitik CONTOH untuk panel "Saturasi Subbidang" & "Tren Topik"
 * (FA5/FA6, PRD §10).
 *
 * ⚠️ Ini bukan data live. Peta saturasi & tren topik memerlukan modul analisis
 * KLASTER EMBEDDING batch atas korpus (mengelompokkan skripsi berdasarkan
 * kedekatan makna, lalu menghitung kepadatan per klaster antar tahun). Modul itu
 * BELUM tersedia sebagai endpoint backend — berbeda dari /api/scan yang meng-embed
 * satu query. Sampai modul tersebut ada, kedua panel memakai angka ilustratif di
 * bawah ini dan ditandai "contoh" di UI. Statistik korpus lain (jumlah record,
 * kelengkapan abstrak, distribusi tahun) SUDAH live via RPC corpus_stats().
 */

/** Tren topik antar tahun (contoh). Jumlah skripsi per klaster tema per tahun. */
export const topicTrends = {
  years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
  // Warna kategori: palet validasi CVD-safe (dataviz), urutan tetap per entitas.
  series: [
    { key: 'kesehatan-jiwa', label: 'Kesehatan Jiwa', color: '#1BAF7A', values: [8, 11, 13, 15, 18, 24, 27, 22] },
    { key: 'maternitas', label: 'Maternitas & Anak', color: '#EB6834', values: [22, 24, 21, 20, 18, 17, 19, 15] },
    { key: 'penyakit-kronik', label: 'Penyakit Kronik', color: '#2A78D6', values: [15, 17, 18, 19, 21, 20, 23, 18] },
    { key: 'gawat-darurat', label: 'Gawat Darurat', color: '#4A3AA7', values: [6, 7, 9, 8, 11, 10, 12, 9] },
    { key: 'komunitas', label: 'Keperawatan Komunitas', color: '#EDA100', values: [12, 13, 14, 16, 20, 19, 21, 17] },
  ],
}

/** Peta saturasi subbidang (contoh — Tier 1 teaser). */
export const saturationMap = [
  { topic: 'Hipertensi & Penyakit Kardiovaskular', count: 186, level: 'padat' },
  { topic: 'Diabetes Melitus', count: 143, level: 'padat' },
  { topic: 'ASI & Gizi Balita', count: 121, level: 'padat' },
  { topic: 'Manajemen Nyeri Pasca Operasi', count: 98, level: 'sedang' },
  { topic: 'Hand Hygiene & Patient Safety', count: 74, level: 'sedang' },
  { topic: 'Kesehatan Jiwa / Halusinasi', count: 63, level: 'sedang' },
  { topic: 'Perawatan Paliatif', count: 24, level: 'jarang' },
  { topic: 'Telenursing & Kesehatan Digital', count: 11, level: 'jarang' },
  { topic: 'Keperawatan Bencana', count: 8, level: 'jarang' },
]

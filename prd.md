# PRD — Serupa

**Sistem Analisis Kemiripan Judul Skripsi**
Fakultas Ilmu Keperawatan (FIK) UNISSULA

| | |
|---|---|
| Versi | 0.2 (draft) |
| Status | Perancangan — prioritas frontend |
| Tech stack | Vue.js · Supabase (Postgres + pgvector) · Vercel · Hugging Face (model embedding) |
| Sumber data | Repository UNISSULA (hasil scraping, `Corpus.csv`, ±2000 record: judul + penulis + abstrak + tahun) |
| Font | Lato |
| Warna utama | `#79AEA3` |

---

## 1. Ringkasan Produk

Serupa membantu mahasiswa FIK UNISSULA mengevaluasi apakah rencana topik skripsi mereka tumpang tindih dengan penelitian yang sudah ada di repository UNISSULA. Analisis dilakukan dengan **kemiripan semantik (embedding)** — mengukur kedekatan makna, bukan sekadar mencocokkan kata.

**Framing produk (keputusan desain, bukan detail teknis): Serupa adalah alat bantu keputusan, bukan gerbang otomatis.** Sistem menyajikan bukti — skor kemiripan dan penelitian termirip beserta abstraknya — lalu mahasiswa dan pembimbing yang menilai apakah topik benar-benar bentrok. Sistem tidak pernah memvonis "duplikat" atau "ditolak" sendiri.

Alasan framing ini penting: tidak ada satu angka kemiripan pun yang secara defensibel berarti "topik sudah pernah diteliti". Dua skripsi bisa punya kemiripan tekstual tinggi tetapi merupakan penelitian yang sah-sah berbeda (populasi/lokasi/desain berbeda), dan sebaliknya. Karena itu keputusan akhir dikembalikan ke manusia, dan fitur threshold pemblokir dihapus (lihat D1).

---

## 2. Tujuan & Non-Tujuan

### Tujuan
- Mendeteksi kemiripan semantik antara rencana topik mahasiswa dan korpus ±2000 skripsi.
- Menyajikan hasil yang **dapat dinilai manusia**: skor + penelitian pembanding + abstrak.
- Memberi admin visibilitas terhadap tren dan saturasi topik antar tahun.

### Non-Tujuan (eksplisit — untuk membatasi klaim & scope)
- **Bukan deteksi plagiarisme** (bukan Turnitin). Serupa mengukur kemiripan topik/ide, bukan kesamaan kalimat/parafrase kata-per-kata.
- **Bukan vonis otomatis.** Tidak ada threshold yang memblokir atau menolak topik.
- **Bukan multi-fakultas.** Khusus FIK UNISSULA. Domain sempit ini disengaja karena memperbaiki kualitas embedding dan mengurangi ambiguitas.
- **Bukan sistem approval/workflow.** Serupa tidak menggantikan proses persetujuan judul oleh koordinator/pembimbing.

---

## 3. Prioritas Pengerjaan & Pembagian Tanggung Jawab

PRD ini memprioritaskan **frontend terlebih dahulu**. Pekerjaan backend (pipeline embedding, database, implementasi autentikasi, dan logika pencocokan) dikerjakan terpisah oleh penulis.

Konsekuensi untuk cara frontend dibangun:
- Frontend dibangun di atas **mock/stub data dengan bentuk yang realistis** — skor yang masuk akal, abstrak asli, jumlah hasil yang wajar — supaya tata letak tidak rusak saat integrasi backend nyata dilakukan.
- **Kontrak data frontend–backend didefinisikan lebih dulu** (lihat §11) agar integrasi rapi. Frontend cukup mengonsumsi bentuk respons yang disepakati, terlepas dari bagaimana backend menghasilkannya.
- Halaman yang bergantung pada backend (hasil scan, riwayat, dashboard) tetap dirancang penuh, tetapi diisi data contoh sampai endpoint tersedia.

---

## 4. Keputusan Desain Kunci & Asumsi

Bagian ini mencatat keputusan secara terbuka, termasuk yang masih perlu divalidasi. Ini penting agar klaim produk tidak melebihi apa yang metodenya bisa dukung.

### Keputusan yang sudah final
| ID | Keputusan | Alasan |
|----|-----------|--------|
| D1 | **Fitur manajemen threshold DIHAPUS.** | Tanpa data berlabel, tidak ada cosine threshold tunggal yang secara defensibel berarti "duplikat". Angka arbitrer = titik lemah yang mudah dibantah saat sidang. |
| D2 | **Output: skor lebih dulu, lalu penjelasan.** Skor disajikan sebagai **pita kategori + 2 desimal**, bukan float presisi-penuh. | Sesuai preferensi (angka dulu). Banding menjaga kejujuran: selisih 0.82 vs 0.81 tidak bermakna, sehingga angka tidak diam-diam berubah menjadi vonis. |
| D3 | **Korpus lengkap** (judul + penulis + abstrak + tahun), ±2000 record. | Abstrak memberi sinyal semantik yang cukup untuk membedakan penelitian — bukan sekadar judul formulaik. |
| D6 | **Login menggunakan NIM + Password.** | Identitas yang dikenal mahasiswa. Catatan implementasi di §8. |

### Keputusan yang dibuat di PRD ini — wajib divalidasi empiris
| ID | Keputusan | Catatan risiko |
|----|-----------|----------------|
| D4 | **Penanganan asimetri query–dokumen.** Default: mahasiswa menginput **judul + ringkasan rencana (2–4 kalimat)** agar teks query setara kekayaannya dengan abstrak korpus. Fallback: model retrieval asimetris (mis. keluarga multilingual-e5 dengan prefix `query:` / `passage:`). | **Risiko teknis utama.** Bila korpus di-embed dari (judul+abstrak) tapi query hanya judul, sebagian jarak vektor didorong perbedaan panjang teks, bukan makna. Harus diuji sebelum dianggap beres. |
| D5 | **Model embedding: TBD.** Kandidat: model multilingual yang menangani teks medis Indonesia. | "Bisa memahami makna" adalah klaim empiris, bukan asumsi. Uji ≥2 kandidat pada pasangan judul yang sudah diketahui mirip/tidak. |

### Asumsi yang harus diverifikasi
- Abstrak tersedia dan konsisten di **mayoritas** record `Corpus.csv` (bukan sebagian kecil).
- Kualitas embedding cukup untuk **memisahkan** topik keperawatan berbahasa Indonesia (bukan menganggap semua judul mirip karena strukturnya seragam).
- Data scraping repository tidak melanggar ketentuan penggunaan / aspek etik.

---

## 5. Pengguna & Peran

| Peran | Siapa | Kebutuhan utama |
|-------|-------|-----------------|
| **Pengunjung** | Siapa saja yang membuka halaman sebelum login | Memahami apa itu Serupa dan cara kerjanya, lalu masuk |
| **Mahasiswa** | Mahasiswa FIK UNISSULA yang sedang menyusun proposal | Cek rencana topik, lihat penelitian termirip, simpan riwayat |
| **Admin** | Koordinator skripsi / dosen pengelola | Kelola korpus, unggah data, lihat analitik & tren, (opsional) melabeli data untuk evaluasi |

---

## 6. Kebutuhan Fungsional

### 6.1 Halaman Landing (Publik) — halaman pertama sebelum login

Halaman perkenalan yang dilihat pengunjung saat pertama membuka Serupa. Tujuannya: menjelaskan produk, menegaskan posisinya sebagai alat bantu, dan mengarahkan ke login. Blok dari atas ke bawah:

| ID | Blok | Isi |
|----|------|-----|
| FL1 | Navbar | Logo "Serupa", tautan ringkas (Cara Kerja, Tentang), tombol **Masuk**. |
| FL2 | Hero | Judul + subjudul (apa & untuk siapa). CTA primer **Masuk dengan NIM**; CTA sekunder **Lihat Cara Kerja** (scroll ke bawah). Visual pendukung / ilustrasi. |
| FL3 | Apa itu Serupa | Satu paragraf ringkas + penegasan framing: alat bantu keputusan, bukan vonis. |
| FL4 | Cara Kerja (3 langkah) | 1) Masukkan rencana topik (judul + ringkasan). 2) Sistem mencari kemiripan makna dari ±2000 skripsi. 3) Tinjau penelitian termirip beserta abstraknya, lalu nilai bersama pembimbing. |
| FL5 | Contoh Hasil (demo statis) | Satu kartu hasil contoh (skor + judul + penulis + tahun + abstrak). **Menggantikan "coba fitur" langsung**, karena scan asli membutuhkan login + menyimpan riwayat. |
| FL6 | Batasan & posisi | Penegasan singkat: bukan alat plagiarisme, bukan pengganti keputusan pembimbing. |
| FL7 | CTA akhir | Ajakan **Masuk untuk mulai**. |
| FL8 | Footer | FIK UNISSULA, tahun, tautan terkait. |

Catatan: **tidak ada scan tamu (guest scan)**. Scan memerlukan model, korpus, dan penyimpanan riwayat yang terikat ke akun, sehingga percobaan tanpa login diwakili oleh contoh statis (FL5).

### 6.2 Mahasiswa

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| FM1 | Autentikasi | Login via **NIM + Password** (lihat catatan implementasi §8). Batasi akses ke mahasiswa terdaftar. |
| FM2 | Input rencana topik | **Judul (wajib)** + **ringkasan rencana 2–4 kalimat (wajib, untuk mengatasi asimetri D4)**. Opsional: field PICO terstruktur (Populasi, Intervensi, Pembanding, Outcome, Setting). |
| FM3 | Hasil scan | Daftar Top-N (default 5) penelitian termirip, urut skor. Format tiap item mengikuti §11: **skor (pita + angka) → judul → penulis → tahun → abstrak.** |
| FM4 | Riwayat scan | Setiap scan tersimpan dan bisa dibuka kembali beserta hasilnya. |
| FM5 | Perbandingan PICO *(enhancement)* | Sandingkan PICO usulan mahasiswa vs penelitian termirip, berdampingan. |
| FM6 | Ekspor laporan PDF *(enhancement)* | Artefak yang bisa dibawa mahasiswa ke pembimbing. |

### 6.3 Admin

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| FA1 | Autentikasi + otorisasi | Login + role `admin`. |
| FA2 | Unggah judul baru | Manual (form) **atau** batch CSV/Excel. Saat batch: validasi kolom, deteksi duplikat dalam korpus, laporan baris gagal. |
| FA3 | Daftar judul korpus | Tabel judul + penulis + abstrak + tahun. Dapat dicari, disunting, dihapus. |
| FA4 | Dashboard analisis | Jumlah record, distribusi tahun, **kualitas data** (persen record ber-abstrak, tahun hilang/janggal). |
| FA5 | Visualisasi tren topik | Tren topik dari tahun ke tahun. |
| FA6 | Peta saturasi topik *(Tier 1)* | Klustering embedding korpus → subbidang padat vs jarang. Mengubah alat dari reaktif jadi proaktif ("tunjukkan celah riset"). |
| FA7 | Antarmuka pelabelan *(Tier 1)* | Dosen melabeli pasangan judul **duplikat / tidak / borderline**. Membangun test set untuk evaluasi (§10 evaluasi). |
| — | ~~Manajemen threshold~~ | **Dihapus (D1).** |

---

## 7. Design System — Warna & Tipografi

### 7.1 Palet Warna

**Catatan desain (penting):** `#79AEA3` adalah teal yang *muted* (saturasi ± 25%), sehingga tidak bisa membawa kesan "cerah/vibrant" sendirian. Kesan cerah dicapai lewat **tint terang + ruang putih + satu aksen hangat**, bukan menaikkan saturasi (yang justru menurunkan kesan kredibel untuk aplikasi akademik/kesehatan).

**Catatan aksesibilitas (penting):** `#79AEA3` memiliki rasio kontras hanya ± 2.5:1 di atas putih — **gagal** ambang WCAG AA untuk teks (4.5:1). Gunakan `#79AEA3` hanya untuk fill/latar/aksen besar. Untuk teks, tautan, dan tombol berteks putih, gunakan varian gelap `#3E7268` (± 6:1, lolos AA).

#### Warna merek (teal)
| Token | Hex | Penggunaan | Aman untuk teks di atas putih? |
|-------|-----|-----------|-------------------------------|
| `primary-050` | `#EDF6F3` | Latar section paling terang | — (latar) |
| `primary-100` | `#D8EAE5` | Latar kartu, chip, badge lembut | — (latar) |
| `primary-200` | `#B9D6CF` | Garis/pembatas dalam keluarga merek | Tidak |
| `primary-300` | `#9BC4BB` | Ilustrasi, state hover ringan | Tidak |
| `primary` (merek) | `#79AEA3` | Fill utama, aksen besar, header hero | Tidak |
| `primary-600` | `#5E9488` | Hover pada fill merek | Marginal |
| `primary-700` | `#3E7268` | **Teks/tautan, tombol primer (teks putih)** | Ya (± 6:1) |
| `primary-800` | `#2C5249` | Judul, teks penekanan kuat | Ya |

#### Aksen hangat (pemberi kesan "cerah")
| Token | Hex | Penggunaan |
|-------|-----|-----------|
| `accent` | `#F4A261` | Highlight, CTA sekunder, penanda aktif |
| `accent-600` | `#E08A45` | Hover aksen |
| `accent-050` | `#FDEFDD` | Latar lembut aksen |

#### Warna semantik (validasi form, notifikasi)
| Token | Teks/ikon | Latar |
|-------|-----------|-------|
| `success` | `#2F8F5B` | `#E4F3EA` |
| `warning` | `#B7791F` | `#FBF0DA` |
| `danger` | `#C0453A` | `#F8E4E1` |
| `info` | `#3E7CA8` | `#E3EFF6` |

#### Netral
| Token | Hex | Penggunaan |
|-------|-----|-----------|
| `text` | `#24302E` | Teks utama |
| `text-muted` | `#5B6764` | Teks sekunder |
| `text-subtle` | `#869390` | Placeholder, caption |
| `border` | `#E2E9E7` | Garis, pembatas |
| `surface` | `#FFFFFF` | Permukaan kartu |
| `background` | `#F6FAF9` | Latar halaman |

#### Pita kemiripan (untuk hasil scan)
Selaras dengan D1 (bukan vonis): **hindari warna merah** agar "kemiripan tinggi" tidak terbaca sebagai "ditolak". Tinggi berarti "tinjau lebih teliti", bukan penolakan.

| Pita | Arti | Teks | Latar |
|------|------|------|-------|
| Rendah | Kemiripan rendah, relatif aman | `#2F8F5B` | `#E4F3EA` |
| Sedang | Perlu dilihat | `#B7791F` | `#FBF0DA` |
| Tinggi | Perlu ditinjau teliti (bukan ditolak) | `#9A5B14` | `#F5E2C4` |

### 7.2 Tipografi — Lato

Impor Lato dari Google Fonts (weight 300, 400, 700, 900). Fallback: `-apple-system, "Segoe UI", Roboto, sans-serif`.

| Token | Ukuran | Weight | Penggunaan |
|-------|--------|--------|-----------|
| `text-display` | 48px | 900 | Judul hero landing |
| `text-3xl` | 36px | 700 | Judul halaman (H1) |
| `text-2xl` | 28px | 700 | Judul section (H2) |
| `text-xl` | 22px | 700 | Sub-section (H3) |
| `text-lg` | 18px | 700 / 400 | Judul kartu / paragraf besar |
| `text-base` | 16px | 400 | Teks isi |
| `text-sm` | 14px | 400 | Teks sekunder, caption |
| `text-xs` | 12px | 700 | Label (boleh uppercase, letter-spacing +0.04em) |

Aturan: `line-height` judul 1.2, teks isi 1.6. `letter-spacing` sedikit negatif (-0.01em) pada display besar; normal pada isi.

### 7.3 Token siap pakai (CSS variables untuk Vue)

```css
:root {
  /* Merek */
  --color-primary-050: #EDF6F3;
  --color-primary-100: #D8EAE5;
  --color-primary-200: #B9D6CF;
  --color-primary-300: #9BC4BB;
  --color-primary:     #79AEA3;
  --color-primary-600: #5E9488;
  --color-primary-700: #3E7268; /* teks/tombol aman */
  --color-primary-800: #2C5249;

  /* Aksen */
  --color-accent:      #F4A261;
  --color-accent-600:  #E08A45;
  --color-accent-050:  #FDEFDD;

  /* Semantik */
  --color-success: #2F8F5B; --color-success-bg: #E4F3EA;
  --color-warning: #B7791F; --color-warning-bg: #FBF0DA;
  --color-danger:  #C0453A; --color-danger-bg:  #F8E4E1;
  --color-info:    #3E7CA8; --color-info-bg:    #E3EFF6;

  /* Netral */
  --color-text:        #24302E;
  --color-text-muted:  #5B6764;
  --color-text-subtle: #869390;
  --color-border:      #E2E9E7;
  --color-surface:     #FFFFFF;
  --color-background:  #F6FAF9;

  /* Tipografi */
  --font-family-base: 'Lato', -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-bold: 700;
  --font-weight-black: 900;

  --text-xs: 12px; --text-sm: 14px; --text-base: 16px; --text-lg: 18px;
  --text-xl: 22px; --text-2xl: 28px; --text-3xl: 36px; --text-display: 48px;

  --leading-tight: 1.2;
  --leading-normal: 1.6;

  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px;
}
```

---

## 8. Arsitektur Sistem

```
[ Vue.js SPA (Vercel) ]
        |  HTTPS
        v
[ Vercel Serverless Functions ]  -- orchestration / API
        |                    |
        | (embed query)      | (query & tulis data)
        v                    v
[ Hugging Face          [ Supabase ]
  Inference Endpoint ]    - Postgres + pgvector
  - model embedding       - Auth
                          - Row Level Security
```

- **Frontend:** Vue.js (SPA), di-host di Vercel.
- **Orchestration:** Vercel Serverless Functions memanggil HF untuk embedding dan Supabase untuk data. Kunci HF/Supabase disimpan di server, tidak di frontend.
- **Database:** Supabase (Postgres) dengan ekstensi **pgvector**.
- **Model embedding:** di-host di Hugging Face (Inference Endpoint / Space privat).

### Alur embedding
- **Precompute (sekali):** seluruh ±2000 record di-embed dalam batch, vektor disimpan di pgvector. Re-embed hanya saat ada record baru atau ganti model.
- **On-demand (saat scan):** teks query mahasiswa di-embed via HF, lalu dihitung cosine similarity terhadap korpus.
- **Skala 2000 → brute-force cosine cukup.** Tidak perlu index ANN. Jangan over-engineer bagian ini.

### Catatan autentikasi (NIM + Password) — dikerjakan di backend oleh penulis
Supabase Auth berbasis **email**, bukan NIM. Ada dua pendekatan:
- **Direkomendasikan — pemetaan NIM ke email internal.** Saat login, NIM dipetakan ke email (mis. `{nim}@std.unissula.ac.id`) lalu autentikasi berjalan via Supabase email/password di belakang layar. Kelebihan: tetap memakai session, JWT, dan RLS bawaan Supabase.
- **Alternatif — auth kustom** dengan tabel `profiles`/`students` (NIM sebagai kunci + password ter-hash) dan sesi buatan sendiri. Lebih berisiko dan menambah pekerjaan; tidak disarankan untuk skripsi.

Implikasi untuk frontend & data:
- Form login menampilkan field **NIM** (numerik) dan **Password** — tanpa field email.
- Saat registrasi, **tetap tangkap email** meski login memakai NIM, agar reset password bisa lewat email.

### Catatan biaya & privasi
- Teks dikirim ke endpoint HF → pertimbangkan **endpoint privat**.
- **Judul/rencana usulan mahasiswa = ide yang belum dipublikasikan → data sensitif.** Perlu kebijakan akses & retensi (§12).

---

## 9. Model Data (skema tabel)

| Tabel | Kolom inti | Catatan |
|-------|-----------|---------|
| `theses` | `id`, `title`, `author`, `abstract`, `year`, `source_url`, `created_at` | Korpus skripsi. |
| `thesis_embeddings` | `thesis_id` (FK), `embedding vector(N)`, `model_version` | `model_version` agar bisa migrasi model tanpa ambigu. |
| `profiles` | `id` (FK `auth.users`), `nim`, `role` (`student`/`admin`), `full_name`, `email` | `nim` unik; `email` untuk reset password. |
| `scans` | `id`, `user_id`, `input_title`, `input_summary`, `created_at` | Satu baris per scan mahasiswa. |
| `scan_results` | `id`, `scan_id`, `thesis_id`, `score`, `rank` | Top-N hasil per scan. |
| `labels` | `id`, `query_or_thesis_a`, `thesis_b_id`, `label`, `labeled_by`, `created_at` | Untuk test set evaluasi. |

**Row Level Security (RLS):**
- Mahasiswa hanya dapat mengakses `scans` & `scan_results` miliknya sendiri.
- Hanya admin yang dapat menulis ke `theses`, `thesis_embeddings`, dan melihat analitik.

---

## 10. Pipeline Pencocokan (langkah)

1. Mahasiswa submit **judul + ringkasan rencana** (FM2).
2. Gabungkan menjadi teks query sesuai strategi asimetri (D4).
3. Embed teks query via HF.
4. Hitung cosine similarity terhadap seluruh embedding korpus (pgvector).
5. Ambil Top-N, urutkan berdasarkan skor.
6. Render hasil sesuai §11 (skor dulu, lalu penjelasan).
7. Simpan ke `scans` + `scan_results`.

**Rencana evaluasi (bagian yang menentukan pertahanan skripsi):** bangun test set berlabel via FA7 → hitung precision/recall/F1 pada beberapa cutoff skor → bandingkan ≥2 model kandidat (D5) → laporkan keterbatasan secara jujur. Tanpa ini, klaim "mendeteksi makna" tidak terbukti.

---

## 11. Desain Hasil & Kontrak Data

### 11.1 Susunan kartu hasil (mengikuti preferensi: skor dulu)
Dari atas ke bawah:
1. **Skor kemiripan** — pita kategori (**Tinggi / Sedang / Rendah**) + angka **2 desimal**.
2. **Judul** penelitian pembanding.
3. **Penulis + tahun.**
4. **Abstrak** penelitian pembanding — inti "penjelasan", memungkinkan mahasiswa menilai perbedaan PICO sendiri.
5. *(Opsional, FM5)* **PICO berdampingan.**

**Disclaimer wajib di UI:** skor adalah indikator kemiripan tekstual-semantik, bukan vonis duplikasi; keputusan akhir ada pada mahasiswa dan pembimbing.

**Kenapa skor tetap perlu pita, meski angka tampil duluan:** cosine 0.82 vs 0.81 bukan perbedaan yang berarti. Pita mencegah over-interpretasi selisih kecil dan menjaga agar angka tidak diam-diam menggantikan fungsi threshold yang sudah dihapus (D1).

### 11.2 Kontrak data frontend–backend (untuk pengembangan frontend-first)
Frontend membangun UI di atas bentuk respons berikut, dengan data contoh sampai backend siap:

```json
{
  "scan_id": "uuid",
  "input": { "title": "...", "summary": "..." },
  "results": [
    {
      "rank": 1,
      "score": 0.82,
      "band": "Tinggi",
      "thesis": {
        "title": "...",
        "author": "...",
        "year": 2022,
        "abstract": "..."
      }
    }
  ]
}
```

Catatan: `band` sebaiknya dihitung backend (satu sumber kebenaran), tetapi frontend harus tahan bila hanya menerima `score` dan memetakan pita sendiri.

---

## 12. Kebutuhan Non-Fungsional

| Aspek | Target |
|-------|--------|
| **Privasi** | Usulan mahasiswa sensitif → RLS ketat, endpoint HF privat, kebijakan retensi data scan yang jelas. |
| **Performa** | < 1–2 detik per scan pada 2000 record (trivial untuk skala ini). |
| **Keamanan** | Role-based access, validasi input, rate limit pada endpoint scan, kunci API hanya di server, password ter-hash. |
| **Skalabilitas** | Arsitektur cukup hingga puluhan ribu record tanpa perancangan ulang. |
| **Aksesibilitas** | Kontras teks memenuhi WCAG AA (lihat §7.1); jangan gunakan `#79AEA3` untuk teks. |
| **Responsif** | Layout berfungsi di desktop dan mobile. |

---

## 13. Risiko & Pertanyaan Terbuka

| ID | Risiko | Mitigasi |
|----|--------|----------|
| R1 | **Asimetri query–dokumen** (D4) | Wajib input ringkasan rencana / model asimetris. Validasi sebelum lanjut. |
| R2 | Kualitas model untuk teks medis Indonesia (D5) | Uji empiris ≥2 model pada pasangan yang diketahui mirip/tidak. |
| R3 | Tanpa ground truth, "kemiripan" tetap indikator, bukan kebenaran | Framing alat-bantu + evaluasi berlabel. |
| R4 | Kelengkapan/konsistensi abstrak korpus | Cek langsung `Corpus.csv`; dashboard kualitas data. |
| R5 | Legalitas/etika data scraping repository | Konfirmasi ketentuan penggunaan repository UNISSULA. |
| R6 | False positive memblokir riset valid | Dimitigasi oleh keputusan tidak memvonis (D1) + interpretasi manusia. |
| R7 | NIM sebagai identitas login vs Supabase Auth berbasis email | Pemetaan NIM ke email internal (§8); tangkap email saat registrasi. |
| R8 | "Cerah" vs warna merek yang muted | Kesan cerah lewat tint + ruang putih + aksen hangat, bukan menaikkan saturasi (§7.1). |

---

## 14. Di Luar Scope / Kemungkinan Masa Depan

Deteksi plagiarisme gaya Turnitin · notifikasi/chat real-time · pencocokan pembimbing otomatis · workflow approval · generalisasi multi-fakultas · pipeline email. Semua ini menambah pekerjaan tanpa memperkuat klaim inti sistem, sehingga sengaja dikecualikan dari versi ini.

---

## 15. Roadmap (Frontend-First)

| Fase | Fokus | Isi |
|------|-------|-----|
| **Fase 1 — Frontend inti** | UI di atas mock data | Design system (§7), landing page (§6.1), form login (NIM + Password), form input scan (FM2), tampilan hasil (§11) dengan data contoh, riwayat scan (tampilan). |
| **Fase 2 — Frontend admin** | UI admin | Daftar korpus (FA3), form/unggah CSV (FA2), dashboard analisis (FA4), visualisasi tren (FA5) — semua dengan data contoh. |
| **Fase 3 — Integrasi backend** *(dikerjakan penulis)* | Menyambungkan | Auth (pemetaan NIM), pgvector + precompute embedding, endpoint scan sesuai kontrak (§11.2), penyimpanan riwayat. |
| **Fase 4 — Diferensiasi & evaluasi** | Nilai tambah | Peta saturasi topik (FA6), antarmuka pelabelan + evaluasi precision/recall (FA7), perbandingan PICO (FM5), ekspor PDF (FM6). |

---

*Dokumen ini akan direvisi setelah dua penentu utama dikonfirmasi: (1) strategi penanganan asimetri query–dokumen yang lolos uji (D4/R1), dan (2) model embedding terpilih berdasarkan hasil evaluasi (D5/R2).*

# Serupa — Sistem Analisis Kemiripan Judul Skripsi

**Fakultas Ilmu Keperawatan (FIK) UNISSULA**

Serupa membantu mahasiswa FIK UNISSULA mengecek apakah rencana topik skripsi mereka tumpang tindih dengan penelitian yang sudah ada, memakai **kemiripan semantik (embedding)** — mengukur kedekatan makna, bukan sekadar kecocokan kata. Serupa adalah **alat bantu keputusan**, bukan vonis: sistem menyajikan skor + penelitian termirip beserta abstraknya, lalu mahasiswa & pembimbing yang menilai.

---

## Fitur

- **Landing publik** — perkenalan produk + contoh hasil (statis).
- **Daftar mahasiswa** — pakai **email kampus** (`@std.unissula.ac.id`) + **verifikasi OTP**.
- **Masuk** — pakai **NIM** + kata sandi.
- **Cek Rencana Topik** — judul + ringkasan (opsional PICO) → daftar skripsi termirip beserta skor, penulis, tahun, abstrak.
- **Riwayat scan** — tersimpan per akun.
- **Panel admin** — kelola korpus, unggah data, dashboard ringkasan korpus, tren & saturasi topik.

## Tech stack

| Lapisan | Teknologi |
|---|---|
| Frontend | Vue 3 (SPA), Pinia, Vue Router, Vite |
| Backend/API | Vercel Serverless Functions (`api/`) |
| Database & Auth | Supabase — Postgres + **pgvector** + Auth + Row Level Security |
| Model embedding | **BAAI/bge-m3** (1024-dim, CLS pooling) di **Hugging Face** |
| Hosting | Vercel |
| Font / warna merek | Lato · teal `#79AEA3` |

## Arsitektur

```
[ Vue 3 SPA (Vercel) ]
        │ HTTPS
        ▼
[ Vercel Serverless Functions ]
   /api/register  → cek NIM + signUp (kirim OTP ke email kampus)
   /api/login     → NIM → email (service role) → sign-in → token sesi
   /api/scan      → embed query (HF) → cari pgvector → simpan hasil
        │                         │
        ▼                         ▼
[ Hugging Face ]             [ Supabase ]
  bge-m3 · POST /embed         Postgres + pgvector + Auth + RLS
```

Login memakai **NIM**, tetapi resolusi NIM→email dan sign-in dilakukan **di server** agar email kampus tidak pernah terekspos ke browser. Kunci rahasia (`SERVICE_ROLE_KEY`, `HF_TOKEN`) hanya hidup di server — tidak pernah masuk bundle browser.

## Struktur proyek

```
src/
  views/            Halaman (Landing, Login, Register, student/*, admin/*)
  components/       UI, layout, chart, scan
  stores/           Pinia (auth, corpus, scans, toast)
  services/         config, authService, corpusService, scanService  (semua LIVE)
  lib/              supabase (klien browser) · format · csv · topics (analitik subbidang)
api/
  register.js       POST /api/register
  login.js          POST /api/login
  scan.js           POST /api/scan
  health.js         GET  /api/health
  _lib/             embed (HF), supabaseAdmin, text, band
supabase/           01_schema.sql · 02_functions.sql · 03_rls.sql
hf-space/           Docker + FastAPI (POST /embed → bge-m3)
scripts/            import-corpus.mjs · embed-corpus.mjs
.github/workflows/  deploy-hf-space.yml · embed-corpus.yml
```

## Menjalankan (pengembangan)

**Prasyarat:** Node.js **22+** (Supabase JS terbaru butuh WebSocket bawaan), akun Supabase + Hugging Face + Vercel.

```bash
npm install
cp .env.example .env      # isi minimal VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
```

- **Frontend saja:** `npm run dev` — tetapi `/api/*` (daftar, masuk, scan) **tidak tersedia**.
- **Dengan API (disarankan):** `vercel dev` (`npm i -g vercel`) — menyediakan `/api/*` untuk mencoba alur penuh secara lokal.
- **Build produksi:** `npm run build` → `dist/`.

Aplikasi **berjalan sepenuhnya live** (tanpa mode mock) sehingga **memerlukan backend**. Tanpa env Supabase, login/scan/korpus tidak berfungsi (UI memberi pesan ramah, bukan crash).

---

## Penyiapan backend

Urutan sekali-jalan: **Supabase → Hugging Face → isi korpus & embedding → deploy Vercel → buat admin**.

### 1. Supabase (Postgres + pgvector + Auth)

1. **New project** di <https://supabase.com>, pilih region terdekat (mis. Singapore).
2. **SQL Editor** → jalankan **berurutan**: isi `supabase/01_schema.sql`, lalu `02_functions.sql`, lalu `03_rls.sql`. Ini membuat tabel (`theses`, `thesis_embeddings` `vector(1024)`, `profiles`, `scans`, `scan_results`, `labels`), RPC (`match_theses`, `corpus_stats`), trigger pembuat profil, dan seluruh kebijakan RLS.
3. **Auth (verifikasi OTP):**
   - *Authentication → Providers → Email*: **Confirm email = ON**.
   - *Authentication → Email Templates → "Confirm signup"*: tampilkan kode `{{ .Token }}` (bukan hanya link).
   - *Authentication → SMTP Settings*: sambungkan **SMTP kustom** (Resend/Brevo/SendGrid). SMTP bawaan Supabase dibatasi beberapa email/jam — tidak cukup untuk banyak mahasiswa.
4. **Project Settings → API**, salin: `Project URL`, `anon public`, `service_role secret` (rahasia).

> Ganti model embedding? Sesuaikan `vector(1024)` di `01_schema.sql` **dan** `EMBED_DIM`.

### 2. Hugging Face (model embedding)

1. Token akses: <https://huggingface.co/settings/tokens> → **New token** (role *Read*) → `HF_TOKEN` (rahasia).
2. Model default **`BAAI/bge-m3`** — multilingual, 1024-dim, kuat untuk Bahasa Indonesia, tanpa wajib prefix query/passage.
3. **(Produksi, disarankan)** host model di **HF Space privat** agar teks usulan mahasiswa tidak melewati layanan publik, lalu set `EMBED_ENDPOINT_URL` ke URL-nya. Berkas Space ada di `hf-space/` dan disinkronkan oleh GitHub Actions (`deploy-hf-space.yml`) — butuh secret `HF_TOKEN` (izin **Write**) & variable `HF_SPACE_ID`. Bila `EMBED_ENDPOINT_URL` kosong, dipakai Inference API publik (cukup untuk dev; ada cold-start & rate limit).

### 3. Isi korpus & hitung embedding

Judul di `theses` **tidak otomatis** ter-embed. Dua cara:

- **Cloud (disarankan):** GitHub Actions → **Embed Korpus ke Supabase** (`embed-corpus.yml`) → *Run workflow*. Butuh secret `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HF_TOKEN`, `EMBED_ENDPOINT_URL`.
- **Lokal** (butuh `.env` terisi server keys + HF):
  ```bash
  npm run import:corpus   # Corpus.csv (;-delimited: nama;judul;abstrak;tahun;prodi) → tabel theses (±2.244 record)
  npm run embed:corpus    # precompute embedding → thesis_embeddings
  ```

`import:corpus` **jalankan sekali** (dua kali = duplikat; kosongkan dulu dengan `truncate public.theses cascade;` bila perlu). `embed:corpus` **idempoten** — hanya meng-embed judul yang belum punya vektor, aman diulang. **Setelah menambah judul baru, jalankan lagi** agar ikut ter-embed.

Verifikasi cepat di SQL Editor:
```sql
select count(*) from public.thesis_embeddings;   -- harus ≈ jumlah theses
select public.corpus_stats();                     -- statistik korpus
```

### 4. Deploy ke Vercel

Import repo ke Vercel (autodetect **Vite**; fungsi `api/` otomatis jadi Serverless Functions). Isi **Environment Variables** (Production + Preview):

| Variabel | Sumber | Ke browser? |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL | ya |
| `VITE_SUPABASE_ANON_KEY` | anon key | ya |
| `SUPABASE_URL` | Project URL | tidak |
| `SUPABASE_ANON_KEY` | anon key | tidak |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | **tidak (RAHASIA)** |
| `HF_TOKEN` | token HF | **tidak (RAHASIA)** |
| `EMBED_MODEL` | `BAAI/bge-m3` | tidak |
| `EMBED_DIM` | `1024` | tidak |
| `EMBED_POOLING` | `cls` | tidak |
| `EMBED_ENDPOINT_URL` | (opsional) URL Space privat | tidak |

> Variabel `VITE_*` di-*bake* saat build → **redeploy** setiap kali diubah.

Cek kesehatan: buka `https://<domain>/api/health` — semua flag `env` harus `true`.

### 5. Membuat akun admin

Admin **tidak bisa daftar sendiri** (form `/daftar` selalu `role = student`). Buat manual:

1. *Supabase → Authentication → Add user*: isi email admin, set password, centang **Auto Confirm User**.
2. *SQL Editor*:
   ```sql
   update public.profiles
   set role = 'admin', nim = 'admin', full_name = 'Koordinator Skripsi FIK'
   where id = (select id from auth.users where email = 'EMAIL_ADMIN');
   ```
   `nim` bebas (mis. `admin`) — itulah yang diketik admin saat login (`/api/login` menerjemahkan NIM → email → sign-in).

---

## Keputusan & batasan implementasi

- **Live-only.** Tidak ada mode mock/akun demo; seluruh data nyata dari Supabase.
- **Model `BAAI/bge-m3`** (1024-dim, CLS pooling), tanpa prefix query/passage.
- **Autentikasi:** email kampus **asli** = email akun; login lewat **NIM** yang di-resolve ke email **di server** (`/api/login`) sehingga email tak bocor ke browser. Pendaftaran **wajib OTP** dan dibatasi domain **`@std.unissula.ac.id`**.
- **Sesi:** `sessionStorage` per-tab (bukan `localStorage`) → tutup/ganti tab = login lagi.
- **Skor apa adanya, tanpa ambang lulus/gagal.** Skor kosinus ditampilkan lebih dulu (2 desimal); pita **Tinggi ≥ 0.75**, **Sedang ≥ 0.60**, **Rendah < 0.60** hanya mencegah over-interpretasi selisih kecil — bukan vonis. Sumber ambang tunggal: `src/lib/format.js` & `api/_lib/band.js`.
- **Dashboard korpus LIVE** via RPC `corpus_stats()` (jumlah record, kelengkapan abstrak, tahun janggal, distribusi per tahun). "Siap di-embed / ber-abstrak" adalah **metrik kelengkapan abstrak**, bukan status embedding — embedding tetap meng-cover seluruh record (judul saja bila tanpa abstrak).
- **Tren & Saturasi Topik LIVE berbasis kata kunci** (`src/lib/topics.js`): tiap skripsi dicocokkan ke subbidang keperawatan lewat kata kunci pada judul+abstrak (±90% record terklasifikasi), lalu dihitung kepadatan & tren antar tahun. Sifatnya **perkiraan rule-based**, bukan klaster makna — skripsi bertema di luar daftar kata kunci belum terhitung, dan satu skripsi bisa masuk lebih dari satu subbidang. Taksonomi mudah disesuaikan di `TOPIC_DEFS`.
- **Embedding korpus manual** (GitHub Actions / script lokal, idempoten). Judul baru **tidak** auto-embed — jalankan ulang.
- **Logo gambar** (`public/logo.png`) + wordmark teks.

### Catatan keamanan terbuka (TODO)

- ⚠️ **Jadikan HF Space privat** untuk produksi (teks usulan mahasiswa = sensitif). Aplikasi sudah mengirim `HF_TOKEN` sehingga tetap jalan.
- ⚠️ **Belum ada rate limit** pada `/api/scan` — pertimbangkan (mis. per user/menit) sebelum publik luas.

### Belum dibangun (roadmap)

- Perbandingan PICO berdampingan.
- Ekspor laporan PDF.
- Saturasi berbasis **klaster embedding** (kini berbasis kata kunci).
- Antarmuka pelabelan untuk test set evaluasi (tabel `labels` sudah ada di skema).

---

## Uji end-to-end (live)

1. **/daftar** → NIM + email kampus asli + sandi → **Daftar & Kirim Kode** → masukkan **OTP** → akun aktif (`profiles` terisi otomatis via trigger).
2. **/masuk** → login dengan **NIM** + sandi (lewat `/api/login`).
3. **Cek Rencana Topik** → judul + ringkasan → **Analisis kemiripan** (`/api/scan`: embed → pgvector → simpan).
4. **Riwayat Scan** → scan muncul; buka detail (`scans`/`scan_results`, hanya milik user via RLS).
5. Login **admin** → **Korpus Skripsi** menampilkan `theses`; tambah/sunting/hapus (berhasil hanya admin — RLS).

## Troubleshooting

| Gejala | Kemungkinan sebab & solusi |
|---|---|
| `/api/health` flag `false` | Env belum diisi/di-redeploy di Vercel. |
| Login: "Email belum diverifikasi" | Mahasiswa belum menyelesaikan OTP. Daftar ulang NIM sama → kode dikirim ulang. |
| OTP tidak sampai | SMTP kustom belum diset / kena rate limit SMTP bawaan; cek folder spam. |
| Email berisi link, bukan kode | Ubah template "Confirm signup" agar memakai `{{ .Token }}`. |
| Login: "NIM/sandi tidak cocok" | NIM belum terdaftar / salah sandi, atau `/api/login` tak jalan (butuh `vercel dev` saat lokal). |
| Scan: "Model HF sedang dimuat" | Cold-start Inference API; ulangi, atau pakai Endpoint/Space privat. |
| Scan: "Dimensi embedding tak sesuai" | `EMBED_DIM` ≠ dimensi model / kolom `vector(N)`. Samakan. |
| Hasil scan kosong | `thesis_embeddings` belum terisi → jalankan `embed:corpus`; pastikan `EMBED_MODEL` sama saat embed & scan. |
| Daftar korpus admin kurang dari total | (sudah ditangani) daftar dipaginasi `.range()`; total di dashboard via `count(*)`. |
| Admin tak bisa tulis korpus | `profiles.role` belum `admin`. |
| `vector` type error saat SQL | Aktifkan extension lewat Database → Extensions. |

---

## Variabel lingkungan

Daftar lengkap ada di [`.env.example`](./.env.example). Ringkas: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (publik, frontend), `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` (server), `HF_TOKEN`, `EMBED_MODEL`/`EMBED_DIM`/`EMBED_POOLING`, `EMBED_ENDPOINT_URL` (opsional).

## Kredit

Proyek skripsi — FIK UNISSULA. Analisis kemiripan judul skripsi berbasis embedding semantik.

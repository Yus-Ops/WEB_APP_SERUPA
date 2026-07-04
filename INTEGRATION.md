# Panduan Integrasi — Supabase & Hugging Face

Dokumen ini adalah **langkah demi langkah** menyambungkan frontend Serupa ke
backend nyata: **Supabase** (Auth + Postgres/pgvector) dan **Hugging Face**
(model embedding), diorkestrasi oleh **Vercel Serverless Functions**. Sesuai
arsitektur PRD §8 dan roadmap Fase 3.

> **Prinsip:** aplikasi berjalan **sepenuhnya live** — tanpa mode mock. Semua
> kode integrasi hidup di lapisan `src/services/`, `api/`, `supabase/`, dan
> `scripts/`; frontend cukup diberi variabel lingkungan yang benar.

---

## 0. Peta perubahan (apa yang sudah disiapkan)

```
src/services/            ← LAPISAN SERVICE (semua ke backend live)
  config.js              ← env publik (Supabase URL/anon) + endpoint API
  authService.js         ← daftar/masuk/OTP (via /api/register, /api/login) + logout
  corpusService.js       ← CRUD korpus (tabel theses) + stats (corpus_stats)
  scanService.js         ← scan & riwayat (/api/scan + Supabase)
src/lib/supabase.js      ← klien Supabase browser (anon key, lazy)

api/                     ← VERCEL SERVERLESS (kunci rahasia hidup di sini)
  register.js            ← POST /api/register: cek NIM + signUp (kirim OTP email)
  login.js               ← POST /api/login: NIM → email → sign-in (balas token sesi)
  scan.js                ← POST /api/scan: auth → embed HF → pgvector → simpan
  health.js              ← GET  /api/health: cek konfigurasi env
  _lib/embed.js          ← pemanggil embedding Hugging Face (bge-m3)
  _lib/text.js           ← pembangun teks query/passage (strategi asimetri D4)
  _lib/band.js           ← skor → pita (konsisten dg src/lib/format.js)
  _lib/supabaseAdmin.js  ← klien service-role & user-scoped

supabase/                ← SQL untuk disalin ke Supabase SQL Editor
  01_schema.sql          ← tabel + pgvector (PRD §9)
  02_functions.sql       ← RPC match_theses, trigger profil, statistik
  03_rls.sql             ← Row Level Security (PRD §9, §12)

scripts/
  import-corpus.mjs      ← Corpus.csv → tabel theses
  embed-corpus.mjs       ← precompute embedding → thesis_embeddings

.env.example             ← daftar semua variabel lingkungan
vercel.json              ← rewrites SPA (kecuali /api) + durasi fungsi scan
```

> **Penting:** aplikasi kini **memerlukan** backend. Tanpa `VITE_SUPABASE_URL` &
> `VITE_SUPABASE_ANON_KEY`, login/scan/korpus tidak berfungsi (UI memberi pesan
> ramah, bukan crash).

---

## 1. Prasyarat

- **Node.js 18+** (butuh `fetch` & ESM bawaan). Cek: `node -v`.
- Akun **Supabase** (gratis) — <https://supabase.com>
- Akun **Hugging Face** (gratis) — <https://huggingface.co>
- Akun **Vercel** (gratis) — <https://vercel.com>
- Dependensi sudah terpasang: `npm install` (menambahkan `@supabase/supabase-js`).

---

## 2. Langkah A — Menyiapkan Supabase

### A.1 Buat project
1. Masuk Supabase → **New project**. Catat **Database password**.
2. Pilih region terdekat (mis. Singapore).

### A.2 Jalankan skema (aktifkan pgvector, buat tabel, RLS)
Buka **SQL Editor** di dashboard Supabase, lalu jalankan **berurutan**:

1. Tempel isi `supabase/01_schema.sql` → **Run**.
2. Tempel isi `supabase/02_functions.sql` → **Run**.
3. Tempel isi `supabase/03_rls.sql` → **Run**.

Ini membuat tabel `theses`, `thesis_embeddings` (vector 1024), `profiles`,
`scans`, `scan_results`, `labels`; RPC `match_theses`; trigger pembuat profil;
dan seluruh kebijakan RLS.

> **Dimensi vektor** default `1024` untuk `BAAI/bge-m3`. Bila mengganti model,
> sesuaikan `vector(1024)` di `01_schema.sql` **dan** `EMBED_DIM`.

### A.3 Pengaturan Auth (verifikasi OTP ke email kampus)
Mahasiswa mendaftar dengan **email kampus asli** (mis. `nama@std.unissula.ac.id`)
— itulah email akun. Login tetap pakai **NIM** (di-resolve ke email di server oleh
`/api/login`, email tak diekspos ke browser). Verifikasi email pakai **OTP 6 digit**:

- **Authentication → Providers → Email**: **Confirm email = ON**, provider
  Email/Password tetap aktif.
- **Authentication → Email Templates → "Confirm signup"**: ubah isinya agar
  menampilkan kode `{{ .Token }}` (bukan hanya link). Mis. *"Kode verifikasi Anda:
  `{{ .Token }}`"*.
- **Authentication → SMTP Settings**: sambungkan **SMTP kustom** (Resend / Brevo /
  SendGrid — gratis untuk volume kecil). SMTP bawaan Supabase dibatasi ~beberapa
  email/jam (uji coba) dan tidak cukup untuk banyak mahasiswa.

### A.4 Ambil kunci API
**Project Settings → API**, salin:
- `Project URL` → `SUPABASE_URL` dan `VITE_SUPABASE_URL`
- `anon public` → `SUPABASE_ANON_KEY` dan `VITE_SUPABASE_ANON_KEY`
- `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` **(RAHASIA — server saja)**

---

## 3. Langkah B — Hugging Face (model embedding)

### B.1 Token akses
1. <https://huggingface.co/settings/tokens> → **New token** (role: *Read*).
2. Salin → `HF_TOKEN` **(RAHASIA — server saja)**.

### B.2 Model
Default: **`BAAI/bge-m3`** — multilingual, 1024-dim, kuat untuk teks Bahasa
Indonesia, tanpa wajib prefix query/passage. Sudah diset di `.env.example`
(`EMBED_MODEL=BAAI/bge-m3`, `EMBED_DIM=1024`, `EMBED_POOLING=cls`).

### B.3 (Direkomendasikan) Inference Endpoint privat
Teks usulan mahasiswa bersifat sensitif (PRD §12). Untuk produksi, buat
**Inference Endpoint** privat (huggingface.co → Inference Endpoints), lalu set
`EMBED_ENDPOINT_URL` ke URL endpoint tersebut. Bila kosong, dipakai Inference
API serverless publik (cukup untuk pengembangan; ada cold-start & rate limit).

> Mengganti keluarga model? Untuk **e5** (`intfloat/multilingual-e5-*`) yang
> mensyaratkan prefix, set `EMBED_QUERY_INSTRUCTION="query: "` dan
> `EMBED_PASSAGE_INSTRUCTION="passage: "`, serta `EMBED_POOLING=mean`,
> `EMBED_DIM` sesuai model (base=768, large=1024).

---

## 4. Langkah C — Isi korpus & hitung embedding (lokal, sekali)

### C.1 Siapkan `.env` lokal
```bash
cp .env.example .env
```
Isi minimal: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HF_TOKEN`,
`EMBED_MODEL`, `EMBED_DIM`.

### C.2 Impor Corpus.csv → tabel `theses`
```bash
npm run import:corpus
```
Membaca `Corpus.csv` (pemisah `;`, kolom `nama;judul;abstrak;tahun;prodi`) dan
memasukkan ±2.244 record. **Jalankan sekali** (menjalankan dua kali menduplikasi
data — kosongkan tabel dulu bila perlu: `truncate public.theses cascade;`).

### C.3 Precompute embedding → tabel `thesis_embeddings`
```bash
npm run embed:corpus
```
Meng-embed hanya judul yang belum punya vektor untuk model aktif (idempoten &
bisa dilanjutkan bila terputus). Untuk ±2.000 record via Inference API serverless
ini bisa memakan beberapa menit (batch + kemungkinan cold-start).

Verifikasi cepat di SQL Editor:
```sql
select count(*) from public.thesis_embeddings;   -- harus ≈ jumlah theses
select public.corpus_stats();                     -- statistik korpus
```

---

## 5. Langkah D — Deploy ke Vercel

### D.1 Hubungkan repo
Import project ke Vercel. Framework autodetect: **Vite**. Fungsi di `api/`
otomatis menjadi Serverless Functions.

### D.2 Environment Variables (Project → Settings → Environment Variables)
Isi **semua** nilai berikut (Production + Preview):

| Variabel | Contoh / sumber | Terpapar ke browser? |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL | ya |
| `VITE_SUPABASE_ANON_KEY` | anon key | ya |
| `SUPABASE_URL` | Project URL | **tidak** |
| `SUPABASE_ANON_KEY` | anon key | **tidak** |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | **tidak (RAHASIA)** |
| `HF_TOKEN` | token HF | **tidak (RAHASIA)** |
| `EMBED_MODEL` | `BAAI/bge-m3` | tidak |
| `EMBED_DIM` | `1024` | tidak |
| `EMBED_POOLING` | `cls` | tidak |
| `EMBED_ENDPOINT_URL` | (opsional) URL endpoint privat | tidak |

> Variabel `VITE_*` di-*bake* saat build → **redeploy** setiap kali diubah.

### D.3 Deploy & cek kesehatan
Setelah deploy, buka `https://<domain-anda>/api/health`. Semua flag `env`
harus `true`:
```json
{ "ok": true, "model": "BAAI/bge-m3",
  "env": { "supabase_url": true, "supabase_service_role": true,
           "supabase_anon": true, "hf_token": true } }
```

---

## F. Deploy Space Embedding Privat via GitHub Actions (opsional, §12)

Alih-alih memakai HF Inference API serverless publik, host model `bge-m3`
sendiri di sebuah **HF Space privat** dan arahkan `EMBED_ENDPOINT_URL` ke sana.
Teks usulan mahasiswa jadi tidak melewati layanan publik. Berkasnya ada di
`hf-space/` dan disinkronkan otomatis oleh GitHub Actions.

```
hf-space/                        → isi Space (di-upload ke root Space)
  Dockerfile                     → Docker Space CPU, bake model saat build
  app.py                         → FastAPI: POST /embed → [[...1024...], ...]
  requirements.txt
  README.md                      → header konfigurasi HF Space
.github/workflows/deploy-hf-space.yml  → sync hf-space/ → Space saat push
.github/scripts/push_to_hf_space.py    → membuat Space (privat) + upload_folder
```

**Kontrak sengaja dibuat identik** dengan feature-extraction HF Inference API,
sehingga `api/_lib/embed.js` **tidak perlu diubah** — cukup set env-nya.

### F.1 Prasyarat: repo di GitHub
Repo ini belum ter-git. Inisialisasi & push:
```bash
git init
git add -A
git commit -m "Serupa: frontend + integrasi Supabase/HF"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

### F.2 Token & konfigurasi GitHub
1. Buat **HF access token dengan izin _Write_**:
   huggingface.co/settings/tokens → New token → role *Write*.
2. Di repo GitHub → **Settings → Secrets and variables → Actions**:
   - Tab **Secrets** → `HF_TOKEN` = token write tadi.
   - Tab **Variables** → `HF_SPACE_ID` = `<user-hf>/serupa-embed`
     (nama Space bebas; akan dibuat otomatis bila belum ada).

### F.3 Jalankan deploy
- Otomatis: setiap `git push` yang mengubah `hf-space/**` ke `main`.
- Manual: tab **Actions → Deploy Embedding Space ke Hugging Face → Run workflow**.

Action membuat Space **privat** (Docker) lalu meng-upload `hf-space/`. **Build
pertama ±10–15 menit** (mengunduh & mem-bake bge-m3 ke image). Pantau di
`https://huggingface.co/spaces/<user-hf>/serupa-embed` → tab *Logs*.

### F.4 Uji Space
Setelah status **Running**:
```bash
curl https://<user-hf>-serupa-embed.hf.space/                       # {"ok":true,...}
curl -X POST https://<user-hf>-serupa-embed.hf.space/embed \
  -H "Authorization: Bearer $HF_TOKEN" -H "Content-Type: application/json" \
  -d '{"inputs":["query: terapi musik kecemasan pra-operasi"]}'      # [[...1024...]]
```
> URL Space berformat `https://<user>-<namaspace>.hf.space` (garis, bukan garis
> miring). Untuk Space **privat**, sertakan `Authorization: Bearer <HF_TOKEN>`
> milik akun pemilik Space.

### F.5 Sambungkan ke aplikasi
Set di **Vercel** (dan `.env` lokal untuk `embed:corpus`):
```
EMBED_ENDPOINT_URL=https://<user-hf>-serupa-embed.hf.space/embed
EMBED_MODEL=BAAI/bge-m3
EMBED_DIM=1024
```
`api/_lib/embed.js` akan memakai `EMBED_ENDPOINT_URL` menggantikan Inference API.
Redeploy Vercel, lalu jalankan `npm run embed:corpus` (memakai Space yang sama).

> **Catatan CPU:** Space free tier berjalan di CPU. Embedding satu query saat
> scan cepat (±1–3 dtk saat warm), tapi precompute ±2.000 record bisa memakan
> belasan menit; turunkan `EMBED_BATCH` bila timeout. Space free **tidur** setelah
> lama idle → request pertama setelah bangun lebih lambat (bisa kena batas 30 dtk
> fungsi Vercel; ulangi, atau upgrade Space/aktifkan agar tetap bangun).

---

## 6. Membuat akun admin

Admin tidak bisa mendaftar sendiri (form /daftar selalu `role = student`). Buat manual:

1. **Supabase → Authentication → Add user**: isi **email** admin (mis. email
   koordinator), set **password**, centang **Auto Confirm User** (admin tak perlu OTP).
2. Di **SQL Editor**, set peran + NIM login admin:
   ```sql
   update public.profiles
   set role = 'admin', nim = 'admin', full_name = 'Koordinator Skripsi FIK'
   where id = (select id from auth.users where email = 'EMAIL_ADMIN');
   ```
   `nim` bebas (mis. `admin`) — itulah yang diketik admin saat login.
3. **Login** di /masuk: NIM = `admin` (nilai yang kamu set) + password tadi.
   `/api/login` menerjemahkan NIM → email → sign-in.

---

## 7. Menjalankan secara lokal (opsional, untuk uji dev)

```bash
# .env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Lalu jalankan **frontend + fungsi** bersama memakai Vercel CLI (agar `/api/scan`
tersedia saat dev):
```bash
npm i -g vercel
vercel dev
```
`npm run dev` (Vite murni) **tidak** menyediakan `/api/*`; gunakan `vercel dev`
untuk menguji scan live secara lokal.

---

## 8. Uji end-to-end (live)

1. **/daftar** → isi NIM, **email kampus asli**, kata sandi → **Daftar & Kirim Kode**.
   → Cek email → masukkan **kode OTP 6 digit** → akun aktif & langsung masuk.
   → Cek tabel `profiles` terisi otomatis (trigger; `email` = email kampus).
2. **/masuk** → login dengan **NIM** + kata sandi (lewat `/api/login`).
3. **Cek Rencana Topik** → isi judul + ringkasan → **Analisis kemiripan**.
   → `/api/scan` meng-embed query, mencari pgvector, menyimpan hasil.
4. **Riwayat Scan** → scan tadi muncul; buka detailnya.
   → Cek tabel `scans` & `scan_results` terisi (hanya milik user, via RLS).
5. Login sebagai **admin** → **Korpus Skripsi** menampilkan data dari `theses`;
   coba tambah/sunting/hapus (berhasil hanya untuk admin — RLS).

---

## 9. Peta kontrak (ringkas)

| Kebutuhan frontend | Sumber live |
|---|---|
| Daftar (OTP) | `/api/register` → signUp + `verifyOtp` (`authService`) |
| Masuk (NIM) | `/api/login` → NIM→email→sign-in di server (`authService`) |
| Korpus (CRUD) | tabel `theses` (`corpusService`) |
| Ringkasan korpus | RPC `corpus_stats()` (`corpusService.stats`) |
| Scan | `POST /api/scan` (HF + pgvector) |
| Riwayat | tabel `scans`/`scan_results` |
| Bentuk hasil | kontrak §11.2 (`{ rank, score, band, thesis:{…} }`) |

Catatan: panel **Saturasi Subbidang** & **Tren Topik** di admin masih memakai
data contoh (`src/data/sampleAnalytics.js`) karena butuh modul analitik klaster
embedding yang belum ada endpoint-nya — sudah ditandai "contoh" di UI.

---

## 10. Keamanan & biaya (PRD §12)

- **Kunci rahasia** (`SERVICE_ROLE_KEY`, `HF_TOKEN`) hanya di server. Tidak ada
  prefix `VITE_` untuknya → tidak ikut ke bundle browser.
- **RLS ketat**: usulan mahasiswa (`scans`) hanya bisa dibaca pemiliknya —
  admin pun tidak (data ide belum dipublikasi = sensitif).
- **Endpoint HF privat** untuk produksi (§B.3) agar teks tidak melewati layanan
  publik.
- **Rate limit**: pertimbangkan menambah pembatasan pada `/api/scan` (mis. per
  user/menit) sebelum publik.

---

## 11. Troubleshooting

| Gejala | Kemungkinan sebab & solusi |
|---|---|
| `/api/health` flag `false` | Env belum diisi/di-redeploy di Vercel. |
| Login: "Email belum diverifikasi" | Mahasiswa belum menyelesaikan OTP. Daftar ulang NIM sama → kode dikirim ulang, lalu verifikasi. |
| OTP tidak sampai ke email | SMTP kustom belum diset / kena rate limit SMTP bawaan (A.3); cek folder spam. |
| Email berisi link, bukan kode | Ubah template "Confirm signup" agar memakai `{{ .Token }}` (A.3). |
| Login: "NIM atau kata sandi tidak cocok" | NIM belum terdaftar / salah sandi, atau `/api/login` tak jalan (butuh `vercel dev` saat lokal). |
| Scan: *"Model HF sedang dimuat"* | Cold-start Inference API; ulangi, atau pakai Endpoint privat. |
| Scan: *"Dimensi embedding tak sesuai"* | `EMBED_DIM` ≠ dimensi model / kolom `vector(N)`. Samakan. |
| Hasil scan kosong | `thesis_embeddings` belum terisi → jalankan `embed:corpus`; pastikan `EMBED_MODEL` sama saat embed & scan. |
| Admin tak bisa tulis korpus | `profiles.role` belum `admin` (Langkah 6). |
| `vector` type error saat SQL | `create extension vector;` gagal → aktifkan lewat Database → Extensions. |
| Action gagal: HF_TOKEN/SPACE_ID | Isi secret `HF_TOKEN` (izin **Write**) & variable `HF_SPACE_ID` (§F.2). |
| Space `/embed` balas 401/403 | Space privat butuh `Authorization: Bearer <HF_TOKEN>` milik akun pemilik. Pastikan token sama dg pemilik Space. |
| Scan pertama lambat/timeout (live + Space) | Space CPU baru bangun dari tidur; ulangi setelah warm, atau jaga Space tetap aktif. |

---

## 12. Checklist

- [ ] `01/02/03_*.sql` dijalankan di Supabase (jalankan ulang `02` untuk `corpus_stats` terbaru)
- [ ] "Confirm email" = ON + template "Confirm signup" pakai `{{ .Token }}` + SMTP kustom
- [ ] `.env` lokal terisi (server keys + HF)
- [ ] `npm run import:corpus` sukses (`theses` terisi)
- [ ] `npm run embed:corpus` sukses (`thesis_embeddings` ≈ jumlah theses)
- [ ] Env Vercel lengkap (Supabase + HF) + redeploy
- [ ] `/api/health` semua `true`
- [ ] Uji end-to-end (daftar → login → scan → riwayat) lolos
- [ ] Minimal satu akun `admin` dibuat
- [ ] *(Opsional §F)* GitHub secret `HF_TOKEN` + variable `HF_SPACE_ID` diisi
- [ ] *(Opsional §F)* Space embedding **Running**, `/embed` teruji, `EMBED_ENDPOINT_URL` diset di Vercel

Selesai — Serupa kini berjalan di atas data nyata dengan kemiripan semantik
sesungguhnya, tanpa mengubah satu pun komponen UI.

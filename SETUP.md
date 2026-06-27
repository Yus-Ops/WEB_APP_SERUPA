# SETUP — Database (Supabase) · Backend (HuggingFace) · Frontend (Vercel)

Semuanya berangkat dari **satu repo GitHub**. Urutan ini wajib karena tiap langkah
bergantung pada hasil sebelumnya:
**Supabase → indexer (lokal) → push GitHub → HF (auto via Actions) → Vercel → sambung CORS.**

```
Lokal: backend/indexer.py ──(isi DB + buat artefak model)──►  Supabase
                                                                ▲
   push ke GitHub ──► GitHub Actions ──(deploy backend/)──► HuggingFace (FastAPI) ─┘ (RPC match_titles)
                 └──► Vercel (frontend/) ───────── baca peta langsung ───────────► Supabase (theses_map)
```

---

## 0. Prasyarat
- Akun (semua punya free tier): **Supabase**, **HuggingFace**, **Vercel**, **GitHub**.
- Lokal: **Python 3.11+**, **Node 18+**, **Git**.
- `backend/Corpus.csv` (kolom `title, abstract, year`, atau hasil scraping `nama;judul;abstrak;tahun;prodi`).

---

## 1. Database — Supabase
1. Buat project baru di supabase.com.
2. **SQL Editor** → tempel & jalankan seluruh isi `backend/schema.sql`.
3. Dari **Project Settings → API**, catat:
   - **Project URL** → `SUPABASE_URL`
   - **`service_role` key** → `SUPABASE_SERVICE_KEY` *(RAHASIA — server-side saja)*
   - **`anon` key** → untuk frontend nanti

> Skema mengaktifkan RLS pada tabel `theses` dan hanya memberi anon akses baca ke
> view `theses_map`. Jadi frontend tak bisa membaca kolom `embedding`.

---

## 2. Isi korpus — jalankan indexer di LOKAL (BUKAN di HF)
Indexer butuh `Corpus.csv` dan menghasilkan artefak model. Jalankan sekali di laptop,
**dari folder `backend/`**:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate              # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
pip install pandas                  # hanya untuk indexer lokal (sengaja tak ada di requirements HF)

cp .env.example .env                # isi SUPABASE_URL, SUPABASE_SERVICE_KEY, CORPUS_CSV
python indexer.py
```

Hasil yang harus ada setelah ini:
- Tabel `theses` di Supabase terisi (judul, abstrak, tahun, vektor, x/y, cluster, cluster_label).
- **Tiga artefak** di folder `backend/` (dipakai layanan untuk menempatkan & melabeli judul baru):
  `umap_model.pkl`, `kmeans_model.pkl`, `cluster_labels.json`.

> ✅ **Verifikasi tema:** `python verify_labels.py` — pastikan `cluster_label` benar-benar
> keperawatan dan saling berbeda (mis. "hipertensi · kepatuhan · obat"), bukan CS.

---

## 3. Push ke GitHub
Semua deploy berangkat dari repo ini.

```bash
git init                            # bila belum
git add .
git commit -m "struktur backend/ + frontend/"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

> `.gitignore` sudah menahan `.env`, `node_modules/`, `__pycache__/`. Artefak model
> (`backend/*.pkl`, `cluster_labels.json`) **ikut** ter-commit (< 10 MB, tanpa LFS) —
> ini perlu agar HF Space punya artefaknya.

---

## 4. Backend — HuggingFace Space (Docker), auto-deploy dari GitHub
Tidak ada lagi upload manual: **GitHub Actions** mengirim isi `backend/` ke Space tiap push.

1. **Buat Space**: huggingface.co → New Space → SDK **Docker** (atau biarkan workflow
   membuatnya otomatis saat run pertama).
2. **Buat token HF**: Settings → Access Tokens → role **write**. Salin.
3. **Simpan token di GitHub**: repo → Settings → Secrets and variables → Actions →
   **New repository secret** → Name `HF_TOKEN`, Value = token tadi.
4. **Set target Space**: edit `.github/workflows/deploy-hf.yml`, ganti
   `HF_SPACE: "GANTI_USERNAME/GANTI_NAMA_SPACE"` jadi `username/nama-space` kamu.
5. **Trigger deploy**: commit perubahan di atas & `git push` (atau tab **Actions** →
   *Deploy backend ke HuggingFace Space* → Run workflow). Workflow meng-upload
   `app.py`, `requirements.txt`, `Dockerfile`, `README.md`, dan **ketiga artefak**;
   `indexer.py`, korpus, & `.env` **tidak** ikut (lihat `ignore_patterns`).
6. **Isi secret di HF Space** → Settings → Variables and secrets:
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_KEY`,
   `FRONTEND_ORIGIN` (sementara `*`; nanti diganti domain Vercel).
7. Space mem-build image lalu menjalankan FastAPI di **port 7860**. URL:
   `https://<user>-<nama-space>.hf.space`. **Tes:** buka `.../health` → `{"status":"ok"}`.

**Catatan HuggingFace:**
- Build pertama agak lama (torch + sentence-transformers).
- Free Space **tidur** saat idle; request pertama **cold-start beberapa detik**.
- Tiap kali **re-index** (mis. setelah perbaikan tema), commit artefak baru & push —
  Action otomatis men-deploy ulang.

---

## 5. Frontend — Vercel
1. vercel.com → **New Project** → import repo GitHub yang sama.
2. **Root Directory** → set ke **`frontend`**.
3. **Environment Variables:**
   - `VITE_PYTHON_API` = URL HF Space (langkah 4)
   - `VITE_SUPABASE_URL` = Project URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = **anon** key (BUKAN service key)
4. **Deploy** → dapatkan domain mis. `https://<app>.vercel.app`. Push berikutnya auto-deploy.

---

## 6. Sambungkan (CORS) & uji end-to-end
1. HF Space → secrets → set `FRONTEND_ORIGIN` = domain Vercel-mu, lalu **restart** Space.
2. Buka domain Vercel dan cek:
   - **Cek judul** → daftar mirip + abstrak + tahun + skor + kategori.
   - **Peta** → tema keperawatan, titik query tersorot di antara tetangganya.
   - **Admin** (login) → tambah judul (judul + abstrak + tahun) → masuk korpus.

---

## Keamanan (ringkas)
- `service_role` key **HANYA** di secrets HF (& `backend/.env` lokal yang gitignored).
  Jangan pernah di frontend / repo publik.
- Frontend hanya `anon` key + RLS Supabase.
- `/add` dilindungi `ADMIN_KEY` (gerbang korpus — hanya judul final yang masuk).
- `HF_TOKEN` hanya di GitHub Secrets; tak pernah tercetak di log Action.

## Catatan konsistensi backend
Setup ini mengasumsikan `backend/app.py` & `backend/indexer.py` sudah sesuai **CLAUDE.md §5**
(menghasilkan 3 artefak; `/check` mengembalikan `abstract` + `year`; ada `cluster` +
`cluster_label`; tanpa prodi/penulis).

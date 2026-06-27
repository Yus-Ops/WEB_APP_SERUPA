# Sistem Deteksi Kemiripan Judul Skripsi

Satu repo GitHub, **dua bagian** yang di-deploy terpisah:

```
.
├── backend/      → HuggingFace Space (Docker) — FastAPI: embed judul + cari kemiripan
├── frontend/     → Vercel — Vue 3 (Vite): cek judul, peta tema, admin
└── .github/workflows/deploy-hf.yml   → auto-deploy backend/ ke HF tiap `git push`
```

Arsitektur & aturan main lengkap: **[CLAUDE.md](CLAUDE.md)** · langkah setup detail: **[SETUP.md](SETUP.md)**.

---

## Deploy backend → HuggingFace (otomatis lewat GitHub)

Sekali set, selanjutnya cukup `git push`:

1. **Buat HF Space** (SDK: **Docker**) lewat UI HuggingFace — atau biarkan workflow membuatnya otomatis.
2. **Buat HF token**: huggingface.co → Settings → Access Tokens → role **write**.
3. **Simpan token di GitHub**: repo → Settings → Secrets and variables → Actions → **New repository secret**
   - Name: `HF_TOKEN` · Value: token tadi.
4. **Edit** `.github/workflows/deploy-hf.yml` → ganti `HF_SPACE` jadi `username/nama-space` milikmu.
5. **`git push`** → buka tab **Actions** di GitHub; workflow mengirim isi `backend/` ke Space.
6. **Isi secret di HF Space** (Settings → Variables and secrets): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_KEY`, `FRONTEND_ORIGIN`.

> Hanya `backend/` yang dikirim ke HF. `frontend/` **tidak** ikut — lihat `ignore_patterns`
> di workflow dan `backend/.dockerignore`. Artefak model (`*.pkl`, `cluster_labels.json`)
> < 10 MB jadi ikut Git biasa tanpa LFS.

## Deploy frontend → Vercel

Import repo ini di Vercel → set **Root Directory = `frontend`** → isi variabel `VITE_*`
(lihat `frontend/.env.example`) → Deploy. Push berikutnya auto-deploy via integrasi Vercel.

## Jalankan lokal (ringkas)

```bash
# Backend — indexer sekali untuk isi korpus + bikin artefak (detail: SETUP.md)
cd backend
python -m venv .venv && .venv\Scripts\activate      # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env                                 # isi nilainya
python indexer.py

# Frontend — jalan di mode demo tanpa backend bila VITE_* kosong
cd frontend
npm install && npm run dev                           # http://localhost:5173
```

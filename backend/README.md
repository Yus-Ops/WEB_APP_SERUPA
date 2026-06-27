---
title: Deteksi Kemiripan Judul Skripsi
emoji: 🔎
colorFrom: red
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Layanan AI — Deteksi Kemiripan Judul Skripsi

Layanan FastAPI yang meng-embed judul dan mencari kemiripan di Supabase (pgvector).

Endpoint:
- `GET /health` — status
- `POST /check` `{ title, k }` — top-k judul mirip (judul, abstract, year, skor, kategori) + koordinat peta
- `POST /add` `{ title, abstract, year }` + header `Authorization: Bearer <token Supabase>` — tambah judul (admin)

Konfigurasi lewat **Settings → Variables and secrets**:
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY` (opsional), `FRONTEND_ORIGIN`.
`/add` diverifikasi via token Supabase Auth — buat akun admin di **Authentication → Users**.

Detail arsitektur ada di `CLAUDE.md` repo utama.

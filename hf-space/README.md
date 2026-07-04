---
title: Serupa Embedding (bge-m3)
emoji: 🧬
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
short_description: Endpoint embedding privat untuk Serupa (FIK UNISSULA)
---

# Serupa — Embedding Space (BAAI/bge-m3)

Endpoint embedding privat untuk aplikasi **Serupa** (analisis kemiripan judul
skripsi, FIK UNISSULA — lihat PRD §8/§12). Meng-host model **`BAAI/bge-m3`**
(multilingual, 1024-dim) di balik API kecil FastAPI, dipanggil server-to-server
oleh Vercel Function `/api/scan` dan oleh skrip precompute `embed-corpus`.

> **Bukan aplikasi Serupa.** Aplikasi berjalan di Vercel; Space ini hanya
> menyediakan embedding. Jadikan Space **privat** agar teks usulan mahasiswa
> (data sensitif) tidak melewati layanan publik.

## API

`POST /embed`
```json
{ "inputs": ["query: teks pertama", "teks kedua"] }
```
Respons — satu vektor 1024-dim (sudah L2-normalized) per input:
```json
[[0.01, -0.02, ...], [0.03, 0.00, ...]]
```
Bentuk ini sengaja identik dengan feature-extraction HF Inference API sehingga
klien Serupa (`api/_lib/embed.js`) tidak perlu diubah — cukup set
`EMBED_ENDPOINT_URL=https://<user>-<space>.hf.space/embed`.

`GET /` dan `GET /health` → cek status (dipakai health check HF).

## Deploy

Otomatis via GitHub Actions (`.github/workflows/deploy-hf-space.yml`) yang
menyinkronkan folder `hf-space/` ke Space ini. Lihat `INTEGRATION.md` §F.

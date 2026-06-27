# frontend/ — Observatorium Skripsi (Frontend Vue 3)

Frontend untuk sistem deteksi kemiripan judul skripsi. Lihat `../CLAUDE.md` untuk
arsitektur keseluruhan. Stack: **Vite + Vue 3 + Vue Router + @supabase/supabase-js**.

## Jalankan lokal

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

### Mode Demo (default, tanpa backend)

Bila `VITE_PYTHON_API` kosong, frontend otomatis berjalan dalam **mode demo**:
korpus contoh bawaan + kemiripan trigram di sisi klien. Tujuannya agar UI bisa
dijalankan & dinilai tanpa men-deploy layanan Python/Supabase dulu. Skor di mode
ini hanya pratinjau berbasis teks — **bukan** embedding semantik.

### Mode Live

Salin `.env.example` → `.env.local`, lalu isi:

```ini
VITE_PYTHON_API=https://xxxx.hf.space          # layanan FastAPI (backend/app.py di HF Space)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Begitu `VITE_PYTHON_API` terisi, `/check` & `/add` memakai backend asli; bila
Supabase terisi, peta membaca view `theses_map` langsung. Tidak ada perubahan kode.

## Struktur

```
src/
├── lib/
│   ├── config.js     # baca env + deteksi mode demo/live
│   ├── api.js        # checkTitle / addTitle / fetchMap (+ fallback demo)
│   ├── supabase.js   # klien Supabase (null saat demo)
│   ├── bands.js      # warna/ambang band (sinkron BANDS di backend/app.py)
│   └── demo.js       # korpus contoh + kemiripan tiruan + palet
├── components/
│   ├── SimilarityGauge.vue   # busur SVG 270° (signature, Fitur 1)
│   ├── CorpusMap.vue         # peta konstelasi canvas (signature, Fitur 2)
│   ├── MatchList.vue / MatchCard.vue
│   ├── AppNav.vue / ModeBadge.vue
└── views/
    ├── CheckView.vue   # cek judul + gauge real-time (Fitur 1)
    ├── MapView.vue     # peta korpus interaktif (Fitur 2)
    └── AdminView.vue   # gerbang korpus: login + tambah judul (/add)
```

## Build produksi (untuk Vercel)

```bash
npm run build        # output ke dist/
npm run preview      # pratinjau hasil build
```

Di Vercel: import repo, set **Root Directory = `frontend`**, isi ketiga variabel `VITE_*`, deploy.

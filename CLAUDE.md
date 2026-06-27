# CLAUDE.md — Sistem Deteksi Kemiripan Judul Skripsi

Dokumen ini adalah panduan arsitektur dan workflow proyek. Tujuannya: mendeteksi
apakah sebuah **calon judul skripsi** terlalu mirip secara **semantik** dengan
judul-judul yang sudah ada di **satu jurusan**, lalu menampilkan skor kemiripan.

> Ringkasan AI-nya dalam satu kalimat: **tidak ada model yang dilatih sendiri.**
> "AI" = satu model *sentence-embedding* berbahasa Indonesia yang sudah jadi
> (pretrained) yang mengubah teks → vektor, plus *cosine similarity* untuk
> mengurutkan judul korpus berdasarkan kedekatan makna. Sisanya rekayasa data.

> **Konteks data (penting):** sistem ini untuk **satu jurusan saja**, dan tabel
> korpus berisi tiga kolom: **`title` (judul)**, **`abstract` (abstrak)**, dan
> **`year` (tahun)**. Tidak ada prodi/penulis. Konsekuensinya menyebar ke desain
> DB & frontend (lihat §4 dan §6).

---

## 1. Keputusan arsitektur yang menentukan (baca ini dulu)

**Model embedding TIDAK bisa jalan di Vercel.** Vercel serverless: filesystem
ephemeral + batas ukuran fungsi (~250MB) yang dilewati jauh oleh PyTorch + bobot
model. Maka:

- Korpus + vektor disimpan di **Supabase (Postgres + pgvector)**, bukan file `.npy`.
- Pencarian kemiripan dilakukan **di dalam Supabase** lewat operator pgvector `<=>`
  (cosine distance) melalui fungsi RPC `match_titles`.
- Model embedding dijalankan di **layanan Python terpisah (FastAPI)** yang
  di-host di platform yang ramah ML (Render / Railway / Fly.io / HuggingFace).
  Layanan ini hanya bertugas: teks → vektor, lalu memanggil RPC Supabase.
- **Vue (di Vercel)** = frontend. Memanggil layanan Python untuk operasi AI, dan
  membaca Supabase langsung untuk data non-sensitif (titik & label peta).

```
                         ┌─────────────────────────┐
        (HTTPS)          │  Vercel — Vue frontend  │
   browser  ───────────► │  - form cek judul        │
                         │  - halaman admin (login) │
                         │  - 2 fitur interaktif    │
                         └───────┬──────────┬───────┘
                                 │          │
              cek / tambah judul │          │ baca data peta (read-only)
                                 ▼          ▼
                 ┌───────────────────────┐  │
                 │ Layanan Python (API)  │  │
                 │ Render/Railway/HF     │  │
                 │ - load model 1x       │  │
                 │ - /check  /add        │  │
                 │ - embed teks → vektor │  │
                 └──────────┬────────────┘  │
                            │ RPC match_titles / insert
                            ▼                ▼
                 ┌──────────────────────────────────┐
                 │ Supabase — Postgres + pgvector    │
                 │ - tabel theses (judul, abstrak,   │
                 │   vektor, koordinat 2D, klaster)  │
                 │ - fungsi match_titles (<=> cosine)│
                 └──────────────────────────────────┘
```

> **Alternatif yang menyederhanakan ops:** ganti layanan Python self-host dengan
> *embedding API terkelola* (mis. HuggingFace Inference) + Supabase Edge Function.
> Trade-off: ketergantungan & biaya pihak ketiga. Default proyek ini self-host.

---

## 2. Tiga aturan kritis yang gampang merusak sistem

**Aturan A — Model harus dibekukan.** Setiap vektor di korpus WAJIB dihasilkan
oleh versi model yang sama. Ganti model = **embed ulang SELURUH korpus**, bukan
hanya judul baru, kalau tidak skornya jadi ngawur. Nama model dikunci sebagai
`MODEL_NAME` di `backend/indexer.py` **dan** `backend/app.py` — keduanya harus identik.

**Aturan B — Gerbang korpus.** "Update data tiap tahun" **bukan** berarti setiap
judul yang diketik mahasiswa masuk korpus. Itu meracuni data dengan judul yang
ditolak/coba-coba. Yang boleh masuk **hanya judul final**, lewat **halaman admin
ber-login** (endpoint `/add` dilindungi `ADMIN_KEY`).

**Aturan C — Abstrak BUKAN untuk pencarian kemiripan.** Input selalu judul, jadi
pencocokan tetap **judul-vs-judul** (simetris). Mencampur embedding abstrak (teks
panjang) ke index yang di-query dengan judul (teks pendek) menurunkan kualitas
karena mismatch panjang/domain. Abstrak hanya dipakai untuk: **(1) ditampilkan di
hasil** agar mahasiswa bisa menilai tumpang-tindih nyata, dan **(2) melabeli
klaster topik** pada peta. Jangan tergoda memasukkannya ke `match_titles`.

---

## 3. Struktur folder

```
.
├── CLAUDE.md                 # dokumen ini
├── README.md                 # ringkasan repo + cara deploy
├── SETUP.md                  # panduan setup langkah-demi-langkah
├── .gitignore
├── .github/workflows/
│   └── deploy-hf.yml         # auto-deploy backend/ ke HF Space tiap `git push`
├── backend/                  # LAYANAN PYTHON → HuggingFace Space (BUKAN Vercel)
│   ├── app.py                # FastAPI: /check, /add, /health
│   ├── indexer.py            # batch (LOKAL): CSV → embed → klaster → koordinat → Supabase
│   ├── corpus_io.py          # pemuat korpus (filter prodi + bersihkan)
│   ├── topics.py             # stopword + pelabelan klaster (TF-IDF abstrak)
│   ├── verify_labels.py      # verifikasi label tema (offline)
│   ├── requirements.txt
│   ├── Dockerfile            # image HF Space (port 7860)
│   ├── README.md             # frontmatter config HF Space
│   ├── schema.sql            # tabel + pgvector + match_titles + view peta
│   ├── Corpus.csv            # input indexer (LOKAL; tak ikut ke HF)
│   └── umap_model.pkl · kmeans_model.pkl · cluster_labels.json   # artefak indexer
└── frontend/                 # FRONTEND VUE (Vite + Vue 3) → Vercel — dibangun terpisah
    └── src/ · .env.example · package.json …
```

---

## 4. Database — Supabase (pgvector)

Skema disesuaikan dengan data nyata: hanya **judul + abstrak**, plus kolom turunan
(vektor, koordinat peta, klaster). **Tidak ada** prodi/penulis.

```sql
create extension if not exists vector;

create table theses (
  id            bigint generated always as identity primary key,
  title         text not null,
  abstract      text,
  year          int,            -- tahun skripsi (satu-satunya metadata yang ada)
  embedding     vector(384),    -- dari JUDUL (untuk pencarian judul-vs-judul)
  x             real,           -- koordinat 2D (UMAP atas embedding judul)
  y             real,
  cluster       int,            -- id klaster topik (KMeans atas embedding judul)
  cluster_label text,           -- kata kunci tema (TF-IDF atas ABSTRAK anggota klaster)
  created_at    timestamptz default now()
);

-- RPC pencarian top-k. '<=>' = cosine distance; similarity = 1 - distance.
-- Catatan: mengembalikan abstract + year agar frontend bisa menampilkannya.
create or replace function match_titles(query_embedding vector(384), match_count int default 10)
returns table (id bigint, title text, abstract text, year int, similarity float)
language sql stable as $$
  select t.id, t.title, t.abstract, t.year, 1 - (t.embedding <=> query_embedding) as similarity
  from theses t
  order by t.embedding <=> query_embedding
  limit match_count;
$$;

-- View ringan untuk peta: TANPA embedding (berat) & TANPA abstract (besar).
-- Abstract diambil saat klik titik (query terpisah).
create or replace view theses_map as
  select id, title, year, x, y, cluster, cluster_label from theses;
```

- `embedding` 384-dim mengikuti model default. Ganti ke model 768-dim → ubah
  semua `384` → `768` dan `EMBED_DIM` di skrip.
- Index ivfflat opsional di skala ~2000 (pencarian eksak sudah instan); jika
  dipakai, buat **setelah** data masuk.
- Legend peta dibangun dari pasangan distinct `(cluster, cluster_label)`.

---

## 5. AI — Layanan Python

### `backend/indexer.py` (sekali / saat tambah massal)
1. Baca CSV korpus (kolom: `title, abstract, year`).
2. Bersihkan ringan: buang baris tanpa judul + duplikat eksak. **Tanpa
   stemming/stopword-removal agresif.**
3. Embed **judul** (`normalize_embeddings=True` → cosine = dot product).
4. **Klaster topik:** KMeans atas embedding judul → `cluster`. Untuk tiap klaster,
   ambil kata kunci dari **abstrak** anggotanya (TF-IDF) → `cluster_label`.
5. **Koordinat 2D:** UMAP atas embedding judul → `x, y`. Simpan reducer UMAP +
   model KMeans + peta label ke disk (dipakai `app.py` untuk judul baru).
6. Insert ke Supabase (batch) termasuk `abstract, year, cluster, cluster_label, x, y`.

### `backend/app.py` (layanan inferensi, selalu hidup)
- `GET  /health`
- `POST /check { title, k }` → embed judul → RPC `match_titles` → kembalikan
  `matches` (judul, **abstract**, **year**, `similarity`, `percent`, `category`) +
  `top` + `coord` (x,y judul query untuk peta).
- `POST /add { title, abstract, year }` + header `X-Admin-Key` → (admin) embed
  judul + prediksi klaster (KMeans tersimpan) + koordinat (UMAP tersimpan) + insert.

> **Soal "persen":** `percent = similarity * 100` untuk UI, TAPI itu skor relatif,
> bukan "persen kata sama". Interpretasi sebenarnya ada di `category` (band ambang
> di `BANDS`, masih placeholder — kalibrasi, lihat §8).

> **Perlu disesuaikan:** karena data model berubah (judul + abstrak + tahun, ada
> klaster), `backend/schema.sql`, `backend/indexer.py`, dan `backend/app.py` perlu
> disinkronkan ke §4–§5 ini (tambah kolom abstrak/tahun/klaster, hapus prodi/penulis,
> tambah KMeans+TF-IDF, serta tambahkan `scikit-learn` ke requirements).

---

## 6. Frontend — Vue 3 (Vite), di Vercel  ← bagian yang diperbarui

**Prinsip baru: aplikasi ini dilingkup untuk SATU jurusan.** Maka UI **tidak**
punya pemilih fakultas/prodi dan **tidak** ada filter/pewarnaan per prodi.
Metadata yang tersedia hanyalah **tahun** — dipakai sebagai konteks di hasil dan
sebagai filter/pewarna sekunder pada peta (lihat §7). Identitas halaman
mencerminkan satu jurusan tunggal.

Stack: Vite + Vue 3 + `@supabase/supabase-js` (baca data peta + login admin)
+ `fetch` ke layanan Python untuk operasi AI.

Halaman/komponen inti:

- **`CheckView`** — input judul → tombol Cek → daftar hasil. **Tiap hasil kini
  menampilkan abstrak skripsi yang cocok** (cuplikan + "lihat selengkapnya") dan
  **tahunnya**, bukan hanya judul + skor. Ini krusial: judul itu sinyal pendek,
  sehingga melihat abstrak (dan tahun, untuk tahu seberapa lama) membantu mahasiswa
  menilai apakah benar-benar tumpang-tindih atau hanya mirip kata. Tampilkan juga
  badge kategori berwarna (`category`). (Opsional: sorot kata yang sama antara
  judul query dan judul hasil.) Memanggil `POST {PYTHON_API}/check`.

- **`AdminView`** — login (Supabase Auth) → form "Tambah judul" berisi **judul +
  abstrak + tahun** (tiga field, sesuai data). Memanggil `POST {PYTHON_API}/add`
  dengan header admin. Bonus: jalankan dulu lewat `/check` sebelum menyimpan,
  supaya duplikat tidak ikut masuk korpus (Aturan B).

- **`CorpusMap`** — Fitur 2 (lihat §7), kini berbasis klaster topik.

Pemanggilan API (inti):
```js
// frontend/src/lib/api.js
const API = import.meta.env.VITE_PYTHON_API
export async function checkTitle(title, k = 10) {
  const r = await fetch(`${API}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, k }),
    signal: AbortSignal.timeout(15000),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()   // { query, matches:[{title,abstract,year,percent,category,...}], top, coord }
}
```

> **Desain visual:** dokumen ini menetapkan arsitektur & perilaku. Saat membangun
> UI sesungguhnya, ambil arah visual yang spesifik & disengaja (palet, tipografi,
> satu elemen "signature") — jangan default template generik.
- CSV
warna : 
66101f,855a5c,8a8e91,b8d4e3,eeffdb

- With #

#66101f, #855a5c, #8a8e91, #b8d4e3, #eeffdb

- Array

["66101f","855a5c","8a8e91","b8d4e3","eeffdb"]

- Object

{"Night Bordeaux":"66101f","Smoky Rose":"855a5c","Grey Olive":"8a8e91","Pale Sky":"b8d4e3","Frosted Mint":"eeffdb"}

- Extended Array

[{"name":"Night Bordeaux","hex":"66101f","rgb":[102,16,31],"cmyk":[0,84,70,60],"hsb":[350,84,40],"hsl":[350,73,23],"lab":[21,38,15]},{"name":"Smoky Rose","hex":"855a5c","rgb":[133,90,92],"cmyk":[0,32,31,48],"hsb":[357,32,52],"hsl":[357,19,44],"lab":[43,18,6]},{"name":"Grey Olive","hex":"8a8e91","rgb":[138,142,145],"cmyk":[5,2,0,43],"hsb":[206,5,57],"hsl":[206,3,55],"lab":[59,-1,-2]},{"name":"Pale Sky","hex":"b8d4e3","rgb":[184,212,227],"cmyk":[19,7,0,11],"hsb":[201,19,89],"hsl":[201,43,81],"lab":[83,-6,-11]},{"name":"Frosted Mint","hex":"eeffdb","rgb":[238,255,219],"cmyk":[7,0,14,0],"hsb":[88,14,100],"hsl":[88,100,93],"lab":[98,-12,15]}]

- XML

<palette>
  <color name="Night Bordeaux" hex="66101f" r="102" g="16" b="31" />
  <color name="Smoky Rose" hex="855a5c" r="133" g="90" b="92" />
  <color name="Grey Olive" hex="8a8e91" r="138" g="142" b="145" />
  <color name="Pale Sky" hex="b8d4e3" r="184" g="212" b="227" />
  <color name="Frosted Mint" hex="eeffdb" r="238" g="255" b="219" />
</palette>
---

## 7. Dua fitur interaktif

### Fitur 1 — Pengukur kemiripan real-time (live similarity gauge)
Saat user **mengetik/menyunting** calon judul, dengan *debounce* ~500ms dan
minimal panjang (≥15 karakter), frontend memanggil `/check` dan menampilkan
**gauge beranimasi** ke skor tertinggi + judul termirip + kategori (warna).
Kini panel itu juga bisa **memunculkan cuplikan abstrak** judul termirip on-demand.

- **Manfaat:** alat berubah dari sekali-tembak menjadi bantuan iteratif — user
  memodifikasi judul untuk menurunkan tumpang-tindih *sebelum* submit.
- **Kehati-hatian:** tiap pengetikan (terdebounce) = 1 panggilan embedding. Wajib
  debounce + min length + AbortController, agar tidak membanjiri layanan.

```js
let ctrl
watchDebounced(title, async (val) => {
  if (val.trim().length < 15) return
  ctrl?.abort(); ctrl = new AbortController()
  const res = await checkTitle(val)   // sertakan ctrl.signal pada fetch
  gauge.value = res.top?.percent ?? 0
  nearest.value = res.top             // { title, abstract, category, ... }
}, { debounce: 500 })
```

### Fitur 2 — Peta tema riset jurusan (corpus map berbasis klaster)
Scatter plot 2D **semua ~2000 judul** memakai koordinat `x,y` (UMAP atas embedding
judul). **Titik diwarnai per klaster topik** yang ditemukan otomatis, dengan
legend berupa **kata kunci tiap tema** (dari abstrak). Saat user mengecek judul,
titik query (dari `coord` di respons `/check`) **disorot** di antara tetangga
terdekatnya.

- **Kenapa cocok untuk satu jurusan:** tanpa prodi sebagai pembeda, klaster topik
  mengungkap sub-bidang riset di dalam jurusan. Pesan ke user jadi kuat untuk
  sidang: *"jurusan punya N tema riset; judulmu jatuh di tema X, dekat karya-karya
  ini."*
- **Mode tahun (sekunder):** sediakan tombol untuk **mewarnai per tahun** alih-alih
  per klaster, plus slider/rentang tahun untuk memfilter. Ini menampilkan
  *evolusi tema* — tema mana yang ramai belakangan, mana yang mulai jenuh — nilai
  tambah yang bagus untuk argumen "topik ini sudah/terlalu sering diambil".
- **Data:** Vue membaca `theses_map` dari Supabase (ringan; **tanpa** embedding &
  **tanpa** abstrak). Abstrak titik diambil saat **klik** (query terpisah by id).
- **Implementasi:** library scatter (D3 / Plotly / Chart.js). Interaksi: zoom/pan,
  hover → judul + tahun, **filter per klaster atau per tahun (bukan prodi)**,
  klik titik → judul + tahun + abstrak.

```js
import { supabase } from "@/lib/supabase"
const { data: points } = await supabase
  .from("theses_map").select("id,title,year,x,y,cluster,cluster_label")
// abstrak saat klik:
const { data } = await supabase.from("theses").select("abstract").eq("id", id).single()
```

---

## 8. Kalibrasi ambang & evaluasi (jangan dilewati)

1. Buat ~30–50 pasangan judul berlabel manual (mirip / tidak mirip).
2. Jalankan lewat `/check`, lihat apakah band ambang memisahkan keduanya
   (precision & recall per ambang). Geser ambang di `BANDS`.
3. Bonus N kecil: sampel pasangan acak, plot distribusi `similarity` untuk melihat
   di mana ambang "mirip" sebenarnya jatuh — kalibrasi empiris, bukan tebakan.

---

## 9. Deployment (urutan)

1. **Supabase:** SQL Editor → jalankan `backend/schema.sql`.
2. **Isi korpus (lokal):** dari `backend/`, isi `.env`, siapkan `Corpus.csv`
   (kolom `title, abstract, year`), `python indexer.py` (hasilkan 3 artefak).
   (Index ivfflat opsional, setelah data masuk.)
3. **Push ke GitHub → backend ke HF Space (otomatis)** via GitHub Actions
   (`.github/workflows/deploy-hf.yml`): set secret `HF_TOKEN` di GitHub + `HF_SPACE`
   di workflow; isi secret Space (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_KEY`,
   `FRONTEND_ORIGIN`). Hanya `backend/` yang dikirim; artefak ikut.
4. **frontend → Vercel:** Root Directory `frontend`; set `VITE_PYTHON_API`,
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Deploy.
5. **CORS:** set `FRONTEND_ORIGIN` di HF Space ke domain Vercel-mu.

> Detail langkah-demi-langkah ada di **SETUP.md**.

---

## 10. Environment variables

Lihat `.env.example`. Keamanan:
- `SUPABASE_SERVICE_KEY` (service role) **hanya** untuk layanan Python (server-side).
  **JANGAN PERNAH** di frontend.
- Frontend hanya memakai `anon key` + RLS Supabase.
- `ADMIN_KEY` melindungi `/add`.

---

## 11. Yang BELUM production-grade (jujur)

- **Auth admin minimal** (shared `ADMIN_KEY`). Produksi: Supabase Auth + RLS + role.
- **`UMAP.transform` & `KMeans.predict` untuk titik/klaster baru bersifat
  aproksimasi** — penempatan judul baru di peta tidak seakurat refit penuh. Cukup
  untuk visualisasi. Pertimbangkan re-indexing berkala (mis. tahunan saat update
  data) agar peta & klaster tetap rapi.
- **Cold start** layanan Python (memuat model) bisa beberapa detik pada free tier.
- **Sinyal pendek:** judul hanya 10–15 kata. Title-only adalah desain yang benar
  (input juga selalu judul); menampilkan abstrak di hasil adalah mitigasi praktis.
- **Abstrak tidak dipakai untuk pencarian** (Aturan C), hanya tampilan + label
  klaster. Bila suatu saat ingin channel pencocokan berbasis abstrak, buat
  **terpisah** dengan model retrieval asimetris (E5-style, prefix `query:`/`passage:`),
  jangan dicampur ke `match_titles`.

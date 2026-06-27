"""
app.py — Layanan inferensi (FastAPI).

Endpoint:
  GET  /health                            -> status + model + dimensi + artefak
  POST /check { title, k }                -> top-k judul mirip (skor + kategori) + koordinat query
  POST /add   { title, abstract, year }   (header X-Admin-Key)  -> tambah judul FINAL ke korpus

Model di-load SEKALI saat startup. Jalankan di host yang mendukung ML
(HuggingFace Space / Render / Railway / Fly.io) — BUKAN Vercel (lihat CLAUDE.md).

    uvicorn app:app --host 0.0.0.0 --port 7860
"""

import json
import os
import pickle

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from supabase import create_client

load_dotenv()

# WAJIB sama persis dengan indexer.py (Aturan A di CLAUDE.md)
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
EMBED_DIM = 384
UMAP_MODEL_PATH = "umap_model.pkl"
KMEANS_MODEL_PATH = "kmeans_model.pkl"
CLUSTER_LABELS_PATH = "cluster_labels.json"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
ADMIN_KEY = os.environ["ADMIN_KEY"]
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")

# Band kategori — KALIBRASI dengan data berlabelmu (§8 CLAUDE.md).
# Ambang (0.85 / 0.70) HARUS sinkron dengan frontend/src/lib/bands.js.
# Format: (ambang_minimum, kode, label). Diurut dari tertinggi.
BANDS = [
    (0.85, "sangat_mirip", "Sangat mirip — kemungkinan duplikat, perlu ditinjau"),
    (0.70, "mirip", "Mirip sebagian — periksa pembeda topik"),
    (0.00, "aman", "Relatif aman"),
]

app = FastAPI(title="Deteksi Kemiripan Judul Skripsi")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if FRONTEND_ORIGIN == "*" else [FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"Memuat model {MODEL_NAME}…")
model = SentenceTransformer(MODEL_NAME)
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Artefak dari indexer.py (peta + klaster untuk judul baru) ──────────────────
# Opsional tapi disarankan: tanpa ini /add tetap jalan, namun x/y & cluster judul
# baru kosong (dan koordinat query di /check dilewati).
reducer = None
if os.path.exists(UMAP_MODEL_PATH):
    with open(UMAP_MODEL_PATH, "rb") as f:
        reducer = pickle.load(f)
    print("Reducer UMAP dimuat (koordinat peta judul baru aktif).")
else:
    print("umap_model.pkl tidak ditemukan — koordinat peta untuk judul baru dilewati.")

kmeans = None
if os.path.exists(KMEANS_MODEL_PATH):
    with open(KMEANS_MODEL_PATH, "rb") as f:
        kmeans = pickle.load(f)
    print("Model KMeans dimuat (prediksi klaster judul baru aktif).")
else:
    print("kmeans_model.pkl tidak ditemukan — klaster judul baru dilewati.")

cluster_labels = {}
if os.path.exists(CLUSTER_LABELS_PATH):
    with open(CLUSTER_LABELS_PATH, "r", encoding="utf-8") as f:
        cluster_labels = json.load(f)   # {"0": "kata · kata", ...}


def embed(text: str) -> np.ndarray:
    return model.encode([text], normalize_embeddings=True)[0]


def vec_to_pgvector(v: np.ndarray) -> str:
    return "[" + ",".join(f"{x:.7f}" for x in v) + "]"


def coord_of(v: np.ndarray):
    if reducer is None:
        return None
    xy = reducer.transform(v.reshape(1, -1))[0]
    return {"x": float(xy[0]), "y": float(xy[1])}


def cluster_of(v: np.ndarray):
    """(cluster_id, cluster_label) untuk judul baru, atau (None, None) bila artefak absen."""
    if kmeans is None:
        return None, None
    cid = int(kmeans.predict(v.reshape(1, -1))[0])
    return cid, cluster_labels.get(str(cid))


def categorize(sim: float):
    for thr, code, label in BANDS:
        if sim >= thr:
            return code, label
    return "aman", "Relatif aman"


class CheckIn(BaseModel):
    title: str
    k: int = 10


class AddIn(BaseModel):
    title: str
    abstract: str | None = None
    year: int | None = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "dim": EMBED_DIM,
        "map": reducer is not None,
        "clusters": kmeans is not None,
    }


@app.post("/check")
def check(body: CheckIn):
    title = body.title.strip()
    if len(title) < 5:
        raise HTTPException(400, "Judul terlalu pendek (min 5 karakter).")

    q = embed(title)
    res = sb.rpc("match_titles", {
        "query_embedding": vec_to_pgvector(q),
        "match_count": body.k,
    }).execute()

    matches = res.data or []
    for m in matches:
        sim = float(m["similarity"])
        code, label = categorize(sim)
        m["percent"] = round(sim * 100, 1)        # NB: skor relatif, bukan "persen kata sama"
        m["category"] = code
        m["category_label"] = label

    return {
        "query": title,
        "matches": matches,                        # tiap item: id, title, abstract, year, similarity, percent, category…
        "top": matches[0] if matches else None,
        "coord": coord_of(q),                      # titik query di peta (Fitur 2)
    }


@app.post("/add")
def add(body: AddIn, x_admin_key: str = Header(default="")):
    # Gerbang korpus (Aturan B): hanya admin yang boleh menambah judul final.
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(401, "Admin key salah.")

    title = body.title.strip()
    if len(title) < 5:
        raise HTTPException(400, "Judul terlalu pendek (min 5 karakter).")

    q = embed(title)
    cid, clabel = cluster_of(q)
    row = {
        "title": title,
        "abstract": (body.abstract or "").strip() or None,
        "year": body.year,
        "embedding": vec_to_pgvector(q),
        "cluster": cid,
        "cluster_label": clabel,
    }
    c = coord_of(q)
    if c:
        row["x"], row["y"] = c["x"], c["y"]

    inserted = sb.table("theses").insert(row).execute()
    return {"inserted": inserted.data}

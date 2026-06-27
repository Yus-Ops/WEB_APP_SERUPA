"""
indexer.py — Batch indexing korpus (jalan SEKALI di LOKAL, BUKAN di HF).

Alur (CLAUDE.md §5):
  CSV (scraping ';' kolom nama;judul;abstrak;tahun;prodi  ATAU  bersih title,abstract,year)
    -> load_corpus: filter prodi keperawatan + bersihkan ringan      (corpus_io.py)
    -> embed JUDUL (normalize -> cosine = dot product)
    -> KMeans atas embedding judul                  -> cluster
    -> label tiap klaster via TF-IDF atas ABSTRAK   -> cluster_label  (topics.py)
    -> UMAP atas embedding judul                     -> x, y (koordinat peta)
    -> insert ke Supabase (batch)

Menyimpan 3 ARTEFAK yang dipakai app.py untuk menempatkan & melabeli judul baru:
  umap_model.pkl, kmeans_model.pkl, cluster_labels.json

    python indexer.py
"""

import json
import os
import pickle
import sys

import numpy as np
import pandas as pd
import umap
from dotenv import load_dotenv
from sklearn.cluster import KMeans
from sentence_transformers import SentenceTransformer
from supabase import create_client

from corpus_io import load_corpus
from topics import label_clusters

# Windows: paksa stdout UTF-8 agar '·'/'…' di log tak crash di console cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

load_dotenv()

# ── Konfigurasi ───────────────────────────────────────────────────────────────
# PENTING: MODEL_NAME harus SAMA PERSIS dengan app.py (Aturan A CLAUDE.md).
# Ganti model -> embed ulang SELURUH korpus + ubah EMBED_DIM & vector(...) di schema.sql.
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"   # 384 dim
# Alternatif Indonesia (768 dim): "firqaaa/indo-sentence-bert-base"
EMBED_DIM = 384

# Jumlah klaster topik (KMeans). Override via env N_CLUSTERS. ~10 cocok utk ~2200 judul.
N_CLUSTERS = int(os.getenv("N_CLUSTERS", "10"))

UMAP_MODEL_PATH = "umap_model.pkl"
KMEANS_MODEL_PATH = "kmeans_model.pkl"
CLUSTER_LABELS_PATH = "cluster_labels.json"
CSV_PATH = os.getenv("CORPUS_CSV", "corpus.csv")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]   # service role — server-side saja!


def vec_to_pgvector(v: np.ndarray) -> str:
    """numpy vector -> string literal pgvector '[a,b,c]' (aman untuk insert)."""
    return "[" + ",".join(f"{x:.7f}" for x in v) + "]"


def main():
    # 1) Muat korpus: baca (';'/','), filter prodi keperawatan, bersihkan ringan.
    df = load_corpus(CSV_PATH)
    titles = df["title"].tolist()
    abstracts = df["abstract"].astype(str).tolist()
    years = [int(y) if pd.notna(y) else None for y in df["year"]]
    print(f"Memuat {len(titles)} judul dari {CSV_PATH}")

    # 2) Embedding JUDUL (normalize -> cosine = dot product). Abstrak TIDAK
    #    di-embed untuk pencarian (Aturan C) — hanya dipakai melabeli klaster.
    print(f"Memuat model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    print("Meng-embed judul…")
    emb = model.encode(
        titles, normalize_embeddings=True, batch_size=64, show_progress_bar=True
    )
    assert emb.shape[1] == EMBED_DIM, (
        f"Dim model = {emb.shape[1]} tapi EMBED_DIM = {EMBED_DIM}. "
        f"Samakan EMBED_DIM dan vector(...) di schema.sql."
    )

    # 3) Klaster topik: KMeans atas embedding JUDUL.
    k = max(2, min(N_CLUSTERS, len(titles)))
    print(f"Mengklaster topik (KMeans k={k})…")
    kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
    clusters = kmeans.fit_predict(emb)

    # 4) Label tiap klaster dari TF-IDF atas ABSTRAK anggotanya (topics.py).
    #    Fallback: abstrak kosong (±31% korpus) -> pakai JUDUL agar tak jadi "tema N".
    label_src = [a if a.strip() else titles[i] for i, a in enumerate(abstracts)]
    labels_map = label_clusters(label_src, clusters, top_k=3)   # {cluster_id(int): "kata · kata"}
    print("Label klaster (cluster_label):")
    for c in sorted(labels_map):
        n = int(np.sum(clusters == c))
        print(f"  [{c}] {labels_map[c]}   ({n} judul)")

    # 5) Koordinat 2D (UMAP) untuk peta; simpan reducer agar app.py bisa
    #    menempatkan judul baru pada peta yang sama.
    print("Menghitung koordinat 2D (UMAP)…")
    n_neighbors = min(15, max(2, len(titles) - 1))
    reducer = umap.UMAP(
        n_neighbors=n_neighbors, min_dist=0.1, metric="cosine", random_state=42
    )
    coords = reducer.fit_transform(emb)

    # 6) Simpan 3 artefak (dipakai app.py untuk judul baru: koordinat + klaster + label).
    with open(UMAP_MODEL_PATH, "wb") as f:
        pickle.dump(reducer, f)
    with open(KMEANS_MODEL_PATH, "wb") as f:
        pickle.dump(kmeans, f)
    with open(CLUSTER_LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {str(c): lbl for c, lbl in labels_map.items()},
            f, ensure_ascii=False, indent=2,
        )
    print(f"Artefak disimpan: {UMAP_MODEL_PATH}, {KMEANS_MODEL_PATH}, {CLUSTER_LABELS_PATH}")

    # 7) Insert ke Supabase (batch).
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    rows = []
    for i, t in enumerate(titles):
        cid = int(clusters[i])
        rows.append({
            "title": t,
            "abstract": abstracts[i] or None,
            "year": years[i],
            "embedding": vec_to_pgvector(emb[i]),
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
            "cluster": cid,
            "cluster_label": labels_map.get(cid),
        })

    print(f"Meng-insert {len(rows)} baris ke Supabase…")
    BATCH = 200
    for j in range(0, len(rows), BATCH):
        sb.table("theses").insert(rows[j:j + BATCH]).execute()
        print(f"  {min(j + BATCH, len(rows))}/{len(rows)}")

    print("Selesai. (Opsional) buat index ivfflat SETELAH ini — lihat schema.sql.")


if __name__ == "__main__":
    main()

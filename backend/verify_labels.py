"""
verify_labels.py — Verifikasi label klaster TANPA Supabase / model embedding berat.

Tujuan (perbaikan.md): membuktikan label tema yang dihasilkan benar-benar
KEPERAWATAN dan saling beda (diskriminatif), serta dibaca dari DATA — bukan
di-hardcode.

Pipeline produksi (indexer.py) memakai embedding sentence-transformers (butuh
torch + bobot model) lalu KMeans, lalu `topics.label_clusters`. Di lingkungan ini
model berat tidak terpasang, jadi untuk verifikasi cepat kita gantikan SATU langkah
saja — sumber vektor untuk KMeans — dengan TF-IDF judul (scikit-learn). Langkah yang
DIPERBAIKI, yakni PELABELAN klaster (`topics.label_clusters`: TF-IDF atas ABSTRAK +
stopword keperawatan), IDENTIK dengan indexer.py. Pemuatan korpus
(`corpus_io.load_corpus`: filter prodi + pembersihan) juga sama persis.

    python verify_labels.py            # k default = 10
    N_CLUSTERS=12 python verify_labels.py
"""

import os
import sys

from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer

from corpus_io import load_corpus
from topics import STOPWORDS, TOKEN_PATTERN, label_clusters

# Windows: paksa stdout UTF-8 agar '·'/'→' di label tak crash di console cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

CSV_PATH = os.getenv("CORPUS_CSV", "corpus.csv")
N_CLUSTERS = int(os.getenv("N_CLUSTERS", "10"))


def main():
    if not os.path.exists(CSV_PATH):
        sys.exit(f"corpus.csv tidak ditemukan di {CSV_PATH!r}")

    df = load_corpus(CSV_PATH)   # baca + filter prodi + bersihkan (sama dgn indexer.py)
    titles = df["title"].tolist()
    abstracts = df["abstract"].astype(str).tolist()
    k = max(2, min(N_CLUSTERS, len(titles)))
    print(f"Korpus: {len(titles)} judul · {CSV_PATH}  →  KMeans k={k}\n")

    # 1) Vektor judul (stand-in offline untuk embedding semantik) → KMeans
    title_vec = TfidfVectorizer(
        stop_words=STOPWORDS, token_pattern=TOKEN_PATTERN, ngram_range=(1, 2)
    )
    X = title_vec.fit_transform(titles)
    clusters = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(X)

    # 2) PELABELAN — kode produksi yang sama persis (indexer.py memanggil ini juga)
    #    Fallback abstrak kosong -> judul (sama dgn indexer.py).
    label_src = [a if a.strip() else titles[i] for i, a in enumerate(abstracts)]
    labels = label_clusters(label_src, clusters, top_k=3)

    # 3) Cetak label + contoh anggota agar tema bisa diperiksa manual
    print("=== Daftar label klaster (dari cluster_label = TF-IDF atas abstrak) ===\n")
    for c in sorted(labels):
        members = [titles[i] for i in range(len(titles)) if clusters[i] == c]
        print(f"[{c}] {labels[c]}   ({len(members)} judul)")
        for t in members[:3]:
            print(f"      · {t}")
        print()

    print("Ringkas:")
    print("  " + "  |  ".join(f"{c}: {labels[c]}" for c in sorted(labels)))


if __name__ == "__main__":
    main()

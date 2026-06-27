"""
topics.py — Stopword + pelabelan klaster (TF-IDF atas ABSTRAK).

Dipakai BERSAMA oleh:
  - indexer.py        (pipeline produksi: KMeans embedding judul -> label klaster)
  - verify_labels.py  (verifikasi offline tanpa Supabase/model berat)

Hanya bergantung pada scikit-learn (ringan) — sengaja TANPA torch/sentence-transformers
agar bisa diimpor & diuji tanpa memuat model embedding.

INTI MASALAH (lihat perbaikan.md): pada korpus S1 Ilmu Keperawatan, kata seperti
"pasien", "perawat", "keperawatan", "asuhan", "rumah sakit", "penelitian" muncul di
HAMPIR SEMUA judul/abstrak dan akan mendominasi setiap klaster. Kata-kata itu —
plus kata desain studi ("hubungan", "pengaruh", "gambaran", "faktor"…) — dibuang
sebagai stopword agar label tiap tema DISKRIMINATIF:
    "hipertensi · kepatuhan · tekanan darah"  vs  "asi eksklusif · menyusui · ibu"
bukan mengulang kata yang sudah pasti ada di semua tema.
"""

from collections import defaultdict

from sklearn.feature_extraction.text import TfidfVectorizer

# ── Stopword bahasa Indonesia (kata fungsi) + kata desain-studi yang generik ──
STOPWORDS_ID = {
    # kata fungsi
    "yang", "dan", "di", "ke", "dari", "pada", "untuk", "dengan", "dalam", "atau",
    "terhadap", "ini", "itu", "tersebut", "adalah", "ialah", "akan", "telah", "sudah",
    "oleh", "sebagai", "secara", "antara", "juga", "dapat", "tidak", "ada", "lebih",
    "agar", "karena", "namun", "yaitu", "bagi", "para", "suatu", "satu", "dua", "tiga",
    "saat", "serta", "maupun", "tentang", "setelah", "sebelum", "selama", "menjadi",
    "memiliki", "sangat", "masih", "hingga", "sehingga", "bahwa", "guna", "melalui",
    "saja", "sini", "situ", "kami", "kita", "mereka", "tiap", "setiap", "per", "dll",
    # kata desain studi / kerangka skripsi (generik di SEMUA judul keperawatan)
    "hubungan", "pengaruh", "gambaran", "faktor", "faktorfaktor", "efektivitas",
    "analisis", "studi", "kasus", "deskriptif", "korelasi", "korelasional", "metode",
    "penerapan", "pemberian", "pelaksanaan", "implementasi", "tingkat", "kejadian",
    "tinjauan", "literatur", "review", "berhubungan", "memengaruhi", "mempengaruhi",
    "dipengaruhi", "menunjukkan", "hasil", "data", "sampel", "responden", "populasi",
    "variabel", "teknik", "uji", "nilai", "jumlah", "rata", "skor", "intervensi",
    "perilaku",  # terlalu umum sbg outcome
    # boilerplate struktur skripsi/abstrak (hasil scraping): "Latar belakang :",
    # "Kata Kunci :", "Daftar pustaka :", "53 hal + 6 tabel", "Simpulan :", dst.
    "latar", "belakang", "tujuan", "simpulan", "kesimpulan", "saran", "abstrak",
    "kata", "kunci", "daftar", "pustaka", "halaman", "hal", "tabel", "bab",
    "lampiran", "gambar", "lembar", "masalah", "utama",
}

# ── Stopword DOMAIN keperawatan: kata yang hampir pasti ada di tiap judul/abstrak ─
# Dibuang agar label tidak sekadar mengulang "pasien · perawat · asuhan".
STOPWORDS_DOMAIN = {
    "pasien", "penderita", "klien", "perawat", "keperawatan", "asuhan",
    "perawatan", "rumah", "sakit", "penelitian", "peneliti", "kesehatan",
    "pelayanan", "ruang", "rawat", "inap", "jalan", "bangsal", "poli", "poliklinik",
    "puskesmas", "klinik", "wilayah", "kerja",  # "kerja" tunggal generik; bigram "beban kerja" tetap lolos
    "kampus", "mahasiswa", "tahun", "kota", "kabupaten", "desa", "menggunakan",
    "berbasis", "kondisi", "kebutuhan", "tindakan",
}

# ── Stopword GEOGRAFI (administratif + wilayah Jateng/Semarang tempat institusi) ─
# Korpus dari satu institusi -> nama tempat berulang & MENDOMINASI label klaster
# (mis. "kelurahan muktiharjo · kidul"). Dibuang agar label fokus ke TEMA KLINIS.
STOPWORDS_GEO = {
    "kecamatan", "kelurahan", "dusun", "provinsi", "daerah", "jawa", "tengah",
    "timur", "barat", "utara", "selatan", "pusat",
    "semarang", "demak", "ungaran", "pemalang", "pati", "kendal", "kudus",
    "jepara", "grobogan", "purwodadi", "salatiga", "tegal", "pekalongan",
    "brebes", "blora", "rembang", "batang",
    "gambilangu", "mangkang", "kulon", "sendangmulyo", "muktiharjo", "kidul",
    "pedurungan", "pucang", "gading", "jebed", "genuk", "tlogosari",
    "banyumanik", "tembalang", "gunungpati", "ngaliyan", "gayamsari",
}

# ── Stopword INSTITUSI (RS / bangsal / yayasan) — proper noun, bukan tema klinis ─
STOPWORDS_INST = {
    "rsu", "rsud", "rsi", "rsj", "rsjd", "rsia", "rsdk", "umum",
    "sultan", "agung", "sunan", "kalijaga", "amino", "gondohutomo", "kariadi",
    "tugurejo", "roemani", "muhammadiyah", "islam", "islami", "syariah",
    "panti", "werdha", "wredha", "wening", "wardoyo", "sosial", "rehabilitasi",
    "unit", "instalasi", "bougenville", "baitun", "baitul", "nisa", "athfal",
    "dewi", "kunthi", "kunti", "sdr",
    # akademik (nama kampus/jenjang) — boilerplate, bukan tema klinis
    "unissula", "universitas", "fakultas", "fik", "fkik", "fikkes", "stikes",
    "akper", "akbid", "prodi", "skripsi", "sarjana", "ners", "ilmu",
    "mahasiswi", "baitussalam", "baiturrahman", "baiturrahim",
}

# Catatan: STOPWORDS dipakai pada level TOKEN sebelum n-gram dibentuk, jadi
# bigram seperti "beban kerja" / "tekanan darah" / "gula darah" tetap muncul
# meski "kerja"/"darah" sebagai unigram ikut disaring di tempat lain.
STOPWORDS = sorted(STOPWORDS_ID | STOPWORDS_DOMAIN | STOPWORDS_GEO | STOPWORDS_INST)

# token: hanya huruf, minimal 3 karakter (agar "asi" lolos, "mp"/"6" tidak).
TOKEN_PATTERN = r"(?u)\b[a-zA-Z][a-zA-Z]{2,}\b"


def _dedupe_terms(ranked, top_k):
    """Ambil top_k istilah, lewati yang berbagi token dengan istilah terpilih
    (agar tak muncul 'kualitas hidup' lalu 'kualitas' / 'hidup' yang mubazir)."""
    picked, used = [], set()
    for term in ranked:
        toks = set(term.split())
        if toks & used:
            continue
        picked.append(term)
        used |= toks
        if len(picked) >= top_k:
            break
    return picked


def label_clusters(abstracts, cluster_ids, top_k=3, ngram_range=(1, 2)):
    """Label tiap klaster dari kata kunci TF-IDF atas ABSTRAK anggotanya.

    Tiap klaster diperlakukan sebagai satu "dokumen" (gabungan abstrak anggota);
    TF-IDF lintas-klaster otomatis menekan istilah yang muncul di semua klaster,
    diperkuat oleh daftar STOPWORDS di atas.

    Args:
        abstracts:    iterable teks abstrak (sejajar dengan cluster_ids).
        cluster_ids:  iterable id klaster (int) untuk tiap abstrak.
        top_k:        jumlah kata kunci per label.
    Returns:
        dict {cluster_id (int): "kata1 · kata2 · kata3"}.
    """
    by_cluster = defaultdict(list)
    for text, cid in zip(abstracts, cluster_ids):
        if cid is None:
            continue
        by_cluster[int(cid)].append("" if text is None else str(text))

    ordered = sorted(by_cluster)
    if not ordered:
        return {}

    docs = [" ".join(by_cluster[c]) for c in ordered]
    vec = TfidfVectorizer(
        stop_words=STOPWORDS,
        token_pattern=TOKEN_PATTERN,
        ngram_range=ngram_range,
        sublinear_tf=True,
        min_df=1,
    )
    matrix = vec.fit_transform(docs)
    terms = vec.get_feature_names_out()

    labels = {}
    for row, cid in enumerate(ordered):
        weights = matrix[row].toarray()[0]
        ranked = [terms[i] for i in weights.argsort()[::-1] if weights[i] > 0]
        picked = _dedupe_terms(ranked, top_k)
        labels[cid] = " · ".join(picked) if picked else f"tema {cid}"
    return labels

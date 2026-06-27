"""
corpus_io.py — Pemuat korpus terpadu (dipakai indexer.py & verify_labels.py).

Menangani DUA format:
  - Hasil scraping  : delimiter ';' , kolom  nama;judul;abstrak;tahun;prodi
  - Bersih          : delimiter ',' , kolom  title,abstract,year

Mengembalikan DataFrame seragam berkolom: title, abstract, year.

Aturan (CLAUDE.md):
  - Sistem dilingkup SATU jurusan -> filter prodi (default: keperawatan).
  - Pembersihan RINGAN: rapikan spasi & baris-baru, buang judul kosong + duplikat persis.
  - Tahun non-numerik -> NaN.

Sengaja hanya bergantung pandas (tanpa torch) agar bisa dipakai verify_labels.py offline.
"""

import os
import re

import pandas as pd

# Prodi yang dianggap "satu jurusan keperawatan" (sesuai pilihan scope korpus).
# Selain ini (Pen_Dosen, fpsi, fk, fe, fkg, jur_bidan, lppm, kosong) dibuang.
DEFAULT_PRODI_KEEP = {"fik", "jur_keperawatan", "jur_perawatd3"}

# Pemetaan nama kolom Indonesia -> kanonik.
_RENAME = {"judul": "title", "abstrak": "abstract", "tahun": "year",
           "nama": "author", "prodi": "program"}


def _read_any(path: str) -> pd.DataFrame:
    """Baca CSV scraping (';') atau bersih (',') dengan deteksi encoding sederhana.
    Dianggap benar bila kolom judul/title terdeteksi."""
    last = None
    for sep in (";", ","):
        for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
            try:
                df = pd.read_csv(
                    path, sep=sep, engine="python", quotechar='"',
                    dtype=str, keep_default_na=False, encoding=enc,
                )
            except Exception as e:  # noqa: BLE001 — coba kombinasi berikutnya
                last = e
                continue
            cols = {c.lower().strip() for c in df.columns}
            if {"judul", "title"} & cols:
                return df
    raise RuntimeError(f"Gagal membaca {path!r}: {last}")


def _clean_text(s) -> str:
    """Rapikan whitespace + baris-baru (umum pada abstrak scraping) jadi satu spasi."""
    if s is None:
        return ""
    return re.sub(r"\s+", " ", str(s)).strip()


def load_corpus(path: str | None = None, prodi_keep=DEFAULT_PRODI_KEEP) -> pd.DataFrame:
    path = path or os.getenv("CORPUS_CSV", "corpus.csv")
    df = _read_any(path)
    df = df.rename(columns={c: _RENAME.get(c.lower().strip(), c.lower().strip())
                            for c in df.columns})

    # Filter prodi bila kolomnya ada & filter diminta (format bersih tak punya 'program').
    if prodi_keep and "program" in df.columns:
        keep = {p.lower() for p in prodi_keep}
        df = df[df["program"].str.strip().str.lower().isin(keep)]

    if "title" not in df.columns:
        raise RuntimeError(f"Kolom judul/title tak ada di {path!r}. Kolom: {list(df.columns)}")
    if "abstract" not in df.columns:
        df["abstract"] = ""

    df["title"] = df["title"].map(_clean_text)
    df["abstract"] = df["abstract"].map(_clean_text)
    df["year"] = (pd.to_numeric(df["year"].map(_clean_text), errors="coerce")
                  if "year" in df.columns else pd.NA)

    # Pembersihan ringan: buang judul kosong + duplikat persis.
    df = df[df["title"] != ""]
    df = df.drop_duplicates(subset=["title"]).reset_index(drop=True)

    return df[["title", "abstract", "year"]]

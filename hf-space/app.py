"""
Serupa — Embedding Space (FastAPI + sentence-transformers).

Meng-host BAAI/bge-m3 dan mengembalikan vektor 1024-dim (L2-normalized) dengan
bentuk array yang sama seperti feature-extraction HF Inference API, sehingga
klien Serupa (api/_lib/embed.js) tidak perlu diubah.

Dipanggil server-to-server (Vercel /api/scan & skrip embed-corpus). Untuk
privasi (PRD §12), jadikan Space PRIVAT — akses lewat HF_TOKEN pemilik.
"""
import os
from typing import List, Union

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

MODEL_ID = os.environ.get("EMBED_MODEL", "BAAI/bge-m3")

app = FastAPI(title="Serupa Embedding", version="1.0.0")

# Muat model sekali saat start (image sudah membawa cache → cepat).
model = SentenceTransformer(MODEL_ID, device="cpu")


class EmbedRequest(BaseModel):
    inputs: Union[List[str], str]
    # 'options' dikirim klien (mis. {"wait_for_model": true}); diterima & diabaikan.
    options: dict | None = None


@app.get("/")
def root():
    return {"ok": True, "service": "serupa-embedding", "model": MODEL_ID}


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_ID}


@app.post("/embed")
def embed(req: EmbedRequest):
    texts = [req.inputs] if isinstance(req.inputs, str) else list(req.inputs)
    if not texts:
        raise HTTPException(status_code=400, detail="Field 'inputs' kosong.")
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    # → [[...1024...], ...] : satu vektor per input (kontrak sama dg embed.js).
    return vectors.tolist()

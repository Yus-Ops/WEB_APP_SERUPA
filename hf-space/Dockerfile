# Serupa — Embedding Space (Docker, CPU). Model di-bake ke image saat build
# agar container start cepat & request pertama tidak menunggu unduhan model.
FROM python:3.11-slim

ENV EMBED_MODEL=BAAI/bge-m3 \
    HF_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1

# --- Dependensi (sebagai root → site-packages global, terbaca semua user) ----
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# --- User non-root untuk runtime (pola standar HF Docker Space) --------------
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR /app

# Pra-unduh model ke cache user (bge-m3 publik, tanpa token).
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"

COPY --chown=user app.py .

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]

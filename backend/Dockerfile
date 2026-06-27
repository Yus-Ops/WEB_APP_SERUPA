# Dockerfile — untuk HuggingFace Space (SDK: docker)
# Menjalankan layanan FastAPI (app.py) di port 7860 (port default HF Spaces).
FROM python:3.11-slim

# HF Spaces menjalankan kontainer sebagai user non-root (uid 1000).
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface

WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Salin kode + artefak model (app.py, umap_model.pkl, kmeans_model.pkl, cluster_labels.json)
COPY --chown=user . .

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]

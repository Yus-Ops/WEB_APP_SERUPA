"""
Serupa — deploy folder hf-space/ ke sebuah Hugging Face Space (Docker).

Dipakai oleh GitHub Actions. Membuat Space bila belum ada, lalu meng-upload
isi folder hf-space/ ke root Space (sinkron: berkas yang hilang ikut dihapus).

Env yang dibutuhkan:
  HF_TOKEN     token HF dengan izin write (GitHub secret)
  HF_SPACE_ID  id Space, mis. "namauser/serupa-embed" (GitHub variable)
"""
import os
import sys

from huggingface_hub import HfApi

token = os.environ.get("HF_TOKEN")
space_id = os.environ.get("HF_SPACE_ID")

if not token:
    sys.exit("✖ HF_TOKEN belum diset (GitHub → Settings → Secrets → Actions).")
if not space_id:
    sys.exit("✖ HF_SPACE_ID belum diset (GitHub → Settings → Variables), mis. namauser/serupa-embed.")

api = HfApi(token=token)

# Buat Space (Docker) bila belum ada. private=True untuk menjaga privasi (§12);
# Space yang sudah ada tidak diubah visibilitasnya oleh exist_ok.
api.create_repo(
    repo_id=space_id,
    repo_type="space",
    space_sdk="docker",
    private=True,
    exist_ok=True,
)

api.upload_folder(
    repo_id=space_id,
    repo_type="space",
    folder_path="hf-space",
    commit_message="Deploy embedding space via GitHub Actions",
    delete_patterns=["*"],  # sinkron penuh: hapus berkas yang tak ada di hf-space/
)

print(f"✔ Terkirim ke https://huggingface.co/spaces/{space_id}")
print("  Space akan build ulang (build pertama ±10–15 mnt karena bake model).")

Label "Tema riset" di peta korpus menampilkan tema ilmu komputer (deep learning,
IoT, sistem informasi, SAW/AHP, dll). Itu SALAH: korpus proyek ini khusus
S1 Ilmu Keperawatan, jadi temanya harus seputar keperawatan (mis. asuhan
keperawatan, kecemasan/ansietas, kualitas hidup, kepatuhan minum obat,
hipertensi/diabetes/penyakit kronis, edukasi/promosi kesehatan, dukungan keluarga,
manajemen nyeri, perawatan luka, kesehatan ibu & anak/ASI/postpartum, lansia,
beban kerja & kinerja perawat, kepuasan pasien).

Telusuri dari mana label tema berasal, lalu perbaiki:
1. Jika label di-hardcode (array statis di komponen legend/peta), hapus. Label
   HARUS dibaca dari kolom cluster_label tabel theses di Supabase, bukan ditulis manual.
2. Jika app masih pakai data contoh bertema CS, ganti agar memakai korpus
   keperawatan asli. Jika perlu data sementara, buat data contoh bertema
   KEPERAWATAN (bukan CS), tapi jalur sebenarnya tetap ambil label dari cluster_label.
3. Pastikan indexer menghasilkan label dari data: KMeans atas embedding judul,
   lalu kata kunci tiap klaster via TF-IDF atas ABSTRAK anggotanya.

Kualitas label (penting): kata "pasien", "perawat", "keperawatan", "asuhan",
"rumah sakit", "penelitian" muncul di hampir semua judul/abstrak keperawatan dan
akan mendominasi semua klaster. Tambahkan kata-kata terlalu-umum ini ke daftar
stopword TF-IDF (di luar stopword bahasa Indonesia biasa) supaya label tiap tema
DISKRIMINATIF, mis. "hipertensi · kepatuhan · obat" vs "postpartum · ASI · ibu",
bukan mengulang kata yang sudah pasti ada di semua tema.

Setelah perbaikan: jalankan ulang indexer, lalu cetak daftar label klaster yang
dihasilkan agar bisa kuverifikasi temanya benar-benar keperawatan dan saling beda.

Di heading hero "Sebelum diajukan, lihat di mana judulmu jatuh", kata "jatuh"
dimiringkan (italic) dan huruf "j" italic pada font serif ini tampak jelek
(descender-nya canggung). Perbaiki tipografinya — pilih pendekatan yang paling rapi:
1. Ganti font display heading ke serif yang italic-nya bersih (coba beberapa lalu
   pilih terbaik: Fraunces, Newsreader, Source Serif 4, Lora) dan pastikan glyph
   "j" italic-nya bagus; ATAU
2. Hilangkan italic pada "jatuh", beri penekanan dengan cara lain (warna aksen
   atau weight lebih tebal) supaya tidak bergantung pada italic; ATAU
3. Pertahankan italic tapi hindari memiringkan kata berdescender bermasalah.

Kriteria diterima: huruf "j" pada heading terlihat bersih dan proporsional pada
ukuran besar, dan penekanan pada "jatuh" tetap terasa. Tunjukkan hasilnya.
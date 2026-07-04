<script setup>
import PublicNavbar from '@/components/layout/PublicNavbar.vue'
import PublicFooter from '@/components/layout/PublicFooter.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ResultCard from '@/components/scan/ResultCard.vue'
import BandBadge from '@/components/ui/BandBadge.vue'
import { formatScore } from '@/lib/format'

// Contoh hasil (FL5) — data ilustrasi statis (bentuk mengikuti kontrak §11.2)
// agar landing publik tak bergantung pada backend/scan yang butuh login.
const demoResults = [
  {
    rank: 1,
    score: 0.86,
    band: 'Tinggi',
    thesis: {
      id: 't003',
      title:
        'Efektivitas Senam Kaki Diabetik terhadap Penurunan Kadar Glukosa Darah Sewaktu (GDS) pada Pasien Diabetes Melitus Tipe II',
      author: 'Desy Rihandika Risnawati',
      year: 2015,
      abstract:
        'Latar belakang: Kadar glukosa darah pada pasien diabetes melitus tipe II cenderung tinggi akibat kelainan sekresi maupun kerja insulin serta kurangnya aktivitas fisik. Penelitian ini bertujuan mengetahui perbedaan nilai GDS sebelum dan sesudah senam kaki diabetik antara kelompok perlakuan dan kelompok kontrol. Metode: Quasy experiment dengan rancangan pretest-posttest with control group.',
      sourceUrl: 'https://repository.unissula.ac.id/thesis/t003',
    },
  },
  {
    rank: 2,
    score: 0.68,
    band: 'Sedang',
    thesis: {
      id: 't018',
      title:
        'Pengaruh Relaksasi Otogenik terhadap Penurunan Kadar Glukosa Darah Sewaktu (GDS) pada Pasien Diabetes Melitus Tipe II',
      author: 'Andi Mukarrama',
      year: 2015,
      abstract:
        'Latar belakang: Studi pendahuluan menemukan rata-rata kadar glukosa darah sewaktu pasien diabetes melitus tipe II yang menjalani rawat inap berkisar 200–400 mg/dl. Relaksasi otogenik diduga dapat membantu menurunkan kadar glukosa darah.',
      sourceUrl: 'https://repository.unissula.ac.id/thesis/t018',
    },
  },
  {
    rank: 3,
    score: 0.57,
    band: 'Rendah',
    thesis: {
      id: 't024',
      title:
        'Hubungan Konsumsi Makanan Tinggi Kolesterol dengan Kejadian Penyakit Jantung Koroner Berulang',
      author: 'Laila Hidayatul Hikmah',
      year: 2017,
      abstract:
        'Latar belakang: Penyakit jantung koroner adalah penyumbatan arteri koronaria akibat aterosklerosis yang dipicu pola hidup tidak sehat, di antaranya konsumsi makanan tinggi kolesterol.',
      sourceUrl: 'https://repository.unissula.ac.id/thesis/t024',
    },
  },
]
const demoTop = demoResults[0]

const steps = [
  {
    n: '1',
    title: 'Masukkan rencana topik',
    body: 'Tuliskan judul dan ringkasan rencana 2–4 kalimat. Ringkasan penting agar makna topik Anda terbaca utuh, bukan hanya kata pada judul.',
  },
  {
    n: '2',
    title: 'Sistem mencari kemiripan makna',
    body: 'Rencana Anda dibandingkan dengan ±2.000 skripsi FIK menggunakan kemiripan semantik — mengukur kedekatan makna, bukan sekadar kecocokan kata.',
  },
  {
    n: '3',
    title: 'Tinjau bersama pembimbing',
    body: 'Lihat penelitian termirip beserta abstraknya. Anda dan pembimbing menilai apakah topik benar-benar tumpang tindih.',
  },
]

const limits = [
  {
    title: 'Bukan alat plagiarisme',
    body: 'Serupa mengukur kemiripan topik/ide, bukan kesamaan kalimat kata-per-kata seperti Turnitin.',
  },
  {
    title: 'Bukan vonis otomatis',
    body: 'Tidak ada ambang yang memblokir atau menolak topik. Skor adalah bukti untuk dinilai, bukan keputusan.',
  },
  {
    title: 'Bukan pengganti pembimbing',
    body: 'Keputusan akhir kelayakan topik tetap ada pada mahasiswa dan dosen pembimbing.',
  },
]
</script>

<template>
  <div class="landing">
    <PublicNavbar />

    <!-- FL2 · Hero -->
    <section class="hero">
      <div class="container hero__grid">
        <div class="hero__copy">
          <span class="eyebrow">FIK UNISSULA · Analisis Kemiripan Judul</span>
          <h1 class="hero__title">
            Pastikan rencana skripsi Anda <span class="hl">belum banyak diteliti</span>.
          </h1>
          <p class="hero__sub">
            Serupa membandingkan rencana topik Anda dengan ribuan skripsi keperawatan berdasarkan
            <strong>kedekatan makna</strong> — lalu menyajikan bukti agar Anda dan pembimbing bisa
            menilai bersama.
          </p>
          <div class="hero__cta">
            <AppButton to="/masuk" variant="primary" size="lg">Masuk dengan NIM</AppButton>
            <AppButton href="#cara-kerja" variant="secondary" size="lg">Lihat Cara Kerja</AppButton>
          </div>
          <p class="hero__note">
            Alat bantu keputusan — bukan vonis, bukan alat plagiarisme.
          </p>
        </div>

        <!-- Visual pendukung: mock panel scan -->
        <div class="hero__visual" aria-hidden="true">
          <div class="mock">
            <div class="mock__bar">
              <span class="mock__dot" /><span class="mock__dot" /><span class="mock__dot" />
            </div>
            <div class="mock__body">
              <p class="mock__label">Rencana topik</p>
              <div class="mock__input">Senam kaki untuk menurunkan gula darah pasien diabetes…</div>
              <div class="mock__btn">Analisis kemiripan</div>
              <p class="mock__label mock__label--mt">Penelitian termirip</p>
              <div v-for="r in demoResults" :key="r.thesis.id" class="mock__row">
                <BandBadge :band="r.band" :score="r.score" size="sm" />
                <span class="mock__rowTitle">{{ r.thesis.title }}</span>
                <span class="mock__score">{{ formatScore(r.score) }}</span>
              </div>
            </div>
          </div>
          <div class="hero__blob hero__blob--1" />
          <div class="hero__blob hero__blob--2" />
        </div>
      </div>
    </section>

    <!-- FL3 · Apa itu Serupa (framing) -->
    <section id="tentang" class="section">
      <div class="container section__narrow">
        <span class="eyebrow">Apa itu Serupa</span>
        <h2 class="section__title">Alat bantu keputusan, bukan gerbang otomatis.</h2>
        <p class="section__lead">
          Serupa membantu mahasiswa FIK UNISSULA mengevaluasi apakah rencana topik skripsi tumpang
          tindih dengan penelitian yang sudah ada. Sistem menyajikan skor kemiripan dan penelitian
          termirip beserta abstraknya — <strong>lalu manusia yang menilai</strong>. Tidak ada satu
          angka pun yang secara adil bisa memvonis sebuah topik “sudah pernah diteliti”, karena dua
          skripsi bisa mirip secara teks namun sah berbeda dari sisi populasi, lokasi, atau desain.
        </p>
      </div>
    </section>

    <!-- FL4 · Cara Kerja -->
    <section id="cara-kerja" class="section section--tint">
      <div class="container">
        <div class="section__head">
          <span class="eyebrow">Cara Kerja</span>
          <h2 class="section__title">Tiga langkah sederhana.</h2>
        </div>
        <div class="steps">
          <div v-for="s in steps" :key="s.n" class="step">
            <span class="step__num">{{ s.n }}</span>
            <h3 class="step__title">{{ s.title }}</h3>
            <p class="step__body">{{ s.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FL5 · Contoh Hasil -->
    <section class="section">
      <div class="container section__demo">
        <div class="section__demoCopy">
          <span class="eyebrow">Contoh Hasil</span>
          <h2 class="section__title">Skor dulu, lalu buktinya.</h2>
          <p class="section__lead">
            Setiap hasil menampilkan pita kemiripan dan angka dua desimal, diikuti judul, penulis,
            tahun, dan abstrak lengkap. Abstrak inilah “penjelasan”-nya: dari situ Anda menilai
            sendiri apakah perbedaan populasi atau metode membuat topik Anda tetap layak.
          </p>
          <p class="section__demoHint">
            Contoh ilustrasi tampilan hasil analisis kemiripan.
          </p>
        </div>
        <div class="section__demoCard">
          <ResultCard v-if="demoTop" :result="demoTop" />
        </div>
      </div>
    </section>

    <!-- FL6 · Batasan -->
    <section id="batasan" class="section section--tint">
      <div class="container">
        <div class="section__head">
          <span class="eyebrow">Batasan & Posisi</span>
          <h2 class="section__title">Yang Serupa <em>bukan</em>.</h2>
        </div>
        <div class="limits">
          <div v-for="l in limits" :key="l.title" class="limit">
            <span class="limit__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </span>
            <div>
              <h3 class="limit__title">{{ l.title }}</h3>
              <p class="limit__body">{{ l.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FL7 · CTA akhir -->
    <section class="section">
      <div class="container">
        <div class="cta">
          <h2 class="cta__title">Siap mengecek rencana topik Anda?</h2>
          <p class="cta__sub">Masuk dengan NIM untuk mulai menganalisis dan menyimpan riwayat scan.</p>
          <div class="cta__actions">
            <AppButton to="/masuk" variant="accent" size="lg">Masuk untuk mulai</AppButton>
            <AppButton to="/daftar" variant="ghost" size="lg">Belum punya akun? Daftar</AppButton>
          </div>
        </div>
      </div>
    </section>

    <PublicFooter />
  </div>
</template>

<style scoped>
/* ---- Hero ---- */
.hero {
  position: relative;
  padding: var(--space-20) 0 var(--space-16);
  background:
    radial-gradient(120% 80% at 80% -10%, var(--color-primary-050) 0%, transparent 55%),
    var(--color-background);
  overflow: hidden;
}
.hero__grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: var(--space-12);
  align-items: center;
}
.hero__title {
  font-size: var(--text-display);
  line-height: 1.08;
  letter-spacing: -0.02em;
  margin: var(--space-4) 0 var(--space-5);
}
.hero__title .hl {
  color: var(--color-primary-700);
  position: relative;
  white-space: nowrap;
}
.hero__sub {
  font-size: var(--text-lg);
  color: var(--color-text-muted);
  max-width: 52ch;
}
.hero__cta {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-8);
  flex-wrap: wrap;
}
.hero__note {
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
}

.hero__visual {
  position: relative;
}
.mock {
  position: relative;
  z-index: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.mock__bar {
  display: flex;
  gap: 6px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-primary-050);
}
.mock__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-primary-200);
}
.mock__body {
  padding: var(--space-5);
}
.mock__label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-subtle);
  margin-bottom: var(--space-2);
}
.mock__label--mt {
  margin-top: var(--space-5);
}
.mock__input {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  background: var(--color-background);
}
.mock__btn {
  margin-top: var(--space-3);
  padding: 11px;
  text-align: center;
  border-radius: var(--radius-md);
  background: var(--color-primary-700);
  color: #fff;
  font-weight: var(--font-weight-bold);
  font-size: var(--text-sm);
}
.mock__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}
.mock__row:last-child {
  border-bottom: none;
}
.mock__rowTitle {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mock__score {
  font-weight: var(--font-weight-black);
  font-size: var(--text-sm);
  color: var(--color-primary-800);
  font-variant-numeric: tabular-nums;
}
.hero__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(8px);
  z-index: 0;
}
.hero__blob--1 {
  width: 120px;
  height: 120px;
  background: var(--color-accent-050);
  top: -30px;
  right: -20px;
}
.hero__blob--2 {
  width: 90px;
  height: 90px;
  background: var(--color-primary-100);
  bottom: -24px;
  left: -24px;
}

/* ---- Sections ---- */
.section {
  padding: var(--space-20) 0;
}
.section--tint {
  background: var(--color-primary-050);
}
.section__narrow {
  max-width: 760px;
}
.section__title {
  font-size: var(--text-3xl);
  margin: var(--space-3) 0 var(--space-4);
}
.section__title em {
  font-style: italic;
  color: var(--color-primary-700);
}
.section__lead {
  font-size: var(--text-lg);
  color: var(--color-text-muted);
}
.section__head {
  text-align: center;
  max-width: 640px;
  margin: 0 auto var(--space-10);
}

/* Steps */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}
.step {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}
.step__num {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-primary-100);
  color: var(--color-primary-800);
  font-weight: var(--font-weight-black);
  font-size: var(--text-xl);
  margin-bottom: var(--space-4);
}
.step__title {
  font-size: var(--text-lg);
  margin-bottom: var(--space-2);
}
.step__body {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

/* Demo */
.section__demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12);
  align-items: center;
}
.section__demoHint {
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
  font-style: italic;
}

/* Limits */
.limits {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
}
.limit {
  display: flex;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}
.limit__mark {
  flex-shrink: 0;
  color: var(--color-primary-600);
}
.limit__mark svg {
  width: 24px;
  height: 24px;
}
.limit__title {
  font-size: var(--text-lg);
  margin-bottom: 4px;
}
.limit__body {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* CTA */
.cta {
  text-align: center;
  padding: var(--space-16) var(--space-8);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(90% 140% at 50% 0%, var(--color-primary-100) 0%, transparent 60%),
    var(--color-primary-050);
  border: 1px solid var(--color-primary-100);
}
.cta__title {
  font-size: var(--text-3xl);
}
.cta__sub {
  margin: var(--space-3) 0 var(--space-8);
  color: var(--color-text-muted);
  font-size: var(--text-lg);
}
.cta__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
}

/* ---- Responsive ---- */
@media (max-width: 900px) {
  .hero__grid,
  .section__demo {
    grid-template-columns: 1fr;
  }
  .hero__visual {
    order: -1;
  }
  .steps,
  .limits {
    grid-template-columns: 1fr;
  }
  .hero__title {
    font-size: 38px;
  }
  .section {
    padding: var(--space-16) 0;
  }
}
</style>

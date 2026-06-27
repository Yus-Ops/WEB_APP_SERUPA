<script setup>
// Halaman depan (landing) profesional — perbaikan §4.
// Memakai token desain yang sudah ada (.container, .card, .btn-*, palet, Lato).

// ── Ilustrasi hero: scatter berklaster deterministik (echo dari Peta Tema) ────
const clusters = [
  { c: "#66101f", cx: 92, cy: 84 },
  { c: "#2f7088", cx: 214, cy: 102 },
  { c: "#b07d2e", cx: 322, cy: 92 },
  { c: "#5f7d3f", cx: 300, cy: 232 },
  { c: "#4f6480", cx: 104, cy: 224 },
  { c: "#9c4f6b", cx: 206, cy: 252 },
]
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(7)
const dots = clusters.flatMap((cl) =>
  Array.from({ length: 7 }, () => ({
    x: cl.cx + (rng() - 0.5) * 56,
    y: cl.cy + (rng() - 0.5) * 56,
    c: cl.c,
    r: 2.8 + rng() * 2.4,
  })),
)
const query = { x: 200, y: 166 }
const neighbors = [...dots]
  .sort(
    (a, b) =>
      (a.x - query.x) ** 2 + (a.y - query.y) ** 2 - ((b.x - query.x) ** 2 + (b.y - query.y) ** 2),
  )
  .slice(0, 4)

// ── Konten ────────────────────────────────────────────────────────────────────
const steps = [
  {
    n: "01",
    t: "Ketik calon judul",
    d: "Tempel atau ketik judul skripsimu di halaman Cek Judul — minimal beberapa kata agar maknanya terbaca.",
  },
  {
    n: "02",
    t: "Lihat skor & judul termirip",
    d: "Sistem menampilkan persentase kemiripan, judul paling mirip beserta abstrak dan tahunnya, agar kamu menilai tumpang-tindih yang nyata.",
  },
  {
    n: "03",
    t: "Telusuri peta tema",
    d: "Lihat di sub-bidang riset mana judulmu jatuh dan karya-karya tetangganya — bekal kuat saat pengajuan judul.",
  },
]

const features = [
  {
    t: "Analisis kemiripan semantik",
    d: "Model embedding bahasa Indonesia mengukur kedekatan makna, menangkap parafrase yang lolos dari pencocokan kata biasa.",
    icon: "spark",
  },
  {
    t: "Peta tema riset",
    d: "Proyeksi 2D ribuan judul, dikelompokkan otomatis menjadi tema, dengan posisi judulmu tersorot di antara tetangganya.",
    icon: "map",
  },
  {
    t: "Dashboard admin",
    d: "Gerbang korpus berpengaman login: hanya judul final yang masuk, sehingga kualitas data tetap terjaga tiap tahun.",
    icon: "lock",
  },
]

const faqs = [
  {
    q: "Apakah ini mendeteksi plagiarisme?",
    a: "Tidak. Serupa mendeteksi kemiripan topik antar-judul secara semantik untuk mencegah duplikasi judul — bukan memeriksa plagiarisme isi naskah.",
  },
  {
    q: "Apa bedanya dengan pengecekan manual?",
    a: "Lebih cepat, konsisten, dan objektif. Serupa membandingkan terhadap seluruh korpus dalam hitungan detik; keputusan akhir tetap berada di tangan petugas.",
  },
  {
    q: "Apakah judul yang saya cek ikut tersimpan?",
    a: "Tidak. Pengecekan tidak menyimpan apa pun. Hanya judul final yang ditambahkan admin yang masuk ke korpus.",
  },
  {
    q: "Siapa yang bisa menambah data?",
    a: "Hanya admin yang login (Supabase Auth). Mahasiswa cukup memakai halaman Cek Judul dan Peta Tema tanpa perlu akun.",
  },
]
</script>

<template>
  <div class="landing">
    <!-- HERO -->
    <section class="container hero">
      <div class="hero-left">
        <span class="eyebrow">Fakultas Ilmu Keperawatan · UNISSULA</span>
        <h1 class="hero-title">
          Ukur kemiripan judul skripsimu, <em>sebelum</em> diajukan.
        </h1>
        <p class="hero-sub">
          <strong>Serupa</strong> menganalisis kedekatan <strong>makna</strong> calon
          judulmu terhadap judul-judul yang sudah ada — bukan sekadar kesamaan kata.
          Lihat skor, abstrak, tahun, dan posisinya di peta tema riset jurusan.
        </p>
        <div class="cta">
          <RouterLink to="/cek" class="btn btn-primary">Mulai cek judul</RouterLink>
          <RouterLink to="/peta" class="btn btn-ghost">Lihat peta tema</RouterLink>
        </div>
      </div>

      <div class="hero-right">
        <div class="hero-card card">
          <svg class="scatter" viewBox="0 0 400 320" role="img" aria-label="Ilustrasi peta tema riset">
            <!-- garis ke tetangga terdekat -->
            <line
              v-for="(n, i) in neighbors"
              :key="'l' + i"
              :x1="query.x"
              :y1="query.y"
              :x2="n.x"
              :y2="n.y"
              class="link-line"
            />
            <!-- titik korpus -->
            <circle
              v-for="(d, i) in dots"
              :key="i"
              :cx="d.x"
              :cy="d.y"
              :r="d.r"
              :fill="d.c"
              :opacity="0.86"
            />
            <!-- titik query (judulmu) -->
            <circle :cx="query.x" :cy="query.y" r="22" class="q-ring q-ring-2" />
            <circle :cx="query.x" :cy="query.y" r="14" class="q-ring" />
            <circle :cx="query.x" :cy="query.y" r="5.6" fill="#2f6e88" />
          </svg>
          <div class="hero-card-foot">
            <span class="qdot" /> judulmu, di antara tetangga tematik terdekat
          </div>
        </div>
      </div>
    </section>

    <!-- TENTANG -->
    <section class="container band">
      <span class="eyebrow">Tentang</span>
      <h2 class="band-title">Apa itu Serupa?</h2>
      <div class="about">
        <p>
          Serupa adalah alat bantu <strong>Fakultas Ilmu Keperawatan UNISSULA</strong> untuk
          memeriksa apakah sebuah calon judul skripsi terlalu mirip dengan judul yang
          sudah pernah diambil. Setiap tahun, pemeriksaan ini dilakukan manual —
          melelahkan, lambat, dan rawan terlewat.
        </p>
        <p>
          Dengan membandingkan <strong>makna</strong> judul (bukan hanya kata), Serupa
          membuat proses itu cepat, konsisten, dan dapat ditelusuri: skor kemiripan,
          abstrak pembanding, dan peta tema riset jurusan dalam satu tampilan.
        </p>
      </div>
    </section>

    <!-- CARA PAKAI -->
    <section class="container band">
      <span class="eyebrow">Cara penggunaan</span>
      <h2 class="band-title">Tiga langkah</h2>
      <div class="steps">
        <article v-for="s in steps" :key="s.n" class="step card card-pad">
          <span class="step-n">{{ s.n }}</span>
          <h3 class="step-t">{{ s.t }}</h3>
          <p class="step-d muted">{{ s.d }}</p>
        </article>
      </div>
      <p class="band-note faint">
        Menambah data? Judul final dimasukkan admin lewat tombol kunci di kanan atas
        (login Supabase) — bukan dari input mahasiswa.
      </p>
    </section>

    <!-- FITUR -->
    <section class="container band">
      <span class="eyebrow">Fitur</span>
      <h2 class="band-title">Yang membuatnya berguna</h2>
      <div class="features">
        <article v-for="f in features" :key="f.t" class="feature card card-pad">
          <span class="feat-icon" :class="'ic-' + f.icon" aria-hidden="true">
            <svg v-if="f.icon === 'spark'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M18 18l-2.5-2.5M6 18l2.5-2.5M18 6l-2.5 2.5" />
            </svg>
            <svg v-else-if="f.icon === 'map'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="6" cy="7" r="2" />
              <circle cx="17" cy="10" r="2" />
              <circle cx="9" cy="17" r="2" />
              <path d="M7.6 8.4 8.4 15M10.8 16l4.4-4.6" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <h3 class="feat-t">{{ f.t }}</h3>
          <p class="feat-d muted">{{ f.d }}</p>
        </article>
      </div>
    </section>

    <!-- FAQ -->
    <section class="container band">
      <span class="eyebrow">Pertanyaan</span>
      <h2 class="band-title">Yang sering ditanyakan</h2>
      <div class="faq card">
        <details v-for="(f, i) in faqs" :key="i" class="faq-item">
          <summary class="faq-q">
            {{ f.q }}
            <span class="faq-chev" aria-hidden="true" />
          </summary>
          <p class="faq-a muted">{{ f.a }}</p>
        </details>
      </div>
    </section>

    <!-- CTA PENUTUP -->
    <section class="container">
      <div class="closing card card-pad">
        <div>
          <h2 class="closing-t">Siap memeriksa judulmu?</h2>
          <p class="closing-s muted">Hitungan detik untuk tahu seberapa baru topikmu.</p>
        </div>
        <RouterLink to="/cek" class="btn btn-primary">Mulai cek judul</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  gap: 72px;
  padding-bottom: 16px;
}
.eyebrow {
  display: block;
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 44px;
  align-items: center;
  padding-top: 18px;
}
.hero-title {
  margin-top: 14px;
  font-size: clamp(32px, 4.6vw, 52px);
  line-height: 1.06;
}
.hero-title em {
  font-style: normal;
  color: var(--accent);
}
.hero-sub {
  margin-top: 18px;
  max-width: 52ch;
  font-size: 16.5px;
  color: var(--muted);
}
.cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}
.cta .btn {
  padding: 12px 22px;
  font-size: 15px;
}
.hero-card {
  padding: 18px;
  background:
    radial-gradient(680px 380px at 78% 8%, rgba(184, 212, 227, 0.4), transparent 60%),
    radial-gradient(520px 360px at 6% 96%, rgba(238, 255, 219, 0.5), transparent 60%),
    var(--surface);
}
.scatter {
  display: block;
  width: 100%;
  height: auto;
}
.link-line {
  stroke: rgba(47, 110, 136, 0.5);
  stroke-width: 1.4;
  stroke-dasharray: 2 4;
}
.q-ring {
  fill: none;
  stroke: rgba(47, 110, 136, 0.9);
  stroke-width: 1.6;
}
.q-ring-2 {
  stroke: rgba(47, 110, 136, 0.4);
}
.hero-card-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 0 6px;
  font-size: 12.5px;
  color: var(--muted);
}
.qdot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #2f6e88;
  box-shadow: 0 0 0 3px rgba(47, 110, 136, 0.25);
  flex: none;
}

/* ── Section heading ──────────────────────────────────────────────────────── */
.band-title {
  margin-top: 8px;
  font-size: clamp(24px, 3vw, 32px);
}
.band-note {
  margin-top: 20px;
  font-size: 13px;
  max-width: 60ch;
}

/* ── Tentang ──────────────────────────────────────────────────────────────── */
.about {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
  max-width: 80ch;
}
.about p {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.65;
}

/* ── Langkah ──────────────────────────────────────────────────────────────── */
.steps {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.step {
  position: relative;
  overflow: hidden;
}
.step-n {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}
.step-t {
  margin-top: 10px;
  font-size: 17px;
}
.step-d {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
}

/* ── Fitur ────────────────────────────────────────────────────────────────── */
.features {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.feat-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  color: var(--brand);
  background: linear-gradient(160deg, #fdfbf4, #eef3e4);
  border: 1px solid var(--border-2);
}
.feat-t {
  margin-top: 14px;
  font-size: 17px;
}
.feat-d {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
}

/* ── FAQ ──────────────────────────────────────────────────────────────────── */
.faq {
  margin-top: 22px;
  overflow: hidden;
}
.faq-item {
  border-bottom: 1px solid var(--border);
}
.faq-item:last-child {
  border-bottom: 0;
}
.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  font-weight: 700;
  font-size: 15px;
  color: var(--ink);
  cursor: pointer;
  list-style: none;
}
.faq-q::-webkit-details-marker {
  display: none;
}
.faq-chev {
  position: relative;
  width: 12px;
  height: 12px;
  flex: none;
  transition: transform 0.2s ease;
}
.faq-chev::before,
.faq-chev::after {
  content: "";
  position: absolute;
  top: 5px;
  width: 8px;
  height: 1.8px;
  background: var(--muted);
  border-radius: 2px;
}
.faq-chev::before {
  left: 0;
  transform: rotate(45deg);
}
.faq-chev::after {
  right: 0;
  transform: rotate(-45deg);
}
.faq-item[open] .faq-chev {
  transform: rotate(180deg);
}
.faq-a {
  padding: 0 22px 20px;
  font-size: 14px;
  line-height: 1.65;
  max-width: 72ch;
}

/* ── Penutup ──────────────────────────────────────────────────────────────── */
.closing {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  background: linear-gradient(180deg, rgba(184, 212, 227, 0.18), rgba(255, 255, 255, 0)),
    var(--surface);
}
.closing-t {
  font-size: clamp(22px, 2.6vw, 28px);
}
.closing-s {
  margin-top: 6px;
  font-size: 14.5px;
}
.closing .btn {
  padding: 12px 22px;
  font-size: 15px;
}

@media (max-width: 880px) {
  .landing {
    gap: 56px;
  }
  .hero {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .hero-right {
    order: -1;
  }
  .steps,
  .features,
  .about {
    grid-template-columns: 1fr;
  }
}
</style>

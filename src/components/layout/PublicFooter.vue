<script setup>
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/ui/AppLogo.vue'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <AppLogo />
        <p class="footer__tag">
          Alat bantu keputusan untuk mengevaluasi kemiripan makna rencana topik skripsi dengan
          repository penelitian FIK UNISSULA.
        </p>
      </div>

      <nav class="footer__col" aria-label="Produk">
        <h3 class="footer__title">Produk</h3>
        <a href="/#cara-kerja">Cara Kerja</a>
        <a href="/#tentang">Tentang</a>
        <a href="/#batasan">Batasan</a>
        <RouterLink to="/masuk">Masuk</RouterLink>
      </nav>

      <div class="footer__col">
        <h3 class="footer__title">Institusi</h3>
        <p>Fakultas Ilmu Keperawatan</p>
        <p>Universitas Islam Sultan Agung</p>
        <p>Semarang, Indonesia</p>
      </div>
    </div>

    <div class="footer__bar">
      <div class="container footer__barInner">
        <p>© {{ year }} Serupa · FIK UNISSULA</p>
        <p class="footer__note">Bukan alat plagiarisme · Bukan pengganti keputusan pembimbing</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-24);
}
.footer__inner {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-10);
  padding-top: var(--space-16);
  padding-bottom: var(--space-12);
}
.footer__tag {
  margin-top: var(--space-4);
  max-width: 42ch;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.footer__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.footer__title {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-subtle);
  margin-bottom: var(--space-2);
}
.footer__col a,
.footer__col p {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.footer__col a:hover {
  color: var(--color-primary-700);
}
.footer__bar {
  border-top: 1px solid var(--color-border);
  padding: var(--space-5) 0;
}
.footer__barInner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  font-size: var(--text-sm);
  color: var(--color-text-subtle);
}
.footer__note {
  font-size: var(--text-xs);
}
@media (max-width: 720px) {
  .footer__inner {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }
}
</style>

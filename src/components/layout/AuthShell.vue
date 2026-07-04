<script setup>
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/ui/AppLogo.vue'

defineProps({
  points: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="auth">
    <!-- Brand panel -->
    <aside class="auth__brand">
      <div class="auth__brandInner">
        <RouterLink to="/" class="auth__logo"><AppLogo light /></RouterLink>
        <div class="auth__pitch">
          <h2 class="auth__pitchTitle">
            Kemiripan makna, dinilai manusia.
          </h2>
          <ul class="auth__points">
            <li v-for="p in points" :key="p">
              <span class="auth__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              {{ p }}
            </li>
          </ul>
        </div>
        <p class="auth__foot">FIK UNISSULA · Analisis Kemiripan Judul Skripsi</p>
      </div>
    </aside>

    <!-- Form panel -->
    <main class="auth__main">
      <RouterLink to="/" class="auth__mobileLogo"><AppLogo /></RouterLink>
      <div class="auth__card">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.auth__brand {
  position: relative;
  background:
    radial-gradient(90% 60% at 20% 10%, var(--color-primary-600) 0%, transparent 60%),
    linear-gradient(150deg, var(--color-primary-800), var(--color-primary-700));
  color: #fff;
  padding: var(--space-12);
  display: flex;
  overflow: hidden;
}
.auth__brand::after {
  content: '';
  position: absolute;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  bottom: -120px;
  right: -80px;
}
.auth__brandInner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}
.auth__pitch {
  margin-top: auto;
  margin-bottom: auto;
}
.auth__pitchTitle {
  color: #fff;
  font-size: var(--text-3xl);
  max-width: 16ch;
  margin-bottom: var(--space-6);
}
.auth__points {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.auth__points li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-base);
}
.auth__check {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  margin-top: 1px;
}
.auth__check svg {
  width: 14px;
  height: 14px;
}
.auth__foot {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
}

.auth__main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--space-8);
  background: var(--color-background);
}
.auth__mobileLogo {
  display: none;
  margin-bottom: var(--space-6);
}
.auth__card {
  width: 100%;
  max-width: 420px;
}

@media (max-width: 860px) {
  .auth {
    grid-template-columns: 1fr;
  }
  .auth__brand {
    display: none;
  }
  .auth__mobileLogo {
    display: block;
  }
  .auth__main {
    justify-content: flex-start;
    padding-top: var(--space-16);
  }
}
</style>

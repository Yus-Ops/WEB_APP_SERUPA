<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/ui/AppLogo.vue'
import AppButton from '@/components/ui/AppButton.vue'

const open = ref(false)
</script>

<template>
  <header class="nav">
    <div class="container nav__inner">
      <RouterLink to="/" class="nav__brand" aria-label="Serupa — beranda">
        <AppLogo />
      </RouterLink>

      <nav class="nav__links" :class="{ 'is-open': open }" aria-label="Navigasi utama">
        <a href="/#cara-kerja" @click="open = false">Cara Kerja</a>
        <a href="/#tentang" @click="open = false">Tentang</a>
        <a href="/#batasan" @click="open = false">Batasan</a>
        <RouterLink class="nav__mobileCta" to="/masuk" @click="open = false">Masuk</RouterLink>
      </nav>

      <div class="nav__actions">
        <AppButton to="/daftar" variant="ghost" size="sm" class="nav__daftar">Daftar</AppButton>
        <AppButton to="/masuk" variant="primary" size="sm">Masuk</AppButton>
        <button
          class="nav__burger"
          type="button"
          :aria-expanded="open"
          aria-label="Buka menu"
          @click="open = !open"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path v-if="!open" d="M4 7h16M4 12h16M4 17h16" />
            <path v-else d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: rgba(246, 250, 249, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
}
.nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--navbar-height);
  gap: var(--space-4);
}
.nav__brand {
  flex-shrink: 0;
}
.nav__links {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  margin-left: auto;
  margin-right: var(--space-6);
}
.nav__links a {
  font-weight: var(--font-weight-bold);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.nav__links a:hover {
  color: var(--color-primary-700);
}
.nav__mobileCta {
  display: none;
}
.nav__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.nav__burger {
  display: none;
  color: var(--color-primary-800);
  padding: 6px;
}

@media (max-width: 820px) {
  .nav__links {
    position: absolute;
    top: var(--navbar-height);
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    margin: 0;
    padding: var(--space-2) var(--space-6) var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
    transform: translateY(-8px);
    opacity: 0;
    visibility: hidden;
    transition:
      opacity var(--transition-base),
      transform var(--transition-base),
      visibility var(--transition-base);
  }
  .nav__links.is-open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }
  .nav__links a {
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: var(--text-base);
  }
  .nav__mobileCta {
    display: block;
    color: var(--color-primary-700) !important;
  }
  .nav__daftar {
    display: none;
  }
  .nav__burger {
    display: grid;
    place-items: center;
  }
}
</style>

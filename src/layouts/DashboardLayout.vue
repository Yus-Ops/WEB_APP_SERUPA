<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter, RouterView, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { initials } from '@/lib/format'
import AppLogo from '@/components/ui/AppLogo.vue'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

const drawerOpen = ref(false)
const menuOpen = ref(false)

const STUDENT_NAV = [
  { name: 'scan', label: 'Cek Rencana Topik', icon: 'scan' },
  { name: 'history', label: 'Riwayat Scan', icon: 'history' },
]
const ADMIN_NAV = [
  // `exact`: route indeks (/admin) — cocokkan persis agar tak ikut aktif di sub-halaman.
  { name: 'admin-dashboard', label: 'Dashboard', icon: 'grid', exact: true },
  { name: 'admin-corpus', label: 'Korpus Skripsi', icon: 'list' },
  { name: 'admin-upload', label: 'Unggah Data', icon: 'upload' },
  { name: 'admin-trends', label: 'Tren & Saturasi', icon: 'chart' },
]

const nav = computed(() => (auth.isAdmin ? ADMIN_NAV : STUDENT_NAV))
const pageTitle = computed(() => (route.meta.title || 'Serupa').split(' · ')[0])
const areaLabel = computed(() => (auth.isAdmin ? 'Panel Admin' : 'Ruang Mahasiswa'))

const icons = {
  scan: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3M11 8v6M8 11h6',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  upload: 'M12 15V3M7 8l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  chart: 'M3 3v18h18M7 15l3-4 3 3 4-6',
}

function close() {
  drawerOpen.value = false
}

watch(() => route.fullPath, close)

async function logout() {
  await auth.logout()
  toast.info('Anda telah keluar.')
  router.push({ name: 'landing' })
}
</script>

<template>
  <div class="shell">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'is-open': drawerOpen }">
      <div class="sidebar__top">
        <RouterLink to="/" class="sidebar__brand"><AppLogo /></RouterLink>
        <button class="sidebar__close" type="button" aria-label="Tutup menu" @click="close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <p class="sidebar__area">{{ areaLabel }}</p>

      <nav class="sidebar__nav" aria-label="Navigasi aplikasi">
        <RouterLink
          v-for="item in nav"
          :key="item.name"
          :to="{ name: item.name }"
          custom
          v-slot="{ href, navigate, isActive, isExactActive }"
        >
          <a
            :href="href"
            class="navitem"
            :class="{ 'is-active': item.exact ? isExactActive : isActive }"
            @click="navigate"
          >
            <svg class="navitem__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path :d="icons[item.icon]" />
            </svg>
            {{ item.label }}
          </a>
        </RouterLink>
      </nav>

      <div class="sidebar__foot">
        <div class="userchip">
          <span class="userchip__avatar">{{ initials(auth.displayName) }}</span>
          <span class="userchip__meta">
            <span class="userchip__name">{{ auth.displayName }}</span>
            <span class="userchip__role">{{ auth.isAdmin ? 'Admin' : 'Mahasiswa' }}</span>
          </span>
        </div>
        <button class="logout" type="button" @click="logout">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Keluar
        </button>
      </div>
    </aside>

    <div v-if="drawerOpen" class="scrim" @click="close" />

    <!-- Main -->
    <div class="main">
      <header class="topbar">
        <button class="topbar__burger" type="button" aria-label="Buka menu" @click="drawerOpen = true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <h1 class="topbar__title">{{ pageTitle }}</h1>

        <div class="topbar__user" @mouseleave="menuOpen = false">
          <button class="topbar__userBtn" type="button" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
            <span class="userchip__avatar userchip__avatar--sm">{{ initials(auth.displayName) }}</span>
            <span class="topbar__userName">{{ auth.displayName }}</span>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              <path d="M6 8l4 4 4-4" />
            </svg>
          </button>
          <Transition name="pop">
            <div v-if="menuOpen" class="menu" role="menu">
              <div class="menu__head">
                <p class="menu__name">{{ auth.displayName }}</p>
                <p class="menu__sub">{{ auth.user?.email }}</p>
              </div>
              <button class="menu__item" type="button" role="menuitem" @click="logout">Keluar</button>
            </div>
          </Transition>
        </div>
      </header>

      <main class="content">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}

/* ---- Sidebar ---- */
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  padding: var(--space-5);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  z-index: var(--z-overlay);
}
.sidebar__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}
.sidebar__close {
  display: none;
  color: var(--color-text-muted);
}
.sidebar__area {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-subtle);
  padding: 0 var(--space-3);
  margin-bottom: var(--space-3);
}
.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.navitem {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 11px var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}
.navitem:hover {
  background: var(--color-primary-050);
  color: var(--color-primary-700);
}
.navitem.is-active {
  background: var(--color-primary-100);
  color: var(--color-primary-800);
}
.navitem__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.sidebar__foot {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);
  margin-top: var(--space-4);
}
.userchip {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.userchip__avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-800);
  font-weight: var(--font-weight-black);
  font-size: var(--text-sm);
}
.userchip__avatar--sm {
  width: 30px;
  height: 30px;
  font-size: var(--text-xs);
}
.userchip__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.userchip__name {
  font-weight: var(--font-weight-bold);
  font-size: var(--text-sm);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.userchip__role {
  font-size: var(--text-xs);
  color: var(--color-text-subtle);
}
.logout {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: 10px var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}
.logout:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.scrim {
  position: fixed;
  inset: 0;
  background: rgba(36, 48, 46, 0.45);
  z-index: var(--z-overlay);
  display: none;
}

/* ---- Main ---- */
.main {
  flex: 1;
  min-width: 0;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: var(--navbar-height);
  padding: 0 var(--space-8);
  background: rgba(246, 250, 249, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
}
.topbar__burger {
  display: none;
  color: var(--color-primary-800);
}
.topbar__title {
  font-size: var(--text-xl);
  font-weight: var(--font-weight-bold);
}
.topbar__user {
  position: relative;
  margin-left: auto;
}
.topbar__userBtn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 10px 6px 6px;
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  transition: background var(--transition-fast);
}
.topbar__userBtn:hover {
  background: var(--color-primary-050);
}
.topbar__userName {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}
.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.menu__head {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.menu__name {
  font-weight: var(--font-weight-bold);
  font-size: var(--text-sm);
}
.menu__sub {
  font-size: var(--text-xs);
  color: var(--color-text-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.menu__item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 11px var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
}
.menu__item:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.content {
  flex: 1;
  padding: var(--space-8);
  max-width: 1160px;
  width: 100%;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.16s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---- Responsive ---- */
@media (max-width: 960px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform var(--transition-base);
    box-shadow: var(--shadow-lg);
  }
  .sidebar.is-open {
    transform: translateX(0);
  }
  .sidebar__close {
    display: block;
  }
  .main {
    margin-left: 0;
  }
  .scrim {
    display: block;
  }
  .topbar__burger {
    display: grid;
    place-items: center;
  }
  .topbar {
    padding: 0 var(--space-5);
  }
  .content {
    padding: var(--space-5);
  }
  .topbar__userName {
    display: none;
  }
}
</style>

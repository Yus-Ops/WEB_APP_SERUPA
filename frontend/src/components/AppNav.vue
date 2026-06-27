<script setup>
import ModeBadge from "./ModeBadge.vue"

defineEmits(["open-admin"])

const links = [
  { to: "/", label: "Beranda" },
  { to: "/cek", label: "Cek Judul" },
  { to: "/peta", label: "Peta Tema" },
]
</script>

<template>
  <header class="nav">
    <div class="container nav-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="30" height="30">
            <circle cx="9" cy="11" r="1.5" fill="#66101f" />
            <circle cx="12.5" cy="8" r="1.5" fill="#855a5c" />
            <circle cx="22" cy="9" r="1.5" fill="#b07d2e" />
            <circle cx="24" cy="21" r="1.5" fill="#5f7d3f" />
            <circle cx="10" cy="23" r="1.5" fill="#8a8e91" />
            <circle cx="16" cy="16" r="3" fill="#2f6e88" />
            <circle cx="16" cy="16" r="5.6" fill="none" stroke="#2f6e88" stroke-width="1" opacity="0.5" />
          </svg>
        </span>
        <span class="brand-text">
          <span class="brand-title">Serupa</span>
          <span class="brand-sub">Analisis kemiripan judul · Fakultas Ilmu Keperawatan</span>
        </span>
      </RouterLink>

      <nav class="links">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="link"
          active-class="active"
        >
          {{ l.label }}
        </RouterLink>
      </nav>

      <div class="nav-right">
        <ModeBadge />
        <button
          class="admin-btn"
          title="Masuk admin"
          aria-label="Masuk admin"
          @click="$emit('open-admin')"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
  z-index: 40;
  backdrop-filter: blur(14px);
  background: linear-gradient(180deg, rgba(248, 245, 235, 0.92), rgba(248, 245, 235, 0.62));
  border-bottom: 1px solid var(--border);
}
.nav-inner {
  height: 66px;
  display: flex;
  align-items: center;
  gap: 18px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-right: auto;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: linear-gradient(160deg, #fdfbf4, #eef3e4);
  border: 1px solid var(--border-2);
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}
.brand-title {
  font-family: var(--serif);
  font-weight: 600;
  font-size: 17px;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.brand-sub {
  font-size: 11.5px;
  color: var(--faint);
  letter-spacing: 0.02em;
}
.links {
  display: flex;
  align-items: center;
  gap: 4px;
}
.link {
  position: relative;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  padding: 8px 13px;
  border-radius: 10px;
  transition: color 0.15s ease, background 0.15s ease;
}
.link:hover {
  color: var(--ink);
  background: var(--surface-2);
}
.link.active {
  color: var(--ink);
  background: var(--surface-2);
}
.link.active::after {
  content: "";
  position: absolute;
  left: 13px;
  right: 13px;
  bottom: 2px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--brand), var(--brand-2));
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.admin-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--border-2);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease,
    transform 0.12s ease;
}
.admin-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
  background: var(--surface-2);
  transform: translateY(-1px);
}
@media (max-width: 640px) {
  .brand-sub {
    display: none;
  }
  .link {
    padding: 8px 10px;
  }
}
</style>

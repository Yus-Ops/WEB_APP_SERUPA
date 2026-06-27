<script setup>
import { ref } from "vue"
import AppNav from "@/components/AppNav.vue"
import AdminModal from "@/components/AdminModal.vue"
import { apiMode } from "@/lib/api"

const showAdmin = ref(false)
const year = new Date().getFullYear()
</script>

<template>
  <AppNav @open-admin="showAdmin = true" />

  <main class="main">
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>

  <footer class="foot">
    <div class="container foot-inner">
      <div class="foot-brand">
        <span class="foot-name serif">Serupa</span>
        <p class="faint foot-desc">
          Analisis kemiripan judul skripsi secara semantik untuk mencegah duplikasi
          topik — menampilkan skor, abstrak, tahun, dan peta tema riset.
        </p>
      </div>

      <nav class="foot-col">
        <span class="foot-h">Jelajahi</span>
        <RouterLink to="/cek" class="foot-link">Cek Judul</RouterLink>
        <RouterLink to="/peta" class="foot-link">Peta Tema</RouterLink>
        <button class="foot-link as-btn" @click="showAdmin = true">Admin</button>
      </nav>

      <div class="foot-col foot-meta">
        <span class="foot-h">Institusi</span>
        <span class="faint">Fakultas Ilmu Keperawatan<br />Universitas Islam Sultan Agung</span>
        <span class="faint foot-year">© {{ year }} · Serupa</span>
        <span v-if="apiMode.demo" class="faint foot-demo">
          Mode demo — korpus contoh &amp; skor simulasi. Setel
          <code>VITE_PYTHON_API</code> untuk mode live.
        </span>
      </div>
    </div>
  </footer>

  <AdminModal v-if="showAdmin" @close="showAdmin = false" />
</template>

<style scoped>
.main {
  flex: 1;
  padding: 38px 0 64px;
}
.foot {
  border-top: 1px solid var(--border);
  padding: 40px 0 32px;
  background: rgba(253, 251, 244, 0.6);
}
.foot-inner {
  display: grid;
  grid-template-columns: 1.7fr 1fr 1.3fr;
  gap: 36px;
  align-items: start;
}
.foot-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
}
.foot-desc {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.6;
  max-width: 40ch;
}
.foot-col {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.foot-h {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--faint);
  margin-bottom: 2px;
}
.foot-link {
  font-size: 13.5px;
  color: var(--muted);
  transition: color 0.15s ease;
}
.foot-link:hover {
  color: var(--ink);
}
.as-btn {
  background: none;
  border: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
  font-size: 13.5px;
  color: var(--muted);
}
.as-btn:hover {
  color: var(--ink);
}
.foot-meta {
  font-size: 12.5px;
  line-height: 1.5;
}
.foot-year {
  font-size: 12px;
}
.foot-demo {
  font-size: 12px;
  line-height: 1.5;
  max-width: 34ch;
}
.foot code {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--muted);
  background: var(--surface-2);
  padding: 1px 6px;
  border-radius: 6px;
}
@media (max-width: 720px) {
  .foot-inner {
    grid-template-columns: 1fr;
    gap: 26px;
  }
}
</style>

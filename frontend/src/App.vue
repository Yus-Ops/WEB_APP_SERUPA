<script setup>
import AppNav from "@/components/AppNav.vue"
import { apiMode } from "@/lib/api"
</script>

<template>
  <AppNav />
  <main class="main">
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>
  <footer class="foot">
    <div class="container foot-inner">
      <span class="faint"
        >Observatorium Skripsi · kemiripan judul semantik untuk satu jurusan</span
      >
      <span class="faint">
        <template v-if="apiMode.demo"
          >Mode demo — korpus contoh &amp; skor simulasi. Setel
          <code>VITE_PYTHON_API</code> untuk mode live.</template
        >
        <template v-else>Terhubung ke layanan AI &amp; Supabase.</template>
      </span>
    </div>
  </footer>
</template>

<style scoped>
.main {
  flex: 1;
  padding: 38px 0 64px;
}
.foot {
  border-top: 1px solid var(--border);
  padding: 20px 0;
  background: rgba(253, 251, 244, 0.5);
}
.foot-inner {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12.5px;
}
.foot code {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--muted);
  background: var(--surface-2);
  padding: 1px 6px;
  border-radius: 6px;
}
</style>

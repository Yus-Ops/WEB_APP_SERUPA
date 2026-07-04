import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

import './assets/styles/tokens.css'
import './assets/styles/base.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Pulihkan sesi Supabase SEBELUM guard router jalan, lalu pasang router & mount.
// restore() async & gagal-aman: bila backend belum siap, aplikasi tetap ter-mount.
useAuthStore()
  .restore()
  .catch(() => {})
  .finally(() => {
    app.use(router)
    app.mount('#app')
  })

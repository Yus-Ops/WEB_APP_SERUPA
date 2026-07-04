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

// Pulihkan sesi (mock: localStorage; live: Supabase) SEBELUM guard router jalan,
// lalu pasang router & mount. restore() kini async untuk mendukung mode live.
useAuthStore()
  .restore()
  .catch(() => {})
  .finally(() => {
    app.use(router)
    app.mount('#app')
  })

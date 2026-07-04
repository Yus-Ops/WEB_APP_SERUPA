import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingView.vue'),
    meta: { public: true, title: 'Serupa — Analisis Kemiripan Judul Skripsi' },
  },
  {
    path: '/masuk',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: 'Masuk · Serupa' },
  },
  {
    path: '/daftar',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { public: true, title: 'Daftar · Serupa' },
  },

  // ---- Mahasiswa ----
  {
    path: '/app',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true, role: 'student' },
    children: [
      { path: '', redirect: { name: 'scan' } },
      {
        path: 'scan',
        name: 'scan',
        component: () => import('@/views/student/ScanView.vue'),
        meta: { title: 'Cek Rencana Topik · Serupa' },
      },
      {
        path: 'riwayat',
        name: 'history',
        component: () => import('@/views/student/HistoryView.vue'),
        meta: { title: 'Riwayat Scan · Serupa' },
      },
      {
        path: 'riwayat/:id',
        name: 'history-detail',
        component: () => import('@/views/student/HistoryDetailView.vue'),
        meta: { title: 'Detail Riwayat · Serupa' },
      },
    ],
  },

  // ---- Admin ----
  {
    path: '/admin',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/AdminDashboardView.vue'),
        meta: { title: 'Dashboard Admin · Serupa' },
      },
      {
        path: 'korpus',
        name: 'admin-corpus',
        component: () => import('@/views/admin/CorpusListView.vue'),
        meta: { title: 'Korpus Skripsi · Serupa' },
      },
      {
        path: 'unggah',
        name: 'admin-upload',
        component: () => import('@/views/admin/UploadView.vue'),
        meta: { title: 'Unggah Data · Serupa' },
      },
      {
        path: 'tren',
        name: 'admin-trends',
        component: () => import('@/views/admin/TrendsView.vue'),
        meta: { title: 'Tren Topik · Serupa' },
      },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: { name: 'landing' } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 80 }
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Role gate: send a logged-in user to their own home if they hit the wrong area.
  if (to.meta.role && auth.isAuthenticated && auth.role !== to.meta.role) {
    return { name: auth.role === 'admin' ? 'admin-dashboard' : 'scan' }
  }

  // Already logged in? Skip the auth pages.
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: auth.role === 'admin' ? 'admin-dashboard' : 'scan' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title || 'Serupa'
})

export default router

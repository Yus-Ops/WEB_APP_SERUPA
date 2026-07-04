import { defineStore } from 'pinia'
import authService from '@/services/authService'

/**
 * Sesi & identitas pengguna. Logika autentikasi (mock localStorage ATAU Supabase
 * Auth) berada di `authService`; store hanya menyimpan `user` reaktif + guard.
 * Lihat PRD §8 (pemetaan NIM → email) dan INTEGRATION.md.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    role: (s) => s.user?.role || null,
    isAdmin: (s) => s.user?.role === 'admin',
    displayName: (s) => s.user?.fullName || '',
    homeRoute: (s) => (s.user?.role === 'admin' ? { name: 'admin-dashboard' } : { name: 'scan' }),
  },
  actions: {
    async restore() {
      this.user = await authService.restore()
      return this.user
    },
    async login({ nim, password }) {
      this.user = await authService.login({ nim, password })
      return this.user
    },
    async register(payload) {
      this.user = await authService.register(payload)
      return this.user
    },
    async logout() {
      await authService.logout()
      this.user = null
    },
  },
})

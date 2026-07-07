import { defineStore } from 'pinia'
import authService from '@/services/authService'

/**
 * Sesi & identitas pengguna. Logika autentikasi (Supabase Auth) berada di
 * `authService`; store hanya menyimpan `user` reaktif + guard.
 * Pemetaan NIM → email dilakukan di server (/api/login). Lihat README.md.
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
      // Mengembalikan { needsVerification, email? , user? }. User hanya di-set
      // bila verifikasi tidak diperlukan (Confirm email OFF).
      const result = await authService.register(payload)
      if (result.user) this.user = result.user
      return result
    },
    async verifyOtp(payload) {
      this.user = await authService.verifyOtp(payload)
      return this.user
    },
    async resendOtp(payload) {
      return authService.resendOtp(payload)
    },
    async logout() {
      await authService.logout()
      this.user = null
    },
  },
})

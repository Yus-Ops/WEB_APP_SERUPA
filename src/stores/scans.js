import { defineStore } from 'pinia'
import scanService from '@/services/scanService'

/**
 * Riwayat scan mahasiswa (FM4, PRD §9). Persistensi & pencocokan berada di
 * `scanService` (/api/scan untuk analisis + Supabase untuk riwayat). Store
 * menyimpan daftar reaktif + status muat; riwayat dimuat via `ensureLoaded()`
 * saat halaman riwayat dibuka.
 */
export const useScansStore = defineStore('scans', {
  state: () => ({
    scans: scanService.snapshot(),
    loaded: false,
    loading: false,
  }),
  getters: {
    count: (s) => s.scans.length,
    byId: (s) => (id) => s.scans.find((x) => x.id === id) || null,
    ordered: (s) => [...s.scans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  },
  actions: {
    async ensureLoaded() {
      if (this.loaded || this.loading) return
      this.loading = true
      try {
        this.scans = await scanService.list()
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    async create(payload) {
      const scan = await scanService.create(payload)
      this.scans.unshift(scan)
      return scan
    },
    async remove(id) {
      await scanService.remove(id)
      this.scans = this.scans.filter((s) => s.id !== id)
    },
    async clearAll() {
      await scanService.clearAll()
      this.scans = []
    },
  },
})

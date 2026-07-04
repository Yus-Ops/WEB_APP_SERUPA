import { defineStore } from 'pinia'
import { isLive } from '@/services/config'
import scanService from '@/services/scanService'

/**
 * Riwayat scan mahasiswa (FM4, PRD §9). Persistensi & pencocokan berada di
 * `scanService` (mock: TF-IDF + localStorage; live: /api/scan + Supabase).
 * Store menyimpan daftar reaktif + status muat.
 *
 * Mode mock diinisialisasi sinkron dari localStorage (tanpa kedip); mode live
 * memuat via `ensureLoaded()` yang dipanggil saat halaman riwayat dibuka.
 */
export const useScansStore = defineStore('scans', {
  state: () => ({
    scans: scanService.snapshot(),
    loaded: !isLive,
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
    async seedIfEmpty() {
      await this.ensureLoaded()
      if (this.scans.length) return
      const seeded = await scanService.seedIfEmpty()
      if (seeded) this.scans = seeded
    },
  },
})

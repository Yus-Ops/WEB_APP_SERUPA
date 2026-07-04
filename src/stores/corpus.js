import { defineStore } from 'pinia'
import { isLive } from '@/services/config'
import corpusService from '@/services/corpusService'

/**
 * Korpus skripsi yang dikelola admin (FA2/FA3, PRD §9). Persistensi berada di
 * `corpusService` (mock: localStorage; live: tabel `theses` Supabase — menulis
 * hanya untuk admin karena RLS). Store menyimpan daftar reaktif + status muat.
 *
 * Statistik korpus penuh (±2.244) ditampilkan terpisah di dashboard admin;
 * daftar ini adalah data yang dapat disunting.
 */
export const useCorpusStore = defineStore('corpus', {
  state: () => ({
    items: corpusService.snapshot(),
    loaded: !isLive,
    loading: false,
  }),
  getters: {
    count: (s) => s.items.length,
    byId: (s) => (id) => s.items.find((t) => t.id === id) || null,
    years: (s) => [...new Set(s.items.map((t) => t.year).filter(Boolean))].sort((a, b) => a - b),
    withAbstract: (s) => s.items.filter((t) => (t.abstract || '').trim().length > 40).length,
  },
  actions: {
    async ensureLoaded() {
      if (this.loaded || this.loading) return
      this.loading = true
      try {
        this.items = await corpusService.list()
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    async add(rec) {
      const item = await corpusService.add(rec)
      this.items.unshift(item)
      return item
    },
    async addMany(recs) {
      const created = await corpusService.addMany(recs)
      this.items.unshift(...created)
      return created
    },
    async update(id, patch) {
      const updated = await corpusService.update(id, patch)
      const i = this.items.findIndex((t) => t.id === id)
      if (i >= 0) this.items[i] = updated || { ...this.items[i], ...patch }
    },
    async remove(id) {
      await corpusService.remove(id)
      this.items = this.items.filter((t) => t.id !== id)
    },
    async reset() {
      this.items = await corpusService.reset()
    },
    /** Deteksi judul duplikat dalam korpus yang dimuat (FA2 validasi batch). */
    findDuplicateTitle(title) {
      const n = String(title || '').toLowerCase().replace(/\s+/g, ' ').trim()
      return (
        this.items.find(
          (t) => String(t.title || '').toLowerCase().replace(/\s+/g, ' ').trim() === n,
        ) || null
      )
    },
  },
})

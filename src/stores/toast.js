import { defineStore } from 'pinia'

/**
 * Toast/notifikasi ringan. Dipakai lintas fitur (login, simpan scan, unggah data).
 */
let seq = 0

export const useToastStore = defineStore('toast', {
  state: () => ({ items: [] }),
  actions: {
    push({ type = 'info', title = '', message = '', timeout = 4500 } = {}) {
      const id = ++seq
      this.items.push({ id, type, title, message })
      if (timeout) setTimeout(() => this.dismiss(id), timeout)
      return id
    },
    success(title, message) {
      return this.push({ type: 'success', title, message })
    },
    error(title, message) {
      return this.push({ type: 'danger', title, message, timeout: 6000 })
    },
    info(title, message) {
      return this.push({ type: 'info', title, message })
    },
    dismiss(id) {
      this.items = this.items.filter((t) => t.id !== id)
    },
  },
})

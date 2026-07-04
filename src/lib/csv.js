/**
 * Parser CSV minimal namun benar (menangani field berkutip, koma & newline di
 * dalam kutipan, serta escaped quote ""). Cukup untuk unggah batch korpus (FA2)
 * tanpa dependensi eksternal.
 */
export function parseCSV(text, delimiter = ',') {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const src = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  // baris terakhir
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  // buang baris kosong
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/** Bungkus satu nilai untuk output CSV. */
function esc(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Bangun teks CSV dari header + baris objek. */
export function toCSV(headers, rows) {
  const head = headers.map((h) => esc(h.label)).join(',')
  const body = rows
    .map((r) => headers.map((h) => esc(r[h.key])).join(','))
    .join('\n')
  return head + '\n' + body
}

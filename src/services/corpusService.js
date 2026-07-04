/**
 * Serupa — service korpus skripsi (tabel `theses`, PRD §9).
 *
 *   mock → localStorage, diseed dari sampel `mockTheses`.
 *   live → Supabase. Menulis (add/update/remove) hanya berhasil untuk admin
 *          karena Row Level Security (PRD §9); mahasiswa hanya baca.
 *
 * Bentuk item konsisten dg mockTheses & kolom `theses`:
 *   { id, title, author, year, abstract, prodi, sourceUrl, addedAt }
 */
import { isLive } from './config'
import { theses as SEED } from '@/data/mockTheses'

/* =========================================================================
 * MOCK
 * ======================================================================= */
const LS = 'serupa.corpus'

function localRead() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || 'null')
    if (Array.isArray(raw) && raw.length) return raw
  } catch {
    /* fallthrough */
  }
  return SEED.map((t) => ({ ...t }))
}
function localWrite(items) {
  localStorage.setItem(LS, JSON.stringify(items))
}
function newId() {
  return 't-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}
function fill(rec) {
  return {
    id: newId(),
    title: '',
    author: '',
    year: null,
    abstract: '',
    prodi: 'fik',
    sourceUrl: '',
    addedAt: new Date().toISOString().slice(0, 10),
    ...rec,
  }
}

const mock = {
  snapshot: () => localRead(),
  async list() {
    return localRead()
  },
  async add(rec) {
    const items = localRead()
    const item = fill(rec)
    items.unshift(item)
    localWrite(items)
    return item
  },
  async addMany(recs) {
    const items = localRead()
    const created = recs.map((r) => fill(r))
    items.unshift(...created)
    localWrite(items)
    return created
  },
  async update(id, patch) {
    const items = localRead()
    const i = items.findIndex((t) => t.id === id)
    if (i >= 0) {
      items[i] = { ...items[i], ...patch }
      localWrite(items)
      return items[i]
    }
    return null
  },
  async remove(id) {
    localWrite(localRead().filter((t) => t.id !== id))
  },
  async reset() {
    const items = SEED.map((t) => ({ ...t }))
    localWrite(items)
    return items
  },
}

/* =========================================================================
 * LIVE (Supabase)
 * ======================================================================= */
function fromRow(r) {
  return {
    id: r.id,
    title: r.title || '',
    author: r.author || '',
    year: r.year ?? null,
    abstract: r.abstract || '',
    prodi: r.prodi || 'fik',
    sourceUrl: r.source_url || '',
    addedAt: (r.created_at || '').slice(0, 10),
  }
}
function toRow(rec) {
  const row = {}
  if (rec.title !== undefined) row.title = rec.title
  if (rec.author !== undefined) row.author = rec.author
  if (rec.year !== undefined) row.year = rec.year
  if (rec.abstract !== undefined) row.abstract = rec.abstract
  if (rec.prodi !== undefined) row.prodi = rec.prodi
  if (rec.sourceUrl !== undefined) row.source_url = rec.sourceUrl
  return row
}
async function db() {
  const { getSupabase } = await import('@/lib/supabase')
  return getSupabase()
}
function throwIf(error) {
  if (error) throw new Error(error.message || 'Operasi korpus gagal.')
}

const live = {
  snapshot: () => [],
  async list() {
    const { data, error } = await (await db())
      .from('theses')
      .select('id, title, author, year, abstract, prodi, source_url, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)
    throwIf(error)
    return (data || []).map(fromRow)
  },
  async add(rec) {
    const { data, error } = await (await db())
      .from('theses')
      .insert(toRow(rec))
      .select()
      .single()
    throwIf(error)
    return fromRow(data)
  },
  async addMany(recs) {
    const { data, error } = await (await db())
      .from('theses')
      .insert(recs.map(toRow))
      .select()
    throwIf(error)
    return (data || []).map(fromRow)
  },
  async update(id, patch) {
    const { data, error } = await (await db())
      .from('theses')
      .update(toRow(patch))
      .eq('id', id)
      .select()
      .single()
    throwIf(error)
    return fromRow(data)
  },
  async remove(id) {
    const { error } = await (await db()).from('theses').delete().eq('id', id)
    throwIf(error)
  },
  async reset() {
    throw new Error('Reset korpus tidak tersedia di mode live.')
  },
}

export default isLive ? live : mock

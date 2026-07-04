/**
 * Serupa — service korpus skripsi (tabel `theses`, PRD §9).
 *
 * Menulis (add/update/remove) hanya berhasil untuk admin karena Row Level
 * Security (PRD §9); mahasiswa hanya baca. Ringkasan statistik korpus diambil
 * dari RPC `corpus_stats()` (FA4).
 *
 * Bentuk item konsisten dg kolom `theses`:
 *   { id, title, author, year, abstract, prodi, sourceUrl, addedAt }
 */
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

export default {
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
  /** Ringkasan korpus untuk dashboard admin (RPC corpus_stats, FA4). */
  async stats() {
    const { data, error } = await (await db()).rpc('corpus_stats')
    throwIf(error)
    return data || null
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
}

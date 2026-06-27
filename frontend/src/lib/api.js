// ============================================================================
// Lapisan API terpadu.
//
// Satu titik akses untuk SELURUH operasi data, dengan fallback DEMO otomatis:
//  - Bila VITE_PYTHON_API kosong  -> /check & /add disimulasikan (lib/demo.js).
//  - Bila Supabase tak terkonfigurasi -> data peta memakai korpus contoh.
// Komponen UI tidak perlu tahu mode mana yang aktif.
//
// Kontrak respons mengikuti backend/app.py (model BARU — CLAUDE.md §4–§5):
//   checkTitle -> { query, matches:[{id,title,abstract,year,similarity,percent,category}], top, coord }
//   addTitle   -> { inserted: [...] }   payload: { title, abstract, year }
//   fetchMap   -> [{ id, title, year, x, y, cluster, cluster_label }]
// ============================================================================

import { PYTHON_API, DEMO_MODE, HAS_SUPABASE } from "./config"
import { supabase } from "./supabase"
import { mockCheck, mockMap, abstractById } from "./demo"

export const apiMode = {
  demo: DEMO_MODE,
  hasSupabase: HAS_SUPABASE,
  pythonApi: PYTHON_API,
}

// ── /check ──────────────────────────────────────────────────────────────────
export async function checkTitle(title, k = 10, signal) {
  if (DEMO_MODE) {
    // latensi ringan agar abort/animasi terasa alami saat mengetik
    await wait(170, signal)
    return mockCheck(title, k)
  }
  const r = await fetch(`${PYTHON_API}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, k }),
    signal,
  })
  if (!r.ok) throw new Error((await safeText(r)) || `Gagal memeriksa judul (HTTP ${r.status})`)
  return r.json()
}

// ── /add (admin) ─────────────────────────────────────────────────────────────
export async function addTitle(payload, adminKey) {
  if (DEMO_MODE) {
    await wait(240)
    return { inserted: [{ id: Date.now(), ...payload }], demo: true }
  }
  const r = await fetch(`${PYTHON_API}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey || "" },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error((await safeText(r)) || `Gagal menambah judul (HTTP ${r.status})`)
  return r.json()
}

// ── Data peta (theses_map) ───────────────────────────────────────────────────
// Ringan: tanpa embedding & tanpa abstrak. Abstrak diambil saat klik titik.
export async function fetchMap() {
  if (!HAS_SUPABASE) return mockMap()
  const { data, error } = await supabase
    .from("theses_map")
    .select("id,title,year,x,y,cluster,cluster_label")
  if (error) throw new Error(error.message)
  return data || []
}

// ── Abstrak satu judul (diambil saat klik titik di peta) ─────────────────────
export async function fetchAbstract(id) {
  if (!HAS_SUPABASE) {
    await wait(120)
    return abstractById(id)
  }
  const { data, error } = await supabase.from("theses").select("abstract").eq("id", id).single()
  if (error) throw new Error(error.message)
  return data?.abstract ?? null
}

// ── /health ──────────────────────────────────────────────────────────────────
export async function health() {
  if (DEMO_MODE) return { status: "demo", model: "mock-trigram-cosine", dim: 0, map: true }
  const r = await fetch(`${PYTHON_API}/health`)
  if (!r.ok) throw new Error(`Health gagal (HTTP ${r.status})`)
  return r.json()
}

// ── util ─────────────────────────────────────────────────────────────────────
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"))
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })
}

async function safeText(r) {
  try {
    return (await r.text()).slice(0, 300)
  } catch {
    return ""
  }
}

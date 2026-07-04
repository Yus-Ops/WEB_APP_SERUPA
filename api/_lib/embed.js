/**
 * Serupa — pemanggil embedding Hugging Face (PRD §8, §10).
 *
 * Default model: BAAI/bge-m3 (multilingual, 1024-dim, kuat untuk Bahasa
 * Indonesia). Endpoint dapat berupa:
 *   - Inference API serverless: https://api-inference.huggingface.co/models/<model>
 *   - Inference Endpoint privat (DIREKOMENDASIKAN, §12): set EMBED_ENDPOINT_URL.
 *
 * Tahan terhadap variasi bentuk respons feature-extraction:
 *   - [dim]                    → 1 vektor (1 input)
 *   - [n][dim]                 → n vektor ter-pool (n input)
 *   - [tokens][dim]            → token-level utk 1 input → di-pool
 *   - [n][tokens][dim]         → token-level utk n input → di-pool tiap input
 * Pooling default CLS (sesuai BGE); ganti via EMBED_POOLING=mean bila perlu.
 */
const HF_TOKEN = process.env.HF_TOKEN
const EMBED_MODEL = process.env.EMBED_MODEL || 'BAAI/bge-m3'
const EMBED_ENDPOINT_URL = process.env.EMBED_ENDPOINT_URL || ''
const EMBED_DIM = Number(process.env.EMBED_DIM || 1024)
const EMBED_POOLING = (process.env.EMBED_POOLING || 'cls').toLowerCase()
const EMBED_NORMALIZE = (process.env.EMBED_NORMALIZE || 'true') !== 'false'

export const MODEL_VERSION = EMBED_MODEL

function endpointUrl() {
  return EMBED_ENDPOINT_URL || `https://api-inference.huggingface.co/models/${EMBED_MODEL}`
}

function arrayDepth(a) {
  let d = 0
  let x = a
  while (Array.isArray(x)) {
    d++
    x = x[0]
  }
  return d
}

function poolMatrix(rows) {
  if (EMBED_POOLING === 'mean') {
    const dim = rows[0].length
    const out = new Array(dim).fill(0)
    for (const r of rows) for (let i = 0; i < dim; i++) out[i] += r[i]
    for (let i = 0; i < dim; i++) out[i] /= rows.length
    return out
  }
  return rows[0] // CLS: token pertama
}

function l2normalize(vec) {
  let sum = 0
  for (const x of vec) sum += x * x
  const n = Math.sqrt(sum) || 1
  return vec.map((x) => x / n)
}

/** Ubah respons mentah HF menjadi array vektor (satu per input). */
function normalizeResponse(data, nInputs) {
  const depth = arrayDepth(data)
  let vectors
  if (depth === 1) {
    vectors = [data]
  } else if (depth === 2) {
    // [n][dim] pooled, ATAU [tokens][dim] untuk 1 input.
    if (data.length === nInputs && data[0].length === EMBED_DIM) {
      vectors = data
    } else if (nInputs === 1) {
      vectors = [poolMatrix(data)]
    } else {
      vectors = data // best-effort: anggap satu vektor per input
    }
  } else {
    // depth 3: [n][tokens][dim]
    vectors = data.map((rows) => poolMatrix(rows))
  }
  return EMBED_NORMALIZE ? vectors.map(l2normalize) : vectors
}

/**
 * Embed daftar teks. Selalu mengirim array agar bentuk respons konsisten.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} vektor (panjang = EMBED_DIM), sudah dinormalisasi.
 */
export async function embedTexts(texts, { retries = 4 } = {}) {
  if (!HF_TOKEN) throw new Error('HF_TOKEN belum diset di environment server.')
  if (!Array.isArray(texts) || texts.length === 0) return []

  let lastErr
  for (let attempt = 0; attempt < retries; attempt++) {
    let res
    try {
      res = await fetch(endpointUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
      })
    } catch (e) {
      lastErr = e
      await sleep(1500 * (attempt + 1))
      continue
    }

    if (res.status === 503) {
      // Model sedang dimuat (cold start) — tunggu lalu ulangi.
      const body = await res.json().catch(() => ({}))
      const wait = Math.min(30, Number(body.estimated_time) || 6)
      lastErr = new Error('Model HF sedang dimuat.')
      await sleep(wait * 1000)
      continue
    }
    if (res.status === 429) {
      lastErr = new Error('Rate limit HF tercapai.')
      await sleep(2000 * (attempt + 1))
      continue
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HF error ${res.status}: ${text.slice(0, 300)}`)
    }

    const data = await res.json()
    const vectors = normalizeResponse(data, texts.length)
    if (!vectors.length || vectors[0].length !== EMBED_DIM) {
      throw new Error(
        `Dimensi embedding tak sesuai: dapat ${vectors[0]?.length}, harap ${EMBED_DIM}. ` +
          'Periksa EMBED_MODEL / EMBED_DIM.',
      )
    }
    return vectors
  }
  throw lastErr || new Error('Gagal memanggil embedding HF.')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

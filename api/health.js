/**
 * GET /api/health — cek cepat konfigurasi server (tanpa membocorkan kunci).
 * Berguna saat menyiapkan integrasi: memastikan env sudah terpasang di Vercel.
 */
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'serupa',
    model: process.env.EMBED_MODEL || 'BAAI/bge-m3',
    env: {
      supabase_url: Boolean(process.env.SUPABASE_URL),
      supabase_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      supabase_anon: Boolean(process.env.SUPABASE_ANON_KEY),
      hf_token: Boolean(process.env.HF_TOKEN),
      embed_endpoint: Boolean(process.env.EMBED_ENDPOINT_URL),
    },
    time: new Date().toISOString(),
  })
}

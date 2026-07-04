/**
 * POST /api/login — masuk memakai NIM (PRD §8, D6).
 *
 * Login pakai NIM, tapi email akun (email kampus asli) tidak boleh bocor ke
 * browser. Maka resolusi NIM → email + sign-in dikerjakan DI SERVER:
 *   1. Cari email akun dari NIM (service role membaca `profiles`, bypass RLS).
 *   2. Sign-in (email + password) memakai anon client.
 *   3. Balikkan HANYA token sesi → browser memasangnya via auth.setSession().
 *
 * Body: { nim, password }  →  { access_token, refresh_token, expires_at }
 */
import { adminClient, anonClient } from './_lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }

  try {
    const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
    const nim = String(body.nim || '').trim()
    const password = String(body.password || '')
    if (!nim || !password) {
      return res.status(400).json({ error: 'NIM dan kata sandi wajib diisi.' })
    }

    // 1. NIM → email (service role; bypass RLS). Email tidak dikirim ke klien.
    const admin = adminClient()
    const { data: profile, error: lookupErr } = await admin
      .from('profiles')
      .select('email')
      .eq('nim', nim)
      .maybeSingle()
    if (lookupErr) throw new Error('Pencarian akun gagal: ' + lookupErr.message)
    if (!profile?.email) {
      return res.status(401).json({ error: 'NIM atau kata sandi tidak cocok.' })
    }

    // 2. Sign-in (email + password).
    const anon = anonClient()
    const { data, error } = await anon.auth.signInWithPassword({
      email: profile.email,
      password,
    })
    if (error) {
      if (/confirm/i.test(error.message)) {
        return res.status(403).json({
          error:
            'Email belum diverifikasi. Selesaikan verifikasi OTP lewat halaman daftar untuk mengaktifkan akun.',
          code: 'email_not_confirmed',
        })
      }
      return res.status(401).json({ error: 'NIM atau kata sandi tidak cocok.' })
    }
    const session = data.session
    if (!session) return res.status(401).json({ error: 'Gagal masuk. Coba lagi.' })

    // 3. Kirim token sesi (BUKAN email) ke browser.
    return res.status(200).json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    })
  } catch (e) {
    console.error('[api/login]', e)
    return res.status(500).json({ error: e.message || 'Terjadi kesalahan pada server.' })
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

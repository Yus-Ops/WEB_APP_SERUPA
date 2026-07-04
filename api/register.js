/**
 * POST /api/register — daftar mahasiswa (PRD §8).
 *
 *   1. Pastikan NIM belum dipakai (service role membaca `profiles`).
 *   2. signUp(email kampus asli + password, metadata: nim/full_name/role) via anon.
 *      Dengan "Confirm email" ON, Supabase mengirim OTP verifikasi ke email itu.
 *   3. Balikkan { needsVerification }. Verifikasi OTP dilakukan di KLIEN — email
 *      adalah milik pendaftar sendiri (yang baru saja ia ketik), jadi bukan bocor.
 *
 * Body: { fullName, nim, email, password }
 */
import { adminClient, anonClient } from './_lib/supabaseAdmin.js'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }

  try {
    const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
    const nim = String(body.nim || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const fullName = String(body.fullName || '').trim()
    const password = String(body.password || '')

    if (!/^\d{6,}$/.test(nim)) {
      return res.status(400).json({ error: 'NIM harus berupa angka (min. 6 digit).' })
    }
    if (!emailRe.test(email)) return res.status(400).json({ error: 'Format email tidak valid.' })
    if (!fullName) return res.status(400).json({ error: 'Nama lengkap wajib diisi.' })
    if (password.length < 6) {
      return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' })
    }

    // 1. NIM unik? (`profiles.nim` unique, tapi cek di sini agar pesannya ramah.)
    const admin = adminClient()
    const { data: existing, error: lookupErr } = await admin
      .from('profiles')
      .select('id, email')
      .eq('nim', nim)
      .maybeSingle()
    if (lookupErr) throw new Error('Pemeriksaan NIM gagal: ' + lookupErr.message)
    if (existing) {
      // NIM sudah ada. Bila akunnya SUDAH terverifikasi → tolak. Bila BELUM
      // (mendaftar lalu tak selesai verifikasi) → kirim ulang OTP agar tak buntu.
      const { data: got } = await admin.auth.admin.getUserById(existing.id)
      if (got?.user?.email_confirmed_at) {
        return res.status(409).json({ error: 'NIM sudah terdaftar. Silakan masuk.', code: 'nim_taken' })
      }
      const anonResend = anonClient()
      await anonResend.auth.resend({ type: 'signup', email: existing.email })
      return res.status(200).json({ needsVerification: true, email: existing.email, resent: true })
    }

    // 2. Daftar (memicu OTP verifikasi ke email kampus).
    const anon = anonClient()
    const { data, error } = await anon.auth.signUp({
      email,
      password,
      options: { data: { nim, full_name: fullName, role: 'student' } },
    })
    if (error) {
      const taken = /already|registered|exists/i.test(error.message)
      return res.status(taken ? 409 : 400).json({
        error: taken ? 'Email sudah terdaftar. Silakan masuk.' : error.message,
        code: taken ? 'email_taken' : 'register_failed',
      })
    }

    // 3. Confirm email ON → belum ada sesi (perlu OTP). Confirm OFF → sesi langsung.
    if (data.session) {
      return res.status(200).json({
        needsVerification: false,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
    }
    return res.status(200).json({ needsVerification: true, email })
  } catch (e) {
    console.error('[api/register]', e)
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

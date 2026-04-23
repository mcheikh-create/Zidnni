// backend/routes/auth.js
import { Router } from 'express';
import process from 'node:process';
import { createUser, getUserByPhone, updateLastActive } from '../models/User.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// In-memory OTP store (good enough for Phase 2A with mock OTPs)
const pendingOtps = new Map();

function generateOtp() {
  const bypass = process.env.OTP_BYPASS_DEV;
  if (bypass) return bypass;
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { phone, name, locale = 'ar', city, country } = req.body;
  if (!phone || !name) {
    return res.status(400).json({ ok: false, error: 'رقم الهاتف والاسم مطلوبان.' });
  }

  let user = getUserByPhone(phone);
  if (!user) {
    user = createUser({ phone, name, locale, city, country });
  }

  const otp = generateOtp();
  pendingOtps.set(phone, { code: otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  // In production: send SMS. In dev: return OTP in response.
  const isDev = process.env.NODE_ENV !== 'production';
  res.json({
    ok: true,
    message: 'تم إرسال رمز التحقق إلى هاتفك.',
    ...(isDev && { otp }),
  });
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ ok: false, error: 'رقم الهاتف والرمز مطلوبان.' });
  }

  const pending = pendingOtps.get(phone);
  if (!pending) {
    return res.status(400).json({ ok: false, error: 'لم يتم طلب رمز تحقق لهذا الرقم.' });
  }
  if (Date.now() > pending.expiresAt) {
    pendingOtps.delete(phone);
    return res.status(400).json({ ok: false, error: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.' });
  }
  if (pending.code !== String(otp)) {
    return res.status(400).json({ ok: false, error: 'رمز التحقق غير صحيح.' });
  }

  pendingOtps.delete(phone);
  const user = getUserByPhone(phone);
  if (!user) return res.status(404).json({ ok: false, error: 'المستخدم غير موجود.' });

  updateLastActive(user.id);
  const token = generateToken(user.id);
  res.json({ ok: true, token, user: publicUser(user) });
});

// POST /api/auth/login — same as register (sends new OTP)
router.post('/login', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ ok: false, error: 'رقم الهاتف مطلوب.' });

  const user = getUserByPhone(phone);
  if (!user) return res.status(404).json({ ok: false, error: 'لم يتم تسجيل هذا الرقم. يرجى إنشاء حساب أولاً.' });

  const otp = generateOtp();
  pendingOtps.set(phone, { code: otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  const isDev = process.env.NODE_ENV !== 'production';
  res.json({
    ok: true,
    message: 'تم إرسال رمز التحقق إلى هاتفك.',
    ...(isDev && { otp }),
  });
});

// POST /api/auth — legacy Phase 1 endpoint (mint conversationId, no auth required)
router.post('/', (_req, res) => {
  res.json({
    conversationId: crypto.randomUUID(),
    createdAt: Date.now(),
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: publicUser(req.user) });
});

function publicUser(u) {
  return { id: u.id, name: u.name, phone: u.phone, tier: u.tier, locale: u.locale, city: u.city, country: u.country, createdAt: u.created_at };
}

export default router;

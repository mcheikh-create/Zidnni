// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import process from 'node:process';
import { getUserById } from '../models/User.js';

const secret = () => process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function generateToken(userId) {
  return jwt.sign({ sub: String(userId) }, secret(), { expiresIn: '90d' });
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'غير مصرح. يرجى تسجيل الدخول أولاً.' });
  }
  try {
    const payload = verifyToken(token);
    const user = getUserById(Number(payload.sub));
    if (!user) return res.status(401).json({ ok: false, error: 'المستخدم غير موجود.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'الجلسة منتهية. يرجى تسجيل الدخول مجدداً.' });
  }
}

export function requireTier(tier) {
  const order = { free: 0, personal: 1, business: 2 };
  return (req, res, next) => {
    const userTier = req.user?.tier || 'free';
    if ((order[userTier] || 0) >= (order[tier] || 0)) return next();
    return res.status(403).json({
      ok: false,
      error: 'هذه الميزة تتطلب خطة أعلى. يرجى الترقية للمتابعة.',
      requiredTier: tier,
    });
  };
}

// backend/routes/user.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { updateProfile } from '../models/User.js';
import { getDailyUsage, getMonthlyUsage } from '../models/Usage.js';

const router = Router();

router.get('/profile', requireAuth, (req, res) => {
  const u = req.user;
  res.json({
    ok: true,
    user: { id: u.id, name: u.name, phone: u.phone, tier: u.tier, locale: u.locale, city: u.city, country: u.country, createdAt: u.created_at, lastActive: u.last_active },
  });
});

router.patch('/profile', requireAuth, (req, res) => {
  const { name, locale, city } = req.body;
  const updated = updateProfile(req.user.id, { name, locale, city });
  res.json({ ok: true, user: updated });
});

router.get('/usage', requireAuth, (req, res) => {
  const daily = getDailyUsage(req.user.id);
  const monthly = getMonthlyUsage(req.user.id);
  const FREE_LIMIT = 20;
  res.json({
    ok: true,
    daily,
    monthly,
    limit: req.user.tier === 'free' ? FREE_LIMIT : null,
    remaining: req.user.tier === 'free' ? Math.max(0, FREE_LIMIT - daily.message_count) : null,
  });
});

export default router;

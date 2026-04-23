// backend/middleware/rateLimiter.js
import { getDailyUsage } from '../models/Usage.js';

const FREE_DAILY_LIMIT = 20;

export function tierRateLimit(req, res, next) {
  const user = req.user;
  if (!user || user.tier !== 'free') return next();

  const usage = getDailyUsage(user.id);
  if (usage.message_count >= FREE_DAILY_LIMIT) {
    return res.status(429).json({
      ok: false,
      error: 'لقد استنفدت رصيدك اليومي. يرجى الترقية للاستمرار.',
      limit: FREE_DAILY_LIMIT,
      used: usage.message_count,
    });
  }
  next();
}

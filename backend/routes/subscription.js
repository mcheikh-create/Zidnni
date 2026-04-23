// backend/routes/subscription.js
import { Router } from 'express';
import process from 'node:process';
import { requireAuth } from '../middleware/auth.js';
import { getActiveSubscription } from '../models/Subscription.js';

const router = Router();

const PLANS = [
  {
    id: 'free',
    nameAr: 'زدني الحر',
    nameFr: 'Zidnni Gratuit',
    nameEn: 'Zidnni Free',
    priceMRU: 0,
    priceUSD: 0,
    period: 'month',
    features: {
      ar: ['20 رسالة يومياً', 'محادثة نصية فقط', 'العربية والفرنسية والحسانية'],
      fr: ['20 messages/jour', 'Chat texte uniquement', 'Arabe, Français, Hassaniya'],
      en: ['20 messages/day', 'Text chat only', 'Arabic, French, Hassaniya'],
    },
    highlight: false,
  },
  {
    id: 'personal',
    nameAr: 'زدني الشخصي',
    nameFr: 'Zidnni Personnel',
    nameEn: 'Zidnni Personal',
    priceMRU: 500,
    priceUSD: 9.99,
    period: 'month',
    features: {
      ar: ['رسائل غير محدودة', 'واتساب', 'إدخال صوتي', 'تحليل المستندات (10/شهر)', 'تحليل الصور'],
      fr: ['Messages illimités', 'WhatsApp', 'Saisie vocale', "Analyse de documents (10/mois)", "Analyse d'images"],
      en: ['Unlimited messages', 'WhatsApp', 'Voice input', 'Document Q&A (10/month)', 'Image analysis'],
    },
    highlight: true,
  },
  {
    id: 'business',
    nameAr: 'زدني الأعمال',
    nameFr: 'Zidnni Business',
    nameEn: 'Zidnni Business',
    priceMRU: 2000,
    priceUSD: 49,
    period: 'month',
    features: {
      ar: ['كل مميزات الشخصي', '5 أعضاء فريق', 'قاعدة معرفة مخصصة', 'وصول API', 'لوحة تحليلات', 'دعم أولوية'],
      fr: ["Tout le plan Personnel", "5 membres d'équipe", "Base de connaissances", "Accès API", "Tableau de bord", "Support prioritaire"],
      en: ['Everything in Personal', '5 team members', 'Custom knowledge base', 'API access', 'Analytics dashboard', 'Priority support'],
    },
    highlight: false,
  },
];

// GET /api/subscription/plans
router.get('/plans', (_req, res) => {
  res.json({ ok: true, plans: PLANS });
});

// GET /api/subscription/status
router.get('/status', requireAuth, (req, res) => {
  const sub = getActiveSubscription(req.user.id);
  res.json({
    ok: true,
    tier: req.user.tier,
    subscription: sub || null,
  });
});

// POST /api/subscription/create
router.post('/create', requireAuth, async (req, res) => {
  const { tier } = req.body;
  if (!['personal', 'business'].includes(tier)) {
    return res.status(400).json({ ok: false, error: 'الخطة غير صالحة.' });
  }

  // Stripe not configured yet — return a placeholder
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_placeholder')) {
    return res.json({
      ok: false,
      error: 'بوابة الدفع قيد الإعداد. تواصل معنا على WhatsApp للترقية اليدوية.',
      whatsapp: '+22200000000',
    });
  }

  try {
    const { createCheckoutSession } = await import('../services/stripe.js');
    const session = await createCheckoutSession({
      userId: req.user.id,
      tier,
      successUrl: `${req.headers.origin}/dashboard?upgraded=1`,
      cancelUrl: `${req.headers.origin}/dashboard`,
    });
    res.json({ ok: true, url: session.url });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/subscription/webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const { handleWebhook } = await import('../services/stripe.js');
    const { updateByStripeId } = await import('../models/Subscription.js');
    const { updateTier } = await import('../models/User.js');

    const event = await handleWebhook(req.body, sig);
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const s = event.data.object;
      await updateByStripeId(s.id, { status: s.status });
      if (s.status !== 'active') {
        const sub = await updateByStripeId(s.id, {});
        if (sub) updateTier(sub.user_id, 'free');
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

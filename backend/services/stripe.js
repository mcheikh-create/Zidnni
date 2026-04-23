// backend/services/stripe.js
import process from 'node:process';
import Stripe from 'stripe';

let _stripe = null;

function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  }
  return _stripe;
}

export async function createCheckoutSession({ userId, tier, successUrl, cancelUrl }) {
  const stripe = getStripe();
  const priceId = tier === 'business'
    ? process.env.STRIPE_PRICE_BUSINESS
    : process.env.STRIPE_PRICE_PERSONAL;

  if (!priceId) throw new Error(`No price ID configured for tier: ${tier}`);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl || `${process.env.APP_URL}/dashboard?upgraded=1`,
    cancel_url: cancelUrl || `${process.env.APP_URL}/dashboard`,
    metadata: { userId: String(userId), tier },
  });
  return session;
}

export async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

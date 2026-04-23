// backend/models/Subscription.js
import db from '../db.js';

export function createSubscription({ userId, tier, stripeCustomerId, stripeSubscriptionId, paymentMethod }) {
  const stmt = db.prepare(
    `INSERT INTO subscriptions (user_id, tier, stripe_customer_id, stripe_subscription_id, payment_method)
     VALUES (@userId, @tier, @stripeCustomerId, @stripeSubscriptionId, @paymentMethod)`
  );
  const result = stmt.run({ userId, tier, stripeCustomerId: stripeCustomerId || null, stripeSubscriptionId: stripeSubscriptionId || null, paymentMethod: paymentMethod || null });
  return getSubscriptionById(result.lastInsertRowid);
}

export function getSubscriptionById(id) {
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
}

export function getActiveSubscription(userId) {
  return db.prepare(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1"
  ).get(userId);
}

export function updateStatus(subscriptionId, status) {
  db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?').run(status, subscriptionId);
}

export function updateByStripeId(stripeSubscriptionId, fields) {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?').get(stripeSubscriptionId);
  if (!sub) return null;
  if (fields.status) db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?').run(fields.status, sub.id);
  if (fields.endDate) db.prepare('UPDATE subscriptions SET end_date = ? WHERE id = ?').run(fields.endDate, sub.id);
  return getSubscriptionById(sub.id);
}

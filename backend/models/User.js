// backend/models/User.js
import db from '../db.js';

export function createUser({ phone, name, locale = 'ar', city, country = 'MR' }) {
  const stmt = db.prepare(
    `INSERT INTO users (phone, name, locale, city, country)
     VALUES (@phone, @name, @locale, @city, @country)`
  );
  const result = stmt.run({ phone, name, locale, city, country });
  return getUserById(result.lastInsertRowid);
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserByPhone(phone) {
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
}

export function updateTier(userId, tier) {
  db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(tier, userId);
  return getUserById(userId);
}

export function updateLastActive(userId) {
  db.prepare("UPDATE users SET last_active = datetime('now') WHERE id = ?").run(userId);
}

export function updateProfile(userId, { name, locale, city }) {
  db.prepare(
    'UPDATE users SET name = COALESCE(@name, name), locale = COALESCE(@locale, locale), city = COALESCE(@city, city) WHERE id = @id'
  ).run({ name, locale, city, id: userId });
  return getUserById(userId);
}

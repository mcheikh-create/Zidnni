// backend/models/Usage.js
import db from '../db.js';

const today = () => new Date().toISOString().slice(0, 10);

export function incrementMessages(userId) {
  db.prepare(
    `INSERT INTO usage (user_id, date, message_count)
     VALUES (@userId, @date, 1)
     ON CONFLICT(user_id, date) DO UPDATE SET message_count = message_count + 1`
  ).run({ userId, date: today() });
}

export function getDailyUsage(userId, date = today()) {
  return db.prepare('SELECT * FROM usage WHERE user_id = ? AND date = ?').get(userId, date)
    || { user_id: userId, date, message_count: 0, documents_count: 0, voice_seconds: 0 };
}

export function getMonthlyUsage(userId) {
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  const rows = db.prepare(
    'SELECT * FROM usage WHERE user_id = ? AND date >= ?'
  ).all(userId, monthStart);
  return rows.reduce(
    (acc, r) => ({
      message_count: acc.message_count + r.message_count,
      documents_count: acc.documents_count + r.documents_count,
      voice_seconds: acc.voice_seconds + r.voice_seconds,
    }),
    { message_count: 0, documents_count: 0, voice_seconds: 0 }
  );
}

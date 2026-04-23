// backend/db.js — SQLite initialisation and migrations
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_URL
  ? path.resolve(process.env.DATABASE_URL)
  : path.join(__dirname, '..', 'zidnni.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    phone       TEXT    UNIQUE,
    email       TEXT,
    name        TEXT,
    tier        TEXT    NOT NULL DEFAULT 'free',
    locale      TEXT    NOT NULL DEFAULT 'ar',
    city        TEXT,
    country     TEXT    DEFAULT 'MR',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    last_active TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT NOT NULL,
    code       TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                INTEGER NOT NULL REFERENCES users(id),
    tier                   TEXT    NOT NULL DEFAULT 'free',
    status                 TEXT    NOT NULL DEFAULT 'active',
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    payment_method         TEXT,
    start_date             TEXT    NOT NULL DEFAULT (datetime('now')),
    end_date               TEXT
  );

  CREATE TABLE IF NOT EXISTS usage (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    date            TEXT    NOT NULL,
    message_count   INTEGER NOT NULL DEFAULT 0,
    documents_count INTEGER NOT NULL DEFAULT 0,
    voice_seconds   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
  );
`);

export default db;

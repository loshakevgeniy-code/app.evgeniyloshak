import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { hashPassword, hashToken } from './security.mjs'

export function openDatabase(path) {
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entitlements (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      valid_until TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  `)
  return db
}

export function bootstrapProduct(db) {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO products (slug, title, status, created_at)
    VALUES (?, ?, 'active', ?)
    ON CONFLICT(slug) DO UPDATE SET title = excluded.title, status = 'active'
  `).run('know-you', 'Lilya', now)
}

export function bootstrapAdmin(db, config) {
  if (!config.email || !config.password) return false
  const email = config.email.trim().toLowerCase()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  const now = new Date().toISOString()
  let userId = existing?.id

  if (!userId) {
    const { salt, hash } = hashPassword(config.password)
    const result = db.prepare(`
      INSERT INTO users (email, display_name, password_salt, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, 'admin', ?)
    `).run(email, config.name || 'Евгений', salt, hash, now)
    userId = Number(result.lastInsertRowid)
  }

  const product = db.prepare('SELECT id FROM products WHERE slug = ?').get('know-you')
  db.prepare(`
    INSERT INTO entitlements (user_id, product_id, status, valid_until, created_at)
    VALUES (?, ?, 'active', NULL, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET status = 'active'
  `).run(userId, product.id, now)
  return true
}

export function upsertAccessUser(db, config) {
  const email = config.email.trim().toLowerCase()
  const now = new Date().toISOString()
  const { salt, hash } = hashPassword(config.password)
  db.prepare(`
    INSERT INTO users (email, display_name, password_salt, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, 'customer', ?)
    ON CONFLICT(email) DO UPDATE SET
      display_name = excluded.display_name,
      password_salt = excluded.password_salt,
      password_hash = excluded.password_hash
  `).run(email, config.name || 'Пользователь', salt, hash, now)
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  const product = db.prepare('SELECT id FROM products WHERE slug = ?').get('know-you')
  db.prepare(`
    INSERT INTO entitlements (user_id, product_id, status, valid_until, created_at)
    VALUES (?, ?, 'active', ?, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET status = 'active', valid_until = excluded.valid_until
  `).run(user.id, product.id, config.validUntil || null, now)
  return true
}

export function findUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase())
}

export function createSession(db, userId, token, expiresAt) {
  const now = new Date().toISOString()
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now)
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), userId, expiresAt, now)
}

export function deleteSession(db, token) {
  if (!token) return
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
}

export function findSessionUser(db, token) {
  if (!token) return null
  const now = new Date().toISOString()
  return db.prepare(`
    SELECT u.id, u.email, u.display_name, u.role, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(hashToken(token), now) || null
}

export function listProductsForUser(db, userId) {
  const now = new Date().toISOString()
  return db.prepare(`
    SELECT p.slug, p.title, e.status, e.valid_until
    FROM entitlements e
    JOIN products p ON p.id = e.product_id
    WHERE e.user_id = ?
      AND e.status = 'active'
      AND p.status = 'active'
      AND (e.valid_until IS NULL OR e.valid_until > ?)
    ORDER BY p.id
  `).all(userId, now)
}

export function hasProductAccess(db, userId, slug) {
  const now = new Date().toISOString()
  const result = db.prepare(`
    SELECT 1 AS allowed
    FROM entitlements e
    JOIN products p ON p.id = e.product_id
    WHERE e.user_id = ? AND p.slug = ?
      AND e.status = 'active' AND p.status = 'active'
      AND (e.valid_until IS NULL OR e.valid_until > ?)
  `).get(userId, slug, now)
  return Boolean(result?.allowed)
}

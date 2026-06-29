import { getDb } from '../db/index.js';

export const userRepo = {
  create({ email, displayName, passwordHash, role = 'user' }) {
    const stmt = getDb().prepare(
      `INSERT INTO users (email, display_name, password_hash, role)
       VALUES (?, ?, ?, ?)`
    );
    const info = stmt.run(email.toLowerCase(), displayName, passwordHash, role);
    return this.findById(info.lastInsertRowid);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return getDb()
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(String(email).toLowerCase());
  },

  count() {
    return getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n;
  },
};

export const refreshRepo = {
  store({ userId, tokenHash, expiresAt }) {
    getDb()
      .prepare(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`
      )
      .run(userId, tokenHash, expiresAt);
  },

  findValid(tokenHash) {
    return getDb()
      .prepare(
        `SELECT * FROM refresh_tokens
         WHERE token_hash = ? AND revoked_at IS NULL
           AND datetime(expires_at) > datetime('now')`
      )
      .get(tokenHash);
  },

  revoke(tokenHash) {
    getDb()
      .prepare(
        `UPDATE refresh_tokens SET revoked_at = datetime('now')
         WHERE token_hash = ?`
      )
      .run(tokenHash);
  },

  revokeAllForUser(userId) {
    getDb()
      .prepare(
        `UPDATE refresh_tokens SET revoked_at = datetime('now')
         WHERE user_id = ? AND revoked_at IS NULL`
      )
      .run(userId);
  },
};

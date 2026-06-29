import { getDb } from '../db/index.js';

// Public (safe) columns — never includes credential_cipher.
const PUBLIC_COLS = `id, user_id, platform, username, status,
  last_verified_at, created_at, updated_at`;

export const accountRepo = {
  create({ userId, platform, username, credentialCipher }) {
    const info = getDb()
      .prepare(
        `INSERT INTO social_accounts (user_id, platform, username, credential_cipher)
         VALUES (?, ?, ?, ?)`
      )
      .run(userId, platform, username, credentialCipher);
    return this.findById(userId, info.lastInsertRowid);
  },

  /** Returns the public view of an account owned by userId. */
  findById(userId, id) {
    return getDb()
      .prepare(
        `SELECT ${PUBLIC_COLS} FROM social_accounts WHERE id = ? AND user_id = ?`
      )
      .get(id, userId);
  },

  /** Returns the full row (including cipher) — for internal use only. */
  findWithSecret(userId, id) {
    return getDb()
      .prepare('SELECT * FROM social_accounts WHERE id = ? AND user_id = ?')
      .get(id, userId);
  },

  listByUser(userId) {
    return getDb()
      .prepare(
        `SELECT ${PUBLIC_COLS} FROM social_accounts
         WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(userId);
  },

  setStatus(userId, id, status) {
    getDb()
      .prepare(
        `UPDATE social_accounts
         SET status = ?, last_verified_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .run(status, id, userId);
    return this.findById(userId, id);
  },

  /** Refresh the encrypted credential blob WITHOUT resetting verification. */
  updateTokens(userId, id, credentialCipher) {
    getDb()
      .prepare(
        `UPDATE social_accounts
         SET credential_cipher = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .run(credentialCipher, id, userId);
    return this.findWithSecret(userId, id);
  },

  /** Find by (user, platform, username) — used to upsert OAuth connections. */
  findByHandle(userId, platform, username) {
    return getDb()
      .prepare(
        `SELECT * FROM social_accounts
         WHERE user_id = ? AND platform = ? AND username = ?`
      )
      .get(userId, platform, username);
  },

  /** Create or update an OAuth-connected account, marking it verified. */
  upsertOAuth({ userId, platform, username, credentialCipher }) {
    const existing = this.findByHandle(userId, platform, username);
    if (existing) {
      getDb()
        .prepare(
          `UPDATE social_accounts
           SET credential_cipher = ?, status = 'verified',
               last_verified_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(credentialCipher, existing.id);
      return this.findById(userId, existing.id);
    }
    const info = getDb()
      .prepare(
        `INSERT INTO social_accounts
           (user_id, platform, username, credential_cipher, status, last_verified_at)
         VALUES (?, ?, ?, ?, 'verified', datetime('now'))`
      )
      .run(userId, platform, username, credentialCipher);
    return this.findById(userId, info.lastInsertRowid);
  },

  updateCredential(userId, id, credentialCipher) {
    getDb()
      .prepare(
        `UPDATE social_accounts
         SET credential_cipher = ?, status = 'unverified',
             updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .run(credentialCipher, id, userId);
    return this.findById(userId, id);
  },

  remove(userId, id) {
    return getDb()
      .prepare('DELETE FROM social_accounts WHERE id = ? AND user_id = ?')
      .run(id, userId).changes;
  },
};

import { getDb } from '../db/index.js';

export const videoRepo = {
  create({ userId, title, prompt, provider }) {
    const info = getDb()
      .prepare(
        `INSERT INTO videos (user_id, title, prompt, provider, status)
         VALUES (?, ?, ?, ?, 'draft')`
      )
      .run(userId, title, prompt, provider);
    return this.findById(userId, info.lastInsertRowid);
  },

  findById(userId, id) {
    return getDb()
      .prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?')
      .get(id, userId);
  },

  listByUser(userId) {
    return getDb()
      .prepare('SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId);
  },

  update(userId, id, fields) {
    const allowed = [
      'title', 'script', 'status', 'duration_sec', 'asset_path',
      'thumb_path', 'scene_json', 'error', 'approved_at',
    ];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k));
    if (keys.length === 0) return this.findById(userId, id);

    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => fields[k]);
    getDb()
      .prepare(
        `UPDATE videos SET ${setClause}, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .run(...values, id, userId);
    return this.findById(userId, id);
  },

  remove(userId, id) {
    return getDb()
      .prepare('DELETE FROM videos WHERE id = ? AND user_id = ?')
      .run(id, userId).changes;
  },
};

export const publicationRepo = {
  create({ videoId, accountId, userId, platform }) {
    const info = getDb()
      .prepare(
        `INSERT INTO publications (video_id, account_id, user_id, platform)
         VALUES (?, ?, ?, ?)`
      )
      .run(videoId, accountId, userId, platform);
    return this.findById(info.lastInsertRowid);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM publications WHERE id = ?').get(id);
  },

  markResult(id, { status, remoteId, remoteUrl, error }) {
    getDb()
      .prepare(
        `UPDATE publications
         SET status = ?, remote_id = ?, remote_url = ?, error = ?,
             published_at = CASE WHEN ? = 'published' THEN datetime('now') ELSE published_at END
         WHERE id = ?`
      )
      .run(status, remoteId ?? null, remoteUrl ?? null, error ?? null, status, id);
    return this.findById(id);
  },

  listByVideo(videoId) {
    return getDb()
      .prepare('SELECT * FROM publications WHERE video_id = ? ORDER BY created_at DESC')
      .all(videoId);
  },

  listByUser(userId) {
    return getDb()
      .prepare('SELECT * FROM publications WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId);
  },
};

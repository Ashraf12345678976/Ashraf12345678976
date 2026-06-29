import { getDb } from '../db/index.js';

export const analyticsRepo = {
  recordView({ publicationId, videoId, platform, viewerHash, watchSeconds = 0 }) {
    getDb()
      .prepare(
        `INSERT INTO view_events
           (publication_id, video_id, platform, viewer_hash, watch_seconds)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(publicationId, videoId, platform, viewerHash ?? null, watchSeconds);
  },

  /** Aggregate totals across everything this user has published. */
  summaryForUser(userId) {
    const db = getDb();
    const totals = db
      .prepare(
        `SELECT
            COUNT(*)                                AS total_views,
            COUNT(DISTINCT v.viewer_hash)           AS unique_viewers,
            COALESCE(SUM(v.watch_seconds), 0)       AS total_watch_seconds
         FROM view_events v
         JOIN publications p ON p.id = v.publication_id
         WHERE p.user_id = ?`
      )
      .get(userId);

    const byPlatform = db
      .prepare(
        `SELECT v.platform,
                COUNT(*)                      AS views,
                COUNT(DISTINCT v.viewer_hash) AS unique_viewers
         FROM view_events v
         JOIN publications p ON p.id = v.publication_id
         WHERE p.user_id = ?
         GROUP BY v.platform
         ORDER BY views DESC`
      )
      .all(userId);

    const topVideos = db
      .prepare(
        `SELECT vid.id, vid.title,
                COUNT(ve.id)                    AS views,
                COUNT(DISTINCT ve.viewer_hash)  AS unique_viewers
         FROM videos vid
         LEFT JOIN view_events ve ON ve.video_id = vid.id
         WHERE vid.user_id = ?
         GROUP BY vid.id
         ORDER BY views DESC
         LIMIT 10`
      )
      .all(userId);

    const counts = db
      .prepare(
        `SELECT
            (SELECT COUNT(*) FROM videos WHERE user_id = ?)                       AS videos,
            (SELECT COUNT(*) FROM videos WHERE user_id = ? AND status='published') AS published,
            (SELECT COUNT(*) FROM social_accounts WHERE user_id = ?)              AS accounts`
      )
      .get(userId, userId, userId);

    return { totals, byPlatform, topVideos, counts };
  },

  perVideo(userId, videoId) {
    return getDb()
      .prepare(
        `SELECT v.platform,
                COUNT(*)                      AS views,
                COUNT(DISTINCT v.viewer_hash) AS unique_viewers,
                COALESCE(SUM(v.watch_seconds),0) AS watch_seconds
         FROM view_events v
         JOIN publications p ON p.id = v.publication_id
         WHERE p.user_id = ? AND v.video_id = ?
         GROUP BY v.platform`
      )
      .all(userId, videoId);
  },
};

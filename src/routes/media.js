import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import config from '../config/index.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { verifyMediaToken } from '../security/tokens.js';
import { getDb } from '../db/index.js';

const router = Router();

// GET /public/media/:token  — public, read-only access to one video's asset,
// authorised by a short-lived signed token. Used by external services
// (e.g. Instagram's video fetcher) that cannot send our auth headers.
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    let payload;
    try {
      payload = verifyMediaToken(req.params.token);
    } catch {
      throw new HttpError(403, 'Invalid or expired media token');
    }

    // The token only carries a video id; look it up directly.
    const video = getDb()
      .prepare('SELECT * FROM videos WHERE id = ?')
      .get(payload.vid);
    if (!video || !video.asset_path) throw new HttpError(404, 'Asset not found');

    const abs = path.resolve(config.paths.media, video.asset_path);
    if (!abs.startsWith(path.resolve(config.paths.media)) || !fs.existsSync(abs)) {
      throw new HttpError(404, 'Asset file missing');
    }

    const mime = abs.endsWith('.mp4') ? 'video/mp4' : 'image/svg+xml';
    res.type(mime);
    res.setHeader('Cache-Control', 'public, max-age=600');
    fs.createReadStream(abs).pipe(res);
  })
);

export default router;

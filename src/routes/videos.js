import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import config from '../config/index.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { videoRepo, publicationRepo } from '../repositories/videoRepo.js';
import { getProvider } from '../services/aiVideo/index.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1).max(140),
  prompt: z.string().min(5).max(2000),
});

function serialize(v) {
  return {
    id: v.id,
    title: v.title,
    prompt: v.prompt,
    script: v.script,
    status: v.status,
    provider: v.provider,
    durationSec: v.duration_sec,
    hasAsset: Boolean(v.asset_path),
    assetUrl: v.asset_path ? `/api/videos/${v.id}/stream` : null,
    thumbUrl: v.thumb_path ? `/api/videos/${v.id}/thumb` : null,
    approvedAt: v.approved_at,
    error: v.error,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };
}

// GET /api/videos
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ videos: videoRepo.listByUser(req.user.id).map(serialize) });
  })
);

// GET /api/videos/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const v = videoRepo.findById(req.user.id, Number(req.params.id));
    if (!v) throw new HttpError(404, 'Video not found');
    res.json({
      video: serialize(v),
      publications: publicationRepo.listByVideo(v.id),
    });
  })
);

// POST /api/videos  — create + generate the asset synchronously.
router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    let video = videoRepo.create({
      userId: req.user.id,
      title: req.body.title,
      prompt: req.body.prompt,
      provider: provider.id,
    });

    video = videoRepo.update(req.user.id, video.id, { status: 'generating' });

    try {
      const result = await provider.generate({
        videoId: video.id,
        title: video.title,
        prompt: video.prompt,
      });
      video = videoRepo.update(req.user.id, video.id, {
        status: 'ready_for_review',
        script: result.script,
        duration_sec: result.durationSec,
        asset_path: result.assetPath,
        thumb_path: result.thumbPath,
        scene_json: JSON.stringify(result.scenes ?? []),
        error: null,
      });
    } catch (e) {
      video = videoRepo.update(req.user.id, video.id, {
        status: 'failed',
        error: e.message,
      });
      throw new HttpError(502, `Generation failed: ${e.message}`);
    }

    res.status(201).json({ video: serialize(video) });
  })
);

// Helper: safely resolve a media file that belongs to this user's video.
function resolveAsset(req, field) {
  const v = videoRepo.findById(req.user.id, Number(req.params.id));
  if (!v || !v[field]) throw new HttpError(404, 'Asset not found');
  const abs = path.resolve(config.paths.media, v[field]);
  // Guard against path traversal.
  if (!abs.startsWith(path.resolve(config.paths.media))) {
    throw new HttpError(400, 'Invalid asset path');
  }
  if (!fs.existsSync(abs)) throw new HttpError(404, 'Asset file missing');
  return abs;
}

// GET /api/videos/:id/stream  — watch the generated video (review step).
router.get(
  '/:id/stream',
  asyncHandler(async (req, res) => {
    const abs = resolveAsset(req, 'asset_path');
    res.type('image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(abs).pipe(res);
  })
);

// GET /api/videos/:id/thumb
router.get(
  '/:id/thumb',
  asyncHandler(async (req, res) => {
    const abs = resolveAsset(req, 'thumb_path');
    res.type('image/svg+xml');
    fs.createReadStream(abs).pipe(res);
  })
);

// POST /api/videos/:id/approve  — operator confirms after watching.
router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const v = videoRepo.findById(req.user.id, Number(req.params.id));
    if (!v) throw new HttpError(404, 'Video not found');
    if (v.status !== 'ready_for_review' && v.status !== 'approved') {
      throw new HttpError(
        409,
        `Only videos that are ready for review can be approved (current: ${v.status})`
      );
    }
    const updated = videoRepo.update(req.user.id, v.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    res.json({ video: serialize(updated) });
  })
);

// DELETE /api/videos/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const v = videoRepo.findById(req.user.id, Number(req.params.id));
    if (!v) throw new HttpError(404, 'Video not found');
    videoRepo.remove(req.user.id, v.id);
    // Best-effort cleanup of media files.
    try {
      fs.rmSync(path.join(config.paths.media, String(v.id)), {
        recursive: true,
        force: true,
      });
    } catch {
      /* ignore */
    }
    res.json({ ok: true });
  })
);

export { serialize as serializeVideo };
export default router;

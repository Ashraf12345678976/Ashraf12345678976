import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { analyticsRepo } from '../repositories/analyticsRepo.js';
import { publicationRepo } from '../repositories/videoRepo.js';
import { sha256 } from '../security/crypto.js';

const router = Router();

// GET /api/analytics/summary  — dashboard numbers (auth required).
router.get(
  '/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(analyticsRepo.summaryForUser(req.user.id));
  })
);

// GET /api/analytics/videos/:id  — per-video breakdown.
router.get(
  '/videos/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      breakdown: analyticsRepo.perVideo(req.user.id, Number(req.params.id)),
    });
  })
);

const viewSchema = z.object({
  publicationId: z.number().int().positive(),
  watchSeconds: z.number().int().min(0).max(86400).optional(),
});

// POST /api/analytics/view  — PUBLIC: records a watch event for a published
// post. Simulates the webhook a real platform would send. The viewer is
// anonymised (hashed IP + UA) so we can count unique viewers without storing PII.
router.post(
  '/view',
  validate(viewSchema),
  asyncHandler(async (req, res) => {
    const pub = publicationRepo.findById(req.body.publicationId);
    if (!pub || pub.status !== 'published') {
      throw new HttpError(404, 'Publication not found');
    }
    const fingerprint = `${req.ip}|${req.headers['user-agent'] || ''}`;
    analyticsRepo.recordView({
      publicationId: pub.id,
      videoId: pub.video_id,
      platform: pub.platform,
      viewerHash: sha256(fingerprint),
      watchSeconds: req.body.watchSeconds ?? 0,
    });
    res.status(202).json({ ok: true });
  })
);

export default router;

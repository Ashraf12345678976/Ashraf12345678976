import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { videoRepo, publicationRepo } from '../repositories/videoRepo.js';
import { accountRepo } from '../repositories/accountRepo.js';
import { decryptJson } from '../security/crypto.js';
import { getAdapter } from '../services/social/index.js';

const router = Router();
router.use(requireAuth);

const publishSchema = z.object({
  accountIds: z.array(z.number().int().positive()).min(1).max(20),
});

// POST /api/videos/:id/publish  — fan out to one or more social accounts.
router.post(
  '/:id/publish',
  validate(publishSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const video = videoRepo.findById(userId, Number(req.params.id));
    if (!video) throw new HttpError(404, 'Video not found');

    // ENFORCE the review gate: a video must be watched & approved first.
    if (video.status !== 'approved' && video.status !== 'published') {
      throw new HttpError(
        409,
        'Video must be reviewed and approved before publishing'
      );
    }

    videoRepo.update(userId, video.id, { status: 'publishing' });

    const results = [];
    for (const accountId of req.body.accountIds) {
      const account = accountRepo.findWithSecret(userId, accountId);
      if (!account) {
        results.push({ accountId, status: 'failed', error: 'Account not found' });
        continue;
      }
      if (account.status !== 'verified') {
        results.push({
          accountId,
          platform: account.platform,
          status: 'failed',
          error: 'Account is not verified',
        });
        continue;
      }

      const pub = publicationRepo.create({
        videoId: video.id,
        accountId: account.id,
        userId,
        platform: account.platform,
      });

      try {
        const credentials = decryptJson(account.credential_cipher);
        const adapter = getAdapter(account.platform);
        const out = await adapter.publish({ video, account, credentials });
        const saved = publicationRepo.markResult(pub.id, {
          status: 'published',
          remoteId: out.remoteId,
          remoteUrl: out.remoteUrl,
        });
        results.push({
          accountId,
          platform: account.platform,
          status: 'published',
          publicationId: saved.id,
          remoteUrl: saved.remote_url,
        });
      } catch (e) {
        publicationRepo.markResult(pub.id, { status: 'failed', error: e.message });
        results.push({
          accountId,
          platform: account.platform,
          status: 'failed',
          error: e.message,
        });
      }
    }

    const anyPublished = results.some((r) => r.status === 'published');
    const updated = videoRepo.update(userId, video.id, {
      status: anyPublished ? 'published' : 'approved',
    });

    res.json({ video: { id: updated.id, status: updated.status }, results });
  })
);

export default router;

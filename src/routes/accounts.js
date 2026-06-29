import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { accountRepo } from '../repositories/accountRepo.js';
import { encryptJson, decryptJson } from '../security/crypto.js';
import { getAdapter, SUPPORTED_PLATFORMS } from '../services/social/index.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  platform: z.enum(SUPPORTED_PLATFORMS),
  username: z.string().min(2).max(120),
  password: z.string().min(6).max(400), // password or API token
});

// GET /api/accounts
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ accounts: accountRepo.listByUser(req.user.id) });
  })
);

// POST /api/accounts  — store encrypted credentials, then auto-verify.
router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { platform, username, password } = req.body;
    const cipher = encryptJson({ username, password });

    let account;
    try {
      account = accountRepo.create({
        userId: req.user.id,
        platform,
        username,
        credentialCipher: cipher,
      });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        throw new HttpError(409, 'That account is already connected');
      }
      throw e;
    }

    // Immediately verify the credentials with the platform adapter.
    const adapter = getAdapter(platform);
    const result = await adapter.verifyCredentials({ username, password });
    account = accountRepo.setStatus(
      req.user.id,
      account.id,
      result.ok ? 'verified' : 'invalid'
    );

    res.status(201).json({ account, verification: result });
  })
);

// POST /api/accounts/:id/verify  — re-verify stored credentials.
router.post(
  '/:id/verify',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const row = accountRepo.findWithSecret(req.user.id, id);
    if (!row) throw new HttpError(404, 'Account not found');

    const credentials = decryptJson(row.credential_cipher);
    const adapter = getAdapter(row.platform);
    const result = await adapter.verifyCredentials(credentials);
    const account = accountRepo.setStatus(
      req.user.id,
      id,
      result.ok ? 'verified' : 'invalid'
    );
    res.json({ account, verification: result });
  })
);

// DELETE /api/accounts/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const changes = accountRepo.remove(req.user.id, Number(req.params.id));
    if (!changes) throw new HttpError(404, 'Account not found');
    res.json({ ok: true });
  })
);

export default router;

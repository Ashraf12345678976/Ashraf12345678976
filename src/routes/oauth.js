import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { getAdapter, SUPPORTED_PLATFORMS, oauthStatus } from '../services/social/index.js';
import { createPkce, signState, verifyState } from '../security/oauthState.js';
import { accountRepo } from '../repositories/accountRepo.js';
import { encryptJson } from '../security/crypto.js';

const router = Router();

// GET /api/oauth/status  — which platforms have a configured OAuth app.
router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ platforms: oauthStatus() });
  })
);

// GET /api/oauth/:platform/start  — returns the provider authorize URL.
// (Returns JSON so the SPA can open it; the browser then redirects.)
router.get(
  '/:platform/start',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { platform } = req.params;
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      throw new HttpError(404, 'Unknown platform');
    }
    const adapter = getAdapter(platform);
    if (!adapter.isConfigured()) {
      throw new HttpError(
        501,
        `${platform} OAuth is not configured on the server. ` +
          `Set its client id/secret in the environment.`
      );
    }
    const pkce = createPkce();
    const state = signState({ userId: req.user.id, platform, verifier: pkce.verifier });
    const url = adapter.getAuthUrl(state, pkce);
    res.json({ url });
  })
);

// GET /api/oauth/:platform/callback  — provider redirects here with ?code&state.
// No requireAuth: identity is carried in the signed state token.
router.get(
  '/:platform/callback',
  asyncHandler(async (req, res) => {
    const { platform } = req.params;
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return res.redirect(`/?oauth=error&message=${encodeURIComponent(errorDescription || error)}`);
    }
    if (!code || !state) throw new HttpError(400, 'Missing code or state');

    let claims;
    try {
      claims = verifyState(String(state));
    } catch {
      throw new HttpError(400, 'Invalid or expired OAuth state');
    }
    if (claims.platform !== platform) throw new HttpError(400, 'State/platform mismatch');

    const adapter = getAdapter(platform);
    let credentials;
    try {
      credentials = await adapter.exchangeCode(String(code), {
        verifier: claims.v,
      });
    } catch (e) {
      return res.redirect(`/?oauth=error&message=${encodeURIComponent(e.message)}`);
    }

    accountRepo.upsertOAuth({
      userId: claims.uid,
      platform,
      username: credentials.username || `${platform}-account`,
      credentialCipher: encryptJson(credentials),
    });

    res.redirect(`/?oauth=connected&platform=${platform}`);
  })
);

export default router;

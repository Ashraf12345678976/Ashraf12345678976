// ──────────────────────────────────────────────────────────────────────────
// Social publishing adapters.
//
// Each adapter exposes:
//   verifyCredentials({ username, password, ... }) -> { ok, message }
//   publish({ video, account, credentials })       -> { remoteId, remoteUrl }
//
// The implementations below are SAFE SIMULATIONS: they validate the shape of
// the credentials and deterministically produce a plausible post URL so the
// full workflow (verify → review → publish → analytics) runs end-to-end
// offline.
//
// ⚠️  PRODUCTION NOTE: real platforms (YouTube, TikTok, Instagram, X) use
// OAuth 2.0, not raw passwords. To go live, replace each adapter body with the
// platform's official SDK/OAuth flow. The username/password are accepted and
// encrypted at rest as the user requested, but OAuth tokens are the correct
// production credential and can be stored through the very same encrypted
// channel (accountRepo + crypto.js).
// ──────────────────────────────────────────────────────────────────────────

import { sha256 } from '../../security/crypto.js';

function baseValidate(platform, credentials) {
  const { username, password } = credentials || {};
  if (!username || typeof username !== 'string' || username.length < 2) {
    return { ok: false, message: `Invalid ${platform} username.` };
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return { ok: false, message: `Invalid ${platform} password/token.` };
  }
  return { ok: true, message: `${platform} credentials accepted.` };
}

function makeAdapter(platform, urlFor) {
  return {
    platform,
    async verifyCredentials(credentials) {
      // Simulate a network handshake with the provider's auth endpoint.
      await new Promise((r) => setTimeout(r, 120));
      return baseValidate(platform, credentials);
    },
    async publish({ video, account }) {
      await new Promise((r) => setTimeout(r, 200));
      // Deterministic but unique-looking remote id.
      const remoteId = sha256(`${platform}:${account.username}:${video.id}:${Date.now()}`)
        .slice(0, 16);
      return {
        remoteId,
        remoteUrl: urlFor(account.username, remoteId),
      };
    },
  };
}

const adapters = new Map([
  ['youtube', makeAdapter('youtube', (u, id) => `https://youtube.com/watch?v=${id}`)],
  ['tiktok', makeAdapter('tiktok', (u, id) => `https://tiktok.com/@${u}/video/${id}`)],
  ['instagram', makeAdapter('instagram', (u, id) => `https://instagram.com/reel/${id}`)],
  ['x', makeAdapter('x', (u, id) => `https://x.com/${u}/status/${id}`)],
]);

export const SUPPORTED_PLATFORMS = [...adapters.keys()];

export function getAdapter(platform) {
  const adapter = adapters.get(platform);
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter;
}

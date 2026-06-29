import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

// Signed OAuth state + PKCE.
//
// The `state` parameter is a short-lived JWT binding the flow to a specific
// user, platform and PKCE verifier. Because it is signed with JWT_SECRET, the
// callback can trust it without server-side session storage (CSRF-safe).

/** Generate an RFC 7636 PKCE verifier/challenge pair (S256). */
export function createPkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

export function signState({ userId, platform, verifier }) {
  return jwt.sign({ uid: userId, platform, v: verifier }, config.jwt.secret, {
    expiresIn: '10m',
    issuer: 'ai-video-publisher:oauth',
  });
}

export function verifyState(token) {
  return jwt.verify(token, config.jwt.secret, {
    issuer: 'ai-video-publisher:oauth',
  });
}

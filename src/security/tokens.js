import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { sha256, randomToken } from './crypto.js';

/** Short-lived signed access token carrying the user identity. */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessTtl, issuer: 'ai-video-publisher' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, { issuer: 'ai-video-publisher' });
}

/**
 * Opaque refresh token. The raw value goes to the client (httpOnly cookie);
 * only its SHA-256 hash is persisted so a DB leak cannot mint sessions.
 */
export function createRefreshToken() {
  const raw = randomToken(48);
  return { raw, hash: sha256(raw) };
}

export function hashRefreshToken(raw) {
  return sha256(raw);
}

import { sha256 } from '../../security/crypto.js';

// Offline simulation used when a platform's OAuth app is not configured, or
// when an account was connected with the password/token path. Lets the whole
// workflow run end-to-end without live API credentials.

export function simulateVerify(platform, credentials) {
  const { username, password } = credentials || {};
  if (!username || typeof username !== 'string' || username.length < 2) {
    return { ok: false, message: `Invalid ${platform} username.` };
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return { ok: false, message: `Invalid ${platform} password/token.` };
  }
  return { ok: true, message: `${platform} credentials accepted (simulated).` };
}

export async function simulatePublish(platform, { video, account }, urlFor) {
  await new Promise((r) => setTimeout(r, 150));
  const remoteId = sha256(
    `${platform}:${account.username}:${video.id}:${Date.now()}`
  ).slice(0, 16);
  return { remoteId, remoteUrl: urlFor(account.username, remoteId), simulated: true };
}

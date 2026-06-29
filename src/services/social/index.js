import { youtube } from './youtube.js';
import { x } from './x.js';
import { tiktok } from './tiktok.js';
import { instagram } from './instagram.js';

const adapters = new Map([
  [youtube.platform, youtube],
  [x.platform, x],
  [tiktok.platform, tiktok],
  [instagram.platform, instagram],
]);

export const SUPPORTED_PLATFORMS = [...adapters.keys()];

export function getAdapter(platform) {
  const adapter = adapters.get(platform);
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter;
}

/** Platforms that have their OAuth app configured (for the UI). */
export function oauthStatus() {
  return SUPPORTED_PLATFORMS.map((p) => ({
    platform: p,
    oauthConfigured: getAdapter(p).isConfigured(),
  }));
}

/**
 * Returns true if the stored credentials are OAuth tokens that are expired (or
 * about to expire within 60s) and therefore need refreshing.
 */
export function needsRefresh(credentials) {
  return (
    credentials?.type === 'oauth' &&
    credentials.refreshToken !== undefined &&
    typeof credentials.expiresAt === 'number' &&
    credentials.expiresAt - Date.now() < 60_000
  );
}

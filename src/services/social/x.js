import fs from 'node:fs/promises';
import config from '../../config/index.js';
import { request, getJson, ApiError } from '../http.js';
import { simulateVerify, simulatePublish } from './simulate.js';

// ──────────────────────────────────────────────────────────────────────────
// X (Twitter) adapter — OAuth 2.0 (PKCE) + chunked media upload + post.
// Docs: https://developer.x.com/en/docs/authentication/oauth-2-0
//       https://developer.x.com/en/docs/x-api/media/upload-media/introduction
//
// Env: X_CLIENT_ID, X_CLIENT_SECRET
// ──────────────────────────────────────────────────────────────────────────

const SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'].join(' ');
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const MEDIA_URL = 'https://api.twitter.com/2/media/upload';

function basicAuth() {
  const raw = `${config.oauth.x.clientId}:${config.oauth.x.clientSecret}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

export const x = {
  platform: 'x',

  isConfigured() {
    return Boolean(config.oauth.x.clientId && config.oauth.x.clientSecret);
  },

  redirectUri() {
    return `${config.oauth.redirectBase}/api/oauth/x/callback`;
  },

  getAuthUrl(state, pkce) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.oauth.x.clientId,
      redirect_uri: this.redirectUri(),
      scope: SCOPES,
      state,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  },

  async exchangeCode(code, pkce) {
    const token = await request(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri(),
        code_verifier: pkce.verifier,
        client_id: config.oauth.x.clientId,
      }).toString(),
    });
    const profile = await this.fetchUser(token.access_token);
    return {
      type: 'oauth',
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in || 7200) * 1000,
      username: profile.username,
      accountId: profile.id,
    };
  },

  async refreshTokens(credentials) {
    const token = await request(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
        client_id: config.oauth.x.clientId,
      }).toString(),
    });
    return {
      ...credentials,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || credentials.refreshToken,
      expiresAt: Date.now() + (token.expires_in || 7200) * 1000,
    };
  },

  async fetchUser(accessToken) {
    const data = await getJson('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { id: data.data?.id, username: data.data?.username || data.data?.name };
  },

  async verifyCredentials(credentials) {
    if (credentials?.type === 'oauth' && this.isConfigured()) {
      try {
        await this.fetchUser(credentials.accessToken);
        return { ok: true, message: 'X account verified.' };
      } catch (e) {
        return { ok: false, message: `X verification failed: ${e.message}` };
      }
    }
    return simulateVerify('x', credentials);
  },

  async publish({ video, account, credentials, assetPath }) {
    if (credentials?.type !== 'oauth' || !this.isConfigured()) {
      return simulatePublish('x', { video, account }, (u, id) =>
        `https://x.com/${u}/status/${id}`
      );
    }
    const bearer = `Bearer ${credentials.accessToken}`;
    const bytes = await fs.readFile(assetPath);

    // INIT
    const init = await request(
      `${MEDIA_URL}?command=INIT&total_bytes=${bytes.length}&media_type=video%2Fmp4&media_category=tweet_video`,
      { method: 'POST', headers: { Authorization: bearer } }
    );
    const mediaId = init.data?.id || init.media_id_string;
    if (!mediaId) throw new ApiError('X media INIT returned no media id');

    // APPEND in 4MB chunks.
    const CHUNK = 4 * 1024 * 1024;
    let segment = 0;
    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
      const slice = bytes.subarray(offset, offset + CHUNK);
      const form = new FormData();
      form.append('command', 'APPEND');
      form.append('media_id', String(mediaId));
      form.append('segment_index', String(segment));
      form.append('media', new Blob([slice]));
      await request(MEDIA_URL, {
        method: 'POST',
        headers: { Authorization: bearer },
        body: form,
      });
      segment += 1;
    }

    // FINALIZE
    let final = await request(`${MEDIA_URL}?command=FINALIZE&media_id=${mediaId}`, {
      method: 'POST',
      headers: { Authorization: bearer },
    });

    // STATUS poll while transcoding.
    let info = final.data?.processing_info || final.processing_info;
    const deadline = Date.now() + 5 * 60_000;
    while (info && info.state && info.state !== 'succeeded') {
      if (info.state === 'failed') throw new ApiError('X media processing failed');
      if (Date.now() > deadline) throw new ApiError('X media processing timed out');
      await new Promise((r) => setTimeout(r, (info.check_after_secs || 3) * 1000));
      final = await getJson(`${MEDIA_URL}?command=STATUS&media_id=${mediaId}`, {
        headers: { Authorization: bearer },
      });
      info = final.data?.processing_info || final.processing_info;
    }

    // Create the post.
    const tweet = await request('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { Authorization: bearer, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: video.title,
        media: { media_ids: [String(mediaId)] },
      }),
    });
    const id = tweet.data?.id;
    return {
      remoteId: id,
      remoteUrl: `https://x.com/${account.username}/status/${id}`,
    };
  },
};

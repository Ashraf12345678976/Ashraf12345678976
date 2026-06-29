import fs from 'node:fs/promises';
import config from '../../config/index.js';
import { request, postForm, getJson, postJson, ApiError } from '../http.js';
import { simulateVerify, simulatePublish } from './simulate.js';

// ──────────────────────────────────────────────────────────────────────────
// TikTok adapter — Login Kit (OAuth) + Content Posting API (Direct Post).
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
//
// Env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
// Note: unaudited apps must use privacy_level SELF_ONLY.
// ──────────────────────────────────────────────────────────────────────────

const SCOPES = 'user.info.basic,video.publish';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

export const tiktok = {
  platform: 'tiktok',

  isConfigured() {
    return Boolean(config.oauth.tiktok.clientKey && config.oauth.tiktok.clientSecret);
  },

  redirectUri() {
    return `${config.oauth.redirectBase}/api/oauth/tiktok/callback`;
  },

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_key: config.oauth.tiktok.clientKey,
      scope: SCOPES,
      response_type: 'code',
      redirect_uri: this.redirectUri(),
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  },

  async exchangeCode(code) {
    const token = await postForm(TOKEN_URL, {
      client_key: config.oauth.tiktok.clientKey,
      client_secret: config.oauth.tiktok.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri(),
    });
    const profile = await this.fetchUser(token.access_token).catch(() => ({}));
    return {
      type: 'oauth',
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in || 86400) * 1000,
      username: profile.username || token.open_id || 'tiktok-user',
      accountId: token.open_id,
    };
  },

  async refreshTokens(credentials) {
    const token = await postForm(TOKEN_URL, {
      client_key: config.oauth.tiktok.clientKey,
      client_secret: config.oauth.tiktok.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken,
    });
    return {
      ...credentials,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || credentials.refreshToken,
      expiresAt: Date.now() + (token.expires_in || 86400) * 1000,
    };
  },

  async fetchUser(accessToken) {
    const data = await getJson(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return { username: data.data?.user?.display_name, id: data.data?.user?.open_id };
  },

  async verifyCredentials(credentials) {
    if (credentials?.type === 'oauth' && this.isConfigured()) {
      try {
        await this.fetchUser(credentials.accessToken);
        return { ok: true, message: 'TikTok account verified.' };
      } catch (e) {
        return { ok: false, message: `TikTok verification failed: ${e.message}` };
      }
    }
    return simulateVerify('tiktok', credentials);
  },

  async publish({ video, account, credentials, assetPath }) {
    if (credentials?.type !== 'oauth' || !this.isConfigured()) {
      return simulatePublish('tiktok', { video, account }, (u, id) =>
        `https://tiktok.com/@${u}/video/${id}`
      );
    }
    const bearer = `Bearer ${credentials.accessToken}`;
    const bytes = await fs.readFile(assetPath);

    // Step 1: initialise a direct-post upload.
    const init = await postJson(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        post_info: {
          title: video.title,
          privacy_level: 'SELF_ONLY',
          disable_comment: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: bytes.length,
          chunk_size: bytes.length,
          total_chunk_count: 1,
        },
      },
      { headers: { Authorization: bearer } }
    );
    const publishId = init.data?.publish_id;
    const uploadUrl = init.data?.upload_url;
    if (!uploadUrl || !publishId) {
      throw new ApiError(`TikTok init failed: ${JSON.stringify(init.error || init)}`);
    }

    // Step 2: upload the file bytes.
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}`,
        'Content-Length': String(bytes.length),
      },
      body: bytes,
    });
    if (!putRes.ok) {
      throw new ApiError(`TikTok upload failed (${putRes.status}): ${await putRes.text()}`);
    }

    // Step 3: poll publish status.
    const deadline = Date.now() + 5 * 60_000;
    let postId;
    for (;;) {
      if (Date.now() > deadline) throw new ApiError('TikTok publish timed out');
      await new Promise((r) => setTimeout(r, 4000));
      const status = await postJson(
        'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
        { publish_id: publishId },
        { headers: { Authorization: bearer } }
      );
      const st = status.data?.status;
      if (st === 'PUBLISH_COMPLETE') {
        postId = status.data?.publicaly_available_post_id?.[0];
        break;
      }
      if (st === 'FAILED') {
        throw new ApiError(`TikTok publish failed: ${status.data?.fail_reason || 'unknown'}`);
      }
    }

    return {
      remoteId: postId || publishId,
      remoteUrl: postId
        ? `https://www.tiktok.com/@${account.username}/video/${postId}`
        : `https://www.tiktok.com/@${account.username}`,
    };
  },
};

import fs from 'node:fs/promises';
import config from '../../config/index.js';
import { postForm, getJson, ApiError } from '../http.js';
import { simulateVerify, simulatePublish } from './simulate.js';

// ──────────────────────────────────────────────────────────────────────────
// YouTube adapter — Google OAuth 2.0 + YouTube Data API v3 (resumable upload).
// Docs: https://developers.google.com/youtube/v3/guides/uploading_a_video
//
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// Scopes: youtube.upload (publish) + youtube.readonly (channel name)
// ──────────────────────────────────────────────────────────────────────────

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

export const youtube = {
  platform: 'youtube',

  isConfigured() {
    return Boolean(config.oauth.google.clientId && config.oauth.google.clientSecret);
  },

  redirectUri() {
    return `${config.oauth.redirectBase}/api/oauth/youtube/callback`;
  },

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: config.oauth.google.clientId,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode(code) {
    const token = await postForm('https://oauth2.googleapis.com/token', {
      code,
      client_id: config.oauth.google.clientId,
      client_secret: config.oauth.google.clientSecret,
      redirect_uri: this.redirectUri(),
      grant_type: 'authorization_code',
    });
    const profile = await this.fetchChannel(token.access_token);
    return {
      type: 'oauth',
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in || 3600) * 1000,
      username: profile.username,
      accountId: profile.id,
    };
  },

  async refreshTokens(credentials) {
    if (!credentials.refreshToken) throw new ApiError('No refresh token for YouTube');
    const token = await postForm('https://oauth2.googleapis.com/token', {
      refresh_token: credentials.refreshToken,
      client_id: config.oauth.google.clientId,
      client_secret: config.oauth.google.clientSecret,
      grant_type: 'refresh_token',
    });
    return {
      ...credentials,
      accessToken: token.access_token,
      expiresAt: Date.now() + (token.expires_in || 3600) * 1000,
    };
  },

  async fetchChannel(accessToken) {
    const data = await getJson(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const ch = data.items?.[0];
    return { id: ch?.id || 'me', username: ch?.snippet?.title || 'My Channel' };
  },

  async verifyCredentials(credentials) {
    if (credentials?.type === 'oauth' && this.isConfigured()) {
      try {
        await this.fetchChannel(credentials.accessToken);
        return { ok: true, message: 'YouTube channel verified.' };
      } catch (e) {
        return { ok: false, message: `YouTube verification failed: ${e.message}` };
      }
    }
    return simulateVerify('youtube', credentials);
  },

  async publish({ video, account, credentials, assetPath }) {
    if (credentials?.type !== 'oauth' || !this.isConfigured()) {
      return simulatePublish('youtube', { video, account }, (u, id) =>
        `https://youtube.com/watch?v=${id}`
      );
    }

    const metadata = {
      snippet: { title: video.title, description: video.prompt || video.title },
      status: { privacyStatus: 'private', selfDeclaredMadeForKids: false },
    };

    // Step 1: start a resumable session.
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/*',
        },
        body: JSON.stringify(metadata),
      }
    );
    if (!initRes.ok) {
      throw new ApiError(`YouTube upload init failed (${initRes.status}): ${await initRes.text()}`);
    }
    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) throw new ApiError('YouTube did not return an upload URL');

    // Step 2: upload the bytes.
    const bytes = await fs.readFile(assetPath);
    const upRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/*', 'Content-Length': String(bytes.length) },
      body: bytes,
    });
    if (!upRes.ok) {
      throw new ApiError(`YouTube upload failed (${upRes.status}): ${await upRes.text()}`);
    }
    const result = await upRes.json();
    return {
      remoteId: result.id,
      remoteUrl: `https://youtube.com/watch?v=${result.id}`,
    };
  },
};

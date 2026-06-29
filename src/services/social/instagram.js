import config from '../../config/index.js';
import { getJson, postForm, ApiError } from '../http.js';
import { simulateVerify, simulatePublish } from './simulate.js';

// ──────────────────────────────────────────────────────────────────────────
// Instagram adapter — Facebook Login + Instagram Graph API (Reels publishing).
// Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
//
// Requires an Instagram *Business/Creator* account linked to a Facebook Page.
// Env: FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, FACEBOOK_GRAPH_VERSION
//
// IMPORTANT: Instagram fetches the video from a PUBLIC URL — the publish flow
// passes a signed, publicly reachable media URL (see routes/publish.js).
// ──────────────────────────────────────────────────────────────────────────

const SCOPES =
  'instagram_basic,instagram_content_publish,pages_show_list,business_management';

function graph(path) {
  return `https://graph.facebook.com/${config.oauth.facebook.graphVersion}${path}`;
}

export const instagram = {
  platform: 'instagram',

  isConfigured() {
    return Boolean(config.oauth.facebook.clientId && config.oauth.facebook.clientSecret);
  },

  redirectUri() {
    return `${config.oauth.redirectBase}/api/oauth/instagram/callback`;
  },

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: config.oauth.facebook.clientId,
      redirect_uri: this.redirectUri(),
      scope: SCOPES,
      response_type: 'code',
      state,
    });
    return `https://www.facebook.com/${config.oauth.facebook.graphVersion}/dialog/oauth?${params}`;
  },

  async exchangeCode(code) {
    const token = await getJson(
      graph('/oauth/access_token') +
        '?' +
        new URLSearchParams({
          client_id: config.oauth.facebook.clientId,
          client_secret: config.oauth.facebook.clientSecret,
          redirect_uri: this.redirectUri(),
          code,
        })
    );
    // Exchange for a long-lived token (~60 days).
    const long = await this.exchangeLongLived(token.access_token);
    const ig = await this.resolveIgAccount(long.access_token);
    return {
      type: 'oauth',
      accessToken: long.access_token,
      refreshToken: null, // FB uses long-lived token exchange, not refresh tokens
      expiresAt: Date.now() + (long.expires_in || 5_184_000) * 1000,
      username: ig.username,
      accountId: ig.igUserId,
    };
  },

  async exchangeLongLived(shortToken) {
    return getJson(
      graph('/oauth/access_token') +
        '?' +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: config.oauth.facebook.clientId,
          client_secret: config.oauth.facebook.clientSecret,
          fb_exchange_token: shortToken,
        })
    );
  },

  async refreshTokens(credentials) {
    const long = await this.exchangeLongLived(credentials.accessToken);
    return {
      ...credentials,
      accessToken: long.access_token,
      expiresAt: Date.now() + (long.expires_in || 5_184_000) * 1000,
    };
  },

  /** Find the IG Business account id linked to one of the user's Pages. */
  async resolveIgAccount(accessToken) {
    const pages = await getJson(
      graph('/me/accounts') + '?' + new URLSearchParams({ access_token: accessToken })
    );
    for (const page of pages.data || []) {
      const detail = await getJson(
        graph(`/${page.id}`) +
          '?' +
          new URLSearchParams({
            fields: 'instagram_business_account{username}',
            access_token: accessToken,
          })
      );
      const iga = detail.instagram_business_account;
      if (iga?.id) return { igUserId: iga.id, username: iga.username || page.name };
    }
    throw new ApiError('No Instagram Business account linked to your Facebook Pages');
  },

  async verifyCredentials(credentials) {
    if (credentials?.type === 'oauth' && this.isConfigured()) {
      try {
        await getJson(
          graph(`/${credentials.accountId}`) +
            '?' +
            new URLSearchParams({ fields: 'username', access_token: credentials.accessToken })
        );
        return { ok: true, message: 'Instagram account verified.' };
      } catch (e) {
        return { ok: false, message: `Instagram verification failed: ${e.message}` };
      }
    }
    return simulateVerify('instagram', credentials);
  },

  async publish({ video, account, credentials, publicAssetUrl }) {
    if (credentials?.type !== 'oauth' || !this.isConfigured()) {
      return simulatePublish('instagram', { video, account }, (u, id) =>
        `https://instagram.com/reel/${id}`
      );
    }
    if (!publicAssetUrl) {
      throw new ApiError('Instagram requires a publicly reachable video URL');
    }
    const igUserId = credentials.accountId;
    const accessToken = credentials.accessToken;

    // Step 1: create a media container for the Reel.
    const container = await postForm(graph(`/${igUserId}/media`), {
      media_type: 'REELS',
      video_url: publicAssetUrl,
      caption: video.title,
      access_token: accessToken,
    });
    const creationId = container.id;
    if (!creationId) throw new ApiError('Instagram media container creation failed');

    // Step 2: wait for the container to finish processing.
    const deadline = Date.now() + 5 * 60_000;
    for (;;) {
      if (Date.now() > deadline) throw new ApiError('Instagram processing timed out');
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getJson(
        graph(`/${creationId}`) +
          '?' +
          new URLSearchParams({ fields: 'status_code', access_token: accessToken })
      );
      if (status.status_code === 'FINISHED') break;
      if (status.status_code === 'ERROR') throw new ApiError('Instagram processing error');
    }

    // Step 3: publish the container.
    const published = await postForm(graph(`/${igUserId}/media_publish`), {
      creation_id: creationId,
      access_token: accessToken,
    });
    const mediaId = published.id;

    let permalink = `https://instagram.com/reel/${mediaId}`;
    try {
      const info = await getJson(
        graph(`/${mediaId}`) +
          '?' +
          new URLSearchParams({ fields: 'permalink', access_token: accessToken })
      );
      if (info.permalink) permalink = info.permalink;
    } catch {
      /* permalink is best-effort */
    }

    return { remoteId: mediaId, remoteUrl: permalink };
  },
};

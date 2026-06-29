import config from '../../config/index.js';
import { postJson, getJson, ApiError } from '../http.js';
import { downloadToFile, writePosterSvg } from './shared.js';

// ──────────────────────────────────────────────────────────────────────────
// Replicate text-to-video provider.
//
// Replicate hosts many open text-to-video models behind one REST API.
// Docs: https://replicate.com/docs/reference/http#predictions.create
//
// Env:
//   REPLICATE_API_TOKEN   (required to activate)
//   REPLICATE_VIDEO_MODEL  e.g. "minimax/video-01", "tencent/hunyuan-video"
// ──────────────────────────────────────────────────────────────────────────

const BASE = 'https://api.replicate.com/v1';

function authHeaders() {
  return { Authorization: `Bearer ${config.ai.replicate.token}` };
}

/** Extract the first video URL from a Replicate prediction output. */
function pickVideoUrl(output) {
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    const found = output.find((o) => typeof o === 'string');
    return found || null;
  }
  if (typeof output === 'object') {
    // Some models return { video: "https://..." }.
    return output.video || output.url || null;
  }
  return null;
}

export const replicateProvider = {
  id: 'replicate',

  isConfigured() {
    return Boolean(config.ai.replicate.token);
  },

  async generate({ videoId, title, prompt }) {
    if (!this.isConfigured()) {
      throw new ApiError('REPLICATE_API_TOKEN is not set');
    }
    const model = config.ai.replicate.model;

    // Create the prediction.
    let prediction = await postJson(
      `${BASE}/models/${model}/predictions`,
      { input: { prompt } },
      { headers: authHeaders(), timeoutMs: 60_000 }
    );

    // Poll until it finishes (text-to-video can take minutes).
    const deadline = Date.now() + 15 * 60_000;
    while (
      prediction.status &&
      !['succeeded', 'failed', 'canceled'].includes(prediction.status)
    ) {
      if (Date.now() > deadline) throw new ApiError('Replicate generation timed out');
      await new Promise((r) => setTimeout(r, 4000));
      prediction = await getJson(prediction.urls.get, { headers: authHeaders() });
    }

    if (prediction.status !== 'succeeded') {
      throw new ApiError(
        `Replicate generation ${prediction.status}: ${prediction.error || 'unknown error'}`
      );
    }

    const videoUrl = pickVideoUrl(prediction.output);
    if (!videoUrl) throw new ApiError('Replicate returned no video URL');

    const assetPath = await downloadToFile(videoUrl, videoId, 'video.mp4');
    const thumbPath = writePosterSvg(videoId, title);

    return {
      script: prompt,
      durationSec: Number(prediction.metrics?.predict_time) || null,
      scenes: [],
      assetPath,
      thumbPath,
      mime: 'video/mp4',
      remoteSource: videoUrl,
    };
  },
};

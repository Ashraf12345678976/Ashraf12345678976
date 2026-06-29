import config from '../../config/index.js';
import { request, getJson, ApiError } from '../http.js';
import { downloadToFile, writePosterSvg } from './shared.js';

// ──────────────────────────────────────────────────────────────────────────
// Runway (Gen-3) text-to-video provider.
// Docs: https://docs.dev.runwayml.com/  (developer platform)
//
// Env:
//   RUNWAY_API_KEY   (required to activate)
//   RUNWAY_MODEL     default "gen3a_turbo"
//
// Note: Runway's API is image/video centric; this calls the text→video task
// endpoint and polls the task until it produces an output URL.
// ──────────────────────────────────────────────────────────────────────────

const BASE = 'https://api.dev.runwayml.com/v1';
const API_VERSION = '2024-11-06';

function headers() {
  return {
    Authorization: `Bearer ${config.ai.runway.apiKey}`,
    'X-Runway-Version': API_VERSION,
  };
}

export const runwayProvider = {
  id: 'runway',

  isConfigured() {
    return Boolean(config.ai.runway.apiKey);
  },

  async generate({ videoId, title, prompt }) {
    if (!this.isConfigured()) throw new ApiError('RUNWAY_API_KEY is not set');

    // Create a text-to-video task.
    const created = await request(`${BASE}/text_to_video`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ai.runway.model,
        promptText: prompt,
        duration: 5,
        ratio: '1280:768',
      }),
      timeoutMs: 60_000,
    });

    const taskId = created.id;
    if (!taskId) throw new ApiError('Runway did not return a task id');

    // Poll the task.
    const deadline = Date.now() + 15 * 60_000;
    let task = created;
    while (!['SUCCEEDED', 'FAILED'].includes(task.status)) {
      if (Date.now() > deadline) throw new ApiError('Runway generation timed out');
      await new Promise((r) => setTimeout(r, 5000));
      task = await getJson(`${BASE}/tasks/${taskId}`, { headers: headers() });
    }

    if (task.status !== 'SUCCEEDED') {
      throw new ApiError(`Runway task failed: ${task.failure || 'unknown error'}`);
    }

    const videoUrl = Array.isArray(task.output) ? task.output[0] : task.output;
    if (!videoUrl) throw new ApiError('Runway returned no output URL');

    const assetPath = await downloadToFile(videoUrl, videoId, 'video.mp4');
    const thumbPath = writePosterSvg(videoId, title);

    return {
      script: prompt,
      durationSec: 5,
      scenes: [],
      assetPath,
      thumbPath,
      mime: 'video/mp4',
      remoteSource: videoUrl,
    };
  },
};

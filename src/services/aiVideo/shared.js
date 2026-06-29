import fs from 'node:fs';
import path from 'node:path';
import config from '../../config/index.js';
import { ApiError } from '../http.js';

/** Ensure the per-video media directory exists and return it. */
export function mediaDir(videoId) {
  const dir = path.join(config.paths.media, String(videoId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Stream a remote URL to disk. Returns the relative path under data/media. */
export async function downloadToFile(url, videoId, filename) {
  mediaDir(videoId);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new ApiError(`Failed to download generated video (${res.status})`);
  }
  const rel = path.join(String(videoId), filename);
  const abs = path.join(config.paths.media, rel);
  const out = fs.createWriteStream(abs);
  await new Promise((resolve, reject) => {
    // Node 18+ web stream → node stream bridge.
    const reader = res.body.getReader();
    (async function pump() {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          out.write(Buffer.from(value));
        }
        out.end(resolve);
      } catch (e) {
        out.destroy();
        reject(e);
      }
    })();
  });
  return rel;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

/** Write a simple SVG poster (no ffmpeg available to extract a real frame). */
export function writePosterSvg(videoId, title) {
  const rel = path.join(String(videoId), 'thumb.svg');
  const abs = path.join(config.paths.media, rel);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1a0b2e"/><stop offset="1" stop-color="#6366f1"/>
  </linearGradient></defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="320" cy="180" r="54" fill="#ffffffcc"/>
  <polygon points="302,152 302,208 352,180" fill="#1a0b2e"/>
  <text x="24" y="332" font-family="Segoe UI, Arial, sans-serif" font-size="26"
    font-weight="700" fill="#fff">${escapeXml(
      title.length > 34 ? title.slice(0, 31) + '…' : title
    )}</text>
</svg>`;
  fs.writeFileSync(abs, svg, 'utf8');
  return rel;
}

import fs from 'node:fs';
import path from 'node:path';
import config from '../../config/index.js';

// ──────────────────────────────────────────────────────────────────────────
// StubVideoProvider
//
// A self-contained, deterministic "text-to-video" generator used for local
// development and demos. It turns a prompt into a multi-scene storyboard and
// renders a *real, watchable* animated SVG (plays in any browser) plus a
// thumbnail. No external API, no ffmpeg required.
//
// To use a real provider (Runway / Pika / Sora-style), implement the same
// interface — generate({ prompt, title }) -> { script, durationSec, scenes,
// assetPath, thumbPath } — and register it in ./index.js.
// ──────────────────────────────────────────────────────────────────────────

const PALETTES = [
  ['#0f172a', '#6366f1', '#22d3ee'],
  ['#1a0b2e', '#f72585', '#7209b7'],
  ['#052e16', '#16a34a', '#a3e635'],
  ['#431407', '#f97316', '#fde047'],
  ['#0c4a6e', '#0ea5e9', '#e0f2fe'],
];

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildScenes(prompt, title) {
  const sentences = prompt
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const beats = sentences.length ? sentences : [prompt];
  const seed = hashString(prompt + title);
  const palette = PALETTES[seed % PALETTES.length];

  const scenes = beats.slice(0, 6).map((text, i) => ({
    index: i,
    caption: text.length > 90 ? text.slice(0, 87) + '…' : text,
    durationSec: 3,
    bg: palette[0],
    accent: palette[1 + (i % 2)],
  }));

  return { scenes, palette };
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

/** Render the storyboard to an animated SVG string that auto-plays. */
function renderSvg(title, scenes, palette) {
  const W = 1280;
  const H = 720;
  const per = 3; // seconds per scene
  const total = scenes.length * per;

  const sceneGroups = scenes
    .map((sc, i) => {
      const begin = i * per;
      return `
    <g opacity="0">
      <animate attributeName="opacity" values="0;1;1;0"
        keyTimes="0;0.12;0.88;1" dur="${per}s" begin="${begin}s"
        repeatCount="indefinite" calcMode="spline"
        keySplines="0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1" />
      <rect width="${W}" height="${H}" fill="${sc.bg}" />
      <circle cx="${200 + i * 120}" cy="${260}" r="180" fill="${sc.accent}" opacity="0.25">
        <animate attributeName="r" values="160;200;160" dur="${per}s"
          begin="${begin}s" repeatCount="indefinite" />
      </circle>
      <rect x="90" y="${H - 220}" width="${W - 180}" height="6" fill="${sc.accent}" opacity="0.8"/>
      <text x="90" y="${H - 150}" font-family="Segoe UI, Arial, sans-serif"
        font-size="46" font-weight="700" fill="#ffffff">${escapeXml(
          'Scene ' + (i + 1)
        )}</text>
      <text x="90" y="${H - 90}" font-family="Segoe UI, Arial, sans-serif"
        font-size="34" fill="#e5e7eb">${escapeXml(sc.caption)}</text>
    </g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
     viewBox="0 0 ${W} ${H}" role="img">
  <rect width="${W}" height="${H}" fill="${palette[0]}" />
  ${sceneGroups}
  <g>
    <rect x="0" y="0" width="${W}" height="96" fill="#00000055" />
    <text x="48" y="62" font-family="Segoe UI, Arial, sans-serif"
      font-size="40" font-weight="800" fill="#ffffff">${escapeXml(title)}</text>
    <text x="${W - 48}" y="62" text-anchor="end"
      font-family="Segoe UI, Arial, sans-serif" font-size="26"
      fill="#cbd5e1">AI Generated · ${total}s</text>
  </g>
</svg>`;
}

function renderThumb(title, palette) {
  const W = 640;
  const H = 360;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette[0]}"/>
      <stop offset="1" stop-color="${palette[1]}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <circle cx="${W / 2}" cy="${H / 2}" r="54" fill="#ffffffcc"/>
  <polygon points="${W / 2 - 18},${H / 2 - 28} ${W / 2 - 18},${H / 2 + 28} ${W / 2 + 32},${H / 2}" fill="${palette[0]}"/>
  <text x="24" y="${H - 28}" font-family="Segoe UI, Arial, sans-serif"
    font-size="26" font-weight="700" fill="#ffffff">${escapeXml(
      title.length > 34 ? title.slice(0, 31) + '…' : title
    )}</text>
</svg>`;
}

export const stubProvider = {
  id: 'stub',

  async generate({ videoId, title, prompt }) {
    const { scenes, palette } = buildScenes(prompt, title);
    const durationSec = scenes.length * 3;

    const svg = renderSvg(title, scenes, palette);
    const thumb = renderThumb(title, palette);

    const dir = path.join(config.paths.media, String(videoId));
    fs.mkdirSync(dir, { recursive: true });

    const assetRel = path.join(String(videoId), 'video.svg');
    const thumbRel = path.join(String(videoId), 'thumb.svg');
    fs.writeFileSync(path.join(config.paths.media, assetRel), svg, 'utf8');
    fs.writeFileSync(path.join(config.paths.media, thumbRel), thumb, 'utf8');

    const script = scenes.map((s, i) => `Scene ${i + 1}: ${s.caption}`).join('\n');

    // Simulate provider latency without blocking the event loop hard.
    await new Promise((r) => setTimeout(r, 150));

    return {
      script,
      durationSec,
      scenes,
      assetPath: assetRel,
      thumbPath: thumbRel,
      mime: 'image/svg+xml',
    };
  },
};

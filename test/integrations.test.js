// Tests for the real-integration surface: provider registry/fallback, OAuth
// gating, and the signed public media route. Runs fully offline (no provider
// env configured), so it exercises the simulation/fallback paths.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avp-int-'));
process.env.DATA_DIR = tmp;
process.env.JWT_SECRET = 'test-secret-' + crypto.randomBytes(8).toString('hex');
process.env.CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

const { createApp } = await import('../src/app.js');
const { initDb, closeDb } = await import('../src/db/index.js');
const { listProviders, getProvider } = await import('../src/services/aiVideo/index.js');
const { oauthStatus, needsRefresh } = await import('../src/services/social/index.js');
const { signMediaToken } = await import('../src/security/tokens.js');

let server, base, token = '';

async function req(p, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + p, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, json, text };
}

before(async () => {
  initDb();
  const app = createApp();
  await new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
  const reg = await req('/api/auth/register', {
    method: 'POST', auth: false,
    body: { email: 'i@example.com', displayName: 'I', password: 'Sup3rSecret!' },
  });
  token = reg.json.accessToken;
});

after(async () => {
  await new Promise((r) => server.close(r));
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('provider registry lists real providers as unconfigured', () => {
  const ids = listProviders();
  const replicate = ids.find((p) => p.id === 'replicate');
  const runway = ids.find((p) => p.id === 'runway');
  assert.ok(replicate && runway);
  assert.equal(replicate.configured, false);
  assert.equal(runway.configured, false);
});

test('getProvider falls back to stub when chosen provider is unconfigured', () => {
  assert.equal(getProvider('replicate').id, 'stub');
  assert.equal(getProvider('runway').id, 'stub');
  assert.equal(getProvider('stub').id, 'stub');
});

test('all four social platforms report OAuth not configured', () => {
  const status = oauthStatus();
  assert.deepEqual(
    status.map((s) => s.platform).sort(),
    ['instagram', 'tiktok', 'x', 'youtube']
  );
  assert.ok(status.every((s) => s.oauthConfigured === false));
});

test('needsRefresh only triggers for expiring oauth tokens', () => {
  assert.equal(needsRefresh({ type: 'password' }), false);
  assert.equal(
    needsRefresh({ type: 'oauth', refreshToken: 'r', expiresAt: Date.now() + 600_000 }),
    false
  );
  assert.equal(
    needsRefresh({ type: 'oauth', refreshToken: 'r', expiresAt: Date.now() + 1000 }),
    true
  );
});

test('GET /api/oauth/status reflects configuration', async () => {
  const { status, json } = await req('/api/oauth/status');
  assert.equal(status, 200);
  assert.equal(json.platforms.length, 4);
});

test('OAuth start is gated (501) when the app is not configured', async () => {
  const { status } = await req('/api/oauth/youtube/start');
  assert.equal(status, 501);
});

test('signed public media route streams the generated asset', async () => {
  const gen = await req('/api/videos', {
    method: 'POST',
    body: { title: 'Media test', prompt: 'A short clip with bold colors and motion.' },
  });
  const videoId = gen.json.video.id;
  const mediaToken = signMediaToken(videoId);

  const res = await fetch(`${base}/public/media/${mediaToken}`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.ok(body.includes('<svg'));

  const bad = await fetch(`${base}/public/media/not-a-real-token`);
  assert.equal(bad.status, 403);
});

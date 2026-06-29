// End-to-end smoke test of the full workflow:
// register → connect+verify account → generate → approve → publish → view → analytics
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

// Configure an isolated, ephemeral environment BEFORE importing the app.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avp-test-'));
process.env.DATA_DIR = tmp;
process.env.JWT_SECRET = 'test-secret-' + crypto.randomBytes(8).toString('hex');
process.env.CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

const { createApp } = await import('../src/app.js');
const { initDb, closeDb } = await import('../src/db/index.js');

let server;
let base;
let cookie = '';
let token = '';

async function req(pathname, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(base + pathname, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

before(async () => {
  initDb();
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((r) => server.close(r));
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('health check', async () => {
  const { status, json } = await req('/api/health', { auth: false });
  assert.equal(status, 200);
  assert.equal(json.status, 'ok');
});

test('register issues a session', async () => {
  const { status, json } = await req('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: { email: 'op@example.com', displayName: 'Op', password: 'Sup3rSecret!' },
  });
  assert.equal(status, 201);
  assert.ok(json.accessToken);
  assert.equal(json.user.role, 'admin'); // first user
  token = json.accessToken;
});

test('weak password is rejected', async () => {
  const { status } = await req('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: { email: 'w@example.com', displayName: 'W', password: 'weak' },
  });
  assert.equal(status, 422);
});

test('protected route requires auth', async () => {
  const saved = token;
  token = '';
  const { status } = await req('/api/videos', { auth: false });
  assert.equal(status, 401);
  token = saved;
});

let accountId;
test('connect + auto-verify a social account', async () => {
  const { status, json } = await req('/api/accounts', {
    method: 'POST',
    body: { platform: 'youtube', username: 'mychannel', password: 'channel-token-123' },
  });
  assert.equal(status, 201);
  assert.equal(json.account.status, 'verified');
  assert.equal(json.verification.ok, true);
  accountId = json.account.id;
});

test('credentials are never returned in plaintext', async () => {
  const { json } = await req('/api/accounts');
  const serialized = JSON.stringify(json);
  assert.ok(!serialized.includes('channel-token-123'));
});

let videoId;
test('generate a video → ready_for_review with a watchable asset', async () => {
  const { status, json } = await req('/api/videos', {
    method: 'POST',
    body: { title: 'Launch teaser', prompt: 'An upbeat teaser. Bold colors. Exciting reveal.' },
  });
  assert.equal(status, 201);
  assert.equal(json.video.status, 'ready_for_review');
  assert.ok(json.video.assetUrl);
  videoId = json.video.id;
});

test('the generated asset streams (can be watched)', async () => {
  const res = await fetch(`${base}/api/videos/${videoId}/stream`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.ok(body.includes('<svg'));
});

test('publishing before approval is blocked (review gate)', async () => {
  const { status } = await req(`/api/videos/${videoId}/publish`, {
    method: 'POST',
    body: { accountIds: [accountId] },
  });
  assert.equal(status, 409);
});

test('approve then publish succeeds', async () => {
  const approve = await req(`/api/videos/${videoId}/approve`, { method: 'POST' });
  assert.equal(approve.status, 200);
  assert.equal(approve.json.video.status, 'approved');

  const pub = await req(`/api/videos/${videoId}/publish`, {
    method: 'POST',
    body: { accountIds: [accountId] },
  });
  assert.equal(pub.status, 200);
  assert.equal(pub.json.results[0].status, 'published');
  assert.ok(pub.json.results[0].remoteUrl);
});

test('record views and read analytics', async () => {
  const { json } = await req(`/api/videos/${videoId}`);
  const publicationId = json.publications[0].id;

  for (let i = 0; i < 3; i++) {
    const r = await req('/api/analytics/view', {
      method: 'POST',
      auth: false,
      body: { publicationId, watchSeconds: 10 },
    });
    assert.equal(r.status, 202);
  }

  const summary = await req('/api/analytics/summary');
  assert.equal(summary.status, 200);
  assert.equal(summary.json.totals.total_views, 3);
  assert.equal(summary.json.counts.published, 1);
  assert.ok(summary.json.byPlatform.find((p) => p.platform === 'youtube'));
});

// ── Tiny API client with automatic access-token refresh ──────────────────
const state = {
  accessToken: null,
  user: null,
  accounts: [],
  videos: [],
  selected: null,
  watched: new Set(), // video ids the operator has watched this session
};

async function api(path, { method = 'GET', body, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (res.status === 401 && retry && state.accessToken) {
    // Try a silent refresh once.
    const ok = await refresh();
    if (ok) return api(path, { method, body, retry: false });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.details
      ? `${data.error}: ${data.details.map((d) => d.message).join(', ')}`
      : data.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function refresh() {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    state.accessToken = data.accessToken;
    state.user = data.user;
    return true;
  } catch {
    return false;
  }
}

// ── DOM helpers ──────────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  kids.flat().forEach((k) =>
    node.append(k instanceof Node ? k : document.createTextNode(k))
  );
  return node;
};

let toastTimer;
function toast(msg, kind = 'good') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

// ── Auth UI ──────────────────────────────────────────────────────────────
function showAuth() {
  $('#auth-screen').classList.remove('hidden');
  $('#app').classList.add('hidden');
}
function showApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#user-name').textContent = state.user?.displayName || state.user?.email || '';
  loadAll();
}

$$('.tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    const isLogin = tab.dataset.tab === 'login';
    $('#login-form').classList.toggle('hidden', !isLogin);
    $('#register-form').classList.toggle('hidden', isLogin);
    $('#auth-error').textContent = '';
  })
);

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email: f.get('email'), password: f.get('password') },
      retry: false,
    });
    state.accessToken = data.accessToken;
    state.user = data.user;
    showApp();
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
});

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: {
        displayName: f.get('displayName'),
        email: f.get('email'),
        password: f.get('password'),
      },
      retry: false,
    });
    state.accessToken = data.accessToken;
    state.user = data.user;
    showApp();
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  state.accessToken = null;
  state.user = null;
  showAuth();
});

// ── View navigation ──────────────────────────────────────────────────────
$$('.nav-link').forEach((link) =>
  link.addEventListener('click', () => {
    $$('.nav-link').forEach((l) => l.classList.toggle('active', l === link));
    const view = link.dataset.view;
    $$('.view').forEach((v) =>
      v.classList.toggle('hidden', v.id !== `view-${view}`)
    );
    if (view === 'dashboard') loadAnalytics();
  })
);

// ── Data loading ─────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadAccounts(), loadVideos(), loadAnalytics()]);
}

async function loadAccounts() {
  const { accounts } = await api('/accounts');
  state.accounts = accounts;
  renderAccounts();
  loadOAuthStatus();
}

async function loadOAuthStatus() {
  const box = $('#oauth-buttons');
  if (!box) return;
  let platforms = [];
  try {
    ({ platforms } = await api('/oauth/status'));
  } catch {
    return;
  }
  const labels = { youtube: 'YouTube', x: 'X (Twitter)', tiktok: 'TikTok', instagram: 'Instagram' };
  box.innerHTML = '';
  for (const p of platforms) {
    const btn = el(
      'button',
      {
        className: `btn oauth-btn ${p.oauthConfigured ? 'ready' : ''}`,
        title: p.oauthConfigured
          ? `Connect ${labels[p.platform]} via OAuth`
          : `${labels[p.platform]} OAuth not configured on server`,
        onclick: () => startOAuth(p.platform),
      },
      el('span', { className: 'dot' }),
      `Connect ${labels[p.platform] || p.platform}`
    );
    if (!p.oauthConfigured) btn.disabled = true;
    box.append(btn);
  }
}

async function startOAuth(platform) {
  try {
    const { url } = await api(`/oauth/${platform}/start`);
    window.location.href = url; // hand off to the provider's consent screen
  } catch (err) {
    toast(err.message, 'bad');
  }
}

async function loadVideos() {
  const { videos } = await api('/videos');
  state.videos = videos;
  renderVideos();
}

async function loadAnalytics() {
  try {
    const data = await api('/analytics/summary');
    renderAnalytics(data);
  } catch {
    /* ignore on first load */
  }
}

// ── Accounts view ────────────────────────────────────────────────────────
$('#account-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const status = $('#account-status');
  status.textContent = 'Verifying…';
  try {
    const data = await api('/accounts', {
      method: 'POST',
      body: {
        platform: f.get('platform'),
        username: f.get('username'),
        password: f.get('password'),
      },
    });
    e.target.reset();
    status.textContent = '';
    toast(
      data.verification.ok
        ? `Connected & verified ${data.account.platform}`
        : `Added, but verification failed: ${data.verification.message}`,
      data.verification.ok ? 'good' : 'bad'
    );
    loadAccounts();
  } catch (err) {
    status.textContent = '';
    toast(err.message, 'bad');
  }
});

function renderAccounts() {
  const list = $('#account-list');
  list.innerHTML = '';
  if (!state.accounts.length) {
    list.append(el('p', { className: 'muted' }, 'No accounts connected yet.'));
  }
  for (const a of state.accounts) {
    const row = el(
      'div',
      { className: 'acct' },
      el(
        'div',
        { className: 'meta' },
        el('div', { className: 'plat' }, a.platform),
        el('div', { className: 'muted' }, `@${a.username}`)
      ),
      el('span', { className: `badge ${a.status}` }, a.status),
      el('button', {
        className: 'btn small',
        textContent: 'Re-verify',
        onclick: () => verifyAccount(a.id),
      }),
      el('button', {
        className: 'btn small danger',
        textContent: 'Remove',
        onclick: () => removeAccount(a.id),
      })
    );
    list.append(row);
  }
  renderPublishTargets();
}

async function verifyAccount(id) {
  try {
    const data = await api(`/accounts/${id}/verify`, { method: 'POST' });
    toast(data.verification.message, data.verification.ok ? 'good' : 'bad');
    loadAccounts();
  } catch (err) {
    toast(err.message, 'bad');
  }
}

async function removeAccount(id) {
  if (!confirm('Remove this account?')) return;
  try {
    await api(`/accounts/${id}`, { method: 'DELETE' });
    loadAccounts();
  } catch (err) {
    toast(err.message, 'bad');
  }
}

// ── Studio: generate ─────────────────────────────────────────────────────
$('#generate-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const btn = $('#generate-form button');
  const status = $('#generate-status');
  btn.disabled = true;
  status.textContent = 'Generating…';
  try {
    const { video } = await api('/videos', {
      method: 'POST',
      body: { title: f.get('title'), prompt: f.get('prompt') },
    });
    e.target.reset();
    status.textContent = '';
    toast('Video generated — ready for review');
    await loadVideos();
    selectVideo(video.id);
  } catch (err) {
    status.textContent = '';
    toast(err.message, 'bad');
  } finally {
    btn.disabled = false;
  }
});

function renderVideos() {
  const grid = $('#video-list');
  grid.innerHTML = '';
  if (!state.videos.length) {
    grid.append(el('p', { className: 'muted' }, 'No videos yet. Generate one above.'));
    return;
  }
  for (const v of state.videos) {
    const thumb = el('img', { className: 'thumb', alt: v.title });
    if (v.thumbUrl) {
      withAuthBlob(v.thumbUrl).then((obj) => {
        if (obj) thumb.src = obj;
      });
    }
    const card = el(
      'div',
      { className: 'vcard', onclick: () => selectVideo(v.id) },
      thumb,
      el(
        'div',
        { className: 'body' },
        el('div', { className: 'title' }, v.title),
        el('span', { className: `badge ${v.status}` }, v.status.replace(/_/g, ' '))
      )
    );
    grid.append(card);
  }
}

// Media endpoints require the bearer token; <img> can't send headers, so we
// fetch the protected asset as a blob and show it via an object URL.
const blobCache = new Map();
async function withAuthBlob(url) {
  if (blobCache.has(url)) return blobCache.get(url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${state.accessToken}` },
  });
  if (!res.ok) return '';
  const blob = await res.blob();
  const obj = URL.createObjectURL(blob);
  blobCache.set(url, obj);
  return obj;
}
async function selectVideo(id) {
  const { video, publications } = await api(`/videos/${id}`);
  state.selected = { video, publications };
  renderReview();
}

async function renderReview() {
  const area = $('#review-area');
  area.className = '';
  area.innerHTML = '';
  const { video, publications } = state.selected;

  area.append(el('h4', {}, video.title));
  area.append(
    el('span', { className: `badge ${video.status}` }, video.status.replace(/_/g, ' '))
  );

  // Player — real MP4 videos use <video>; generated SVG previews use <object>.
  const isMp4 = video.assetMime === 'video/mp4';
  const player = isMp4
    ? el('video', { className: 'player', controls: true })
    : el('object', { className: 'player', type: 'image/svg+xml' });
  area.append(player);
  if (video.assetUrl) {
    const obj = await withAuthBlob(video.assetUrl);
    if (isMp4) player.src = obj;
    else player.data = obj;
  }

  area.append(el('p', { className: 'muted' }, `Duration ~${video.durationSec || 0}s · ${video.provider}`));

  const watched = state.watched.has(video.id) || video.status !== 'ready_for_review';
  const note = el('p', { className: 'watched-note' });
  if (!watched) note.textContent = '⚠ Watch the video, then mark it approved to enable publishing.';
  area.append(note);

  const actions = el('div', { className: 'review-actions' });

  if (video.status === 'ready_for_review') {
    actions.append(
      el('button', {
        className: 'btn primary',
        textContent: '✓ Mark watched & approve',
        onclick: () => approveVideo(video.id),
      })
    );
  }

  if (video.status === 'approved' || video.status === 'published') {
    // Publish targets
    const verified = state.accounts.filter((a) => a.status === 'verified');
    const targets = el('div', { className: 'publish-targets' });
    if (!verified.length) {
      targets.append(el('p', { className: 'muted' }, 'No verified accounts. Add one in Accounts.'));
    }
    for (const a of verified) {
      targets.append(
        el(
          'label',
          {},
          el('input', { type: 'checkbox', value: String(a.id), className: 'pub-target' }),
          `${a.platform} · @${a.username}`
        )
      );
    }
    area.append(el('h4', {}, 'Publish to'));
    area.append(targets);
    actions.append(
      el('button', {
        className: 'btn primary',
        textContent: '🚀 Publish',
        disabled: verified.length === 0,
        onclick: () => publishVideo(video.id),
      })
    );
  }

  actions.append(
    el('button', {
      className: 'btn danger small',
      textContent: 'Delete',
      onclick: () => deleteVideo(video.id),
    })
  );
  area.append(actions);

  // Existing publications
  if (publications?.length) {
    const table = el('table', { className: 'table' });
    table.append(
      el('tr', {}, el('th', {}, 'Platform'), el('th', {}, 'Status'), el('th', {}, 'Link'))
    );
    for (const p of publications) {
      table.append(
        el(
          'tr',
          {},
          el('td', {}, p.platform),
          el('td', {}, el('span', { className: `badge ${p.status === 'published' ? 'published' : 'failed'}` }, p.status)),
          el(
            'td',
            {},
            p.remote_url
              ? el('a', { href: p.remote_url, target: '_blank', textContent: 'view', style: 'color:var(--primary-2)' })
              : p.error || '—'
          )
        )
      );
    }
    area.append(el('h4', {}, 'Publications'));
    area.append(table);
  }
}

async function approveVideo(id) {
  try {
    state.watched.add(id);
    await api(`/videos/${id}/approve`, { method: 'POST' });
    toast('Approved — ready to publish');
    await loadVideos();
    selectVideo(id);
  } catch (err) {
    toast(err.message, 'bad');
  }
}

async function publishVideo(id) {
  const accountIds = $$('.pub-target:checked').map((c) => Number(c.value));
  if (!accountIds.length) return toast('Select at least one account', 'bad');
  try {
    const data = await api(`/videos/${id}/publish`, {
      method: 'POST',
      body: { accountIds },
    });
    const ok = data.results.filter((r) => r.status === 'published').length;
    toast(`Published to ${ok}/${data.results.length} account(s)`, ok ? 'good' : 'bad');
    await loadVideos();
    await loadAnalytics();
    selectVideo(id);
  } catch (err) {
    toast(err.message, 'bad');
  }
}

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  try {
    await api(`/videos/${id}`, { method: 'DELETE' });
    state.selected = null;
    $('#review-area').className = 'review-empty';
    $('#review-area').textContent = 'No video selected.';
    await loadVideos();
    await loadAnalytics();
  } catch (err) {
    toast(err.message, 'bad');
  }
}

// ── Analytics view ───────────────────────────────────────────────────────
function renderAnalytics(data) {
  const { totals, byPlatform, topVideos, counts } = data;
  const cards = $('#stat-cards');
  cards.innerHTML = '';
  const stat = (num, lbl) =>
    el('div', { className: 'card' }, el('div', { className: 'num' }, String(num)), el('div', { className: 'lbl' }, lbl));
  cards.append(
    stat(totals.total_views, 'Total views'),
    stat(totals.unique_viewers, 'Unique viewers'),
    stat(Math.round(totals.total_watch_seconds / 60), 'Watch minutes'),
    stat(counts.videos, 'Videos'),
    stat(counts.published, 'Published'),
    stat(counts.accounts, 'Accounts')
  );

  const bars = $('#platform-bars');
  bars.innerHTML = '';
  const max = Math.max(1, ...byPlatform.map((p) => p.views));
  if (!byPlatform.length) bars.append(el('p', { className: 'muted' }, 'No views recorded yet.'));
  for (const p of byPlatform) {
    bars.append(
      el(
        'div',
        { className: 'bar-row' },
        el('span', { style: 'text-transform:capitalize' }, p.platform),
        el('div', { className: 'bar-track' }, el('div', { className: 'bar-fill', style: `width:${(p.views / max) * 100}%` })),
        el('span', { className: 'muted' }, String(p.views))
      )
    );
  }

  const table = $('#top-videos');
  table.innerHTML = '';
  table.append(el('tr', {}, el('th', {}, 'Video'), el('th', {}, 'Views'), el('th', {}, 'Unique')));
  if (!topVideos.length) {
    table.append(el('tr', {}, el('td', { colSpan: 3, className: 'muted' }, 'No data yet.')));
  }
  for (const v of topVideos) {
    table.append(
      el('tr', {}, el('td', {}, v.title), el('td', {}, String(v.views)), el('td', {}, String(v.unique_viewers)))
    );
  }
}

// ── OAuth callback feedback ──────────────────────────────────────────────
function handleOAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('oauth');
  if (!status) return;
  if (status === 'connected') {
    toast(`Connected ${params.get('platform') || 'account'} via OAuth`, 'good');
  } else if (status === 'error') {
    toast(`OAuth failed: ${params.get('message') || 'unknown error'}`, 'bad');
  }
  // Clean the query string so a refresh doesn't re-trigger the toast.
  window.history.replaceState({}, '', window.location.pathname);
}

// ── Boot ─────────────────────────────────────────────────────────────────
(async function boot() {
  const ok = await refresh();
  if (ok) {
    showApp();
    handleOAuthReturn();
  } else {
    showAuth();
  }
})();

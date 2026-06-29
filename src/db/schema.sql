-- ─────────────────────────────────────────────────────────────────────────
-- Schema for the AI Video Publisher.
-- All tables use WITHOUT ROWID-friendly integer PKs and explicit timestamps.
-- ─────────────────────────────────────────────────────────────────────────

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Application users (the operators of the system).
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Hashed refresh tokens for session rotation / revocation.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- Connected social media accounts. Credentials are stored encrypted
-- (AES-256-GCM) in credential_cipher — never in plaintext.
CREATE TABLE IF NOT EXISTS social_accounts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('youtube','tiktok','instagram','x')),
  username          TEXT NOT NULL,
  credential_cipher TEXT NOT NULL,            -- JSON {iv, tag, data} hex
  status            TEXT NOT NULL DEFAULT 'unverified'
                      CHECK (status IN ('unverified','verified','invalid')),
  last_verified_at  TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, platform, username)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON social_accounts(user_id);

-- Generated videos and their review/publish lifecycle.
CREATE TABLE IF NOT EXISTS videos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  prompt        TEXT NOT NULL,
  script        TEXT,
  provider      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','generating','ready_for_review',
                                    'approved','publishing','published','failed')),
  duration_sec  INTEGER,
  asset_path    TEXT,                          -- relative path under data/media
  thumb_path    TEXT,
  scene_json    TEXT,                          -- renderer scene description
  error         TEXT,
  approved_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- One row per (video, account) publish attempt.
CREATE TABLE IF NOT EXISTS publications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id     INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  account_id   INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','published','failed')),
  remote_id    TEXT,
  remote_url   TEXT,
  error        TEXT,
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pub_video ON publications(video_id);
CREATE INDEX IF NOT EXISTS idx_pub_user ON publications(user_id);

-- View events powering the analytics dashboard.
CREATE TABLE IF NOT EXISTS view_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  publication_id INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  video_id       INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,
  viewer_hash    TEXT,                          -- anonymised viewer fingerprint
  watch_seconds  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_views_pub ON view_events(publication_id);
CREATE INDEX IF NOT EXISTS idx_views_video ON view_events(video_id);

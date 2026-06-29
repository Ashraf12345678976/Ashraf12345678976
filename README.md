# 🎬 AI Video Publisher

Generate AI videos, **review them before they go live**, and securely
auto-publish them to social media — with a built-in analytics dashboard that
tracks how many people watched.

This is a complete, runnable full-stack application: a hardened Node.js/Express
API, a SQLite database, and a zero-build dashboard. It ships with **real
integrations** — Replicate/Runway text-to-video and full OAuth 2.0 + publishing
for YouTube, X, TikTok and Instagram — and **also works fully offline**: when a
provider's credentials aren't set, it transparently falls back to a built-in
renderer and simulated publishing so you can try the entire workflow without
any API keys.

---

## ✨ What it does

| Requirement | How it's implemented |
|---|---|
| **Generate AI videos** | Pluggable text-to-video provider. The built-in `stub` provider turns your prompt into a multi-scene storyboard and renders a real, watchable animated video — no ffmpeg or API key needed. |
| **Add social accounts (username + password/token)** | `POST /api/accounts` stores credentials **encrypted at rest** (AES-256-GCM). |
| **App verifies the account** | On add (and on demand) the matching platform adapter verifies the credentials and flips the account to `verified` / `invalid`. |
| **Auto-publish** | `POST /api/videos/:id/publish` fans the video out to one or more verified accounts and records the resulting post URLs. |
| **Database to store the video** | SQLite schema covering users, accounts, videos, publications and view events. Media assets live under `data/media/`. |
| **Watch before it's published** | Hard **review gate**: a video is `ready_for_review` after generation and *cannot* be published until it has been watched and `approved`. |
| **Dashboard of who watched** | Aggregated analytics: total views, unique viewers, watch-minutes, per-platform breakdown and top videos. |
| **Strong, secure auth** | bcrypt password hashing, short-lived JWT access tokens + rotating httpOnly refresh tokens, rate limiting, Helmet/CSP, Zod validation, parameterized SQL. |

---

## 🚀 Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#   then set strong secrets (commands are in the file):
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # CREDENTIAL_ENCRYPTION_KEY

# 3. Run
npm start
# open http://localhost:3000
```

> In development the app boots with safe placeholder secrets so you can try it
> immediately. In `NODE_ENV=production` it refuses to start unless real secrets
> are set.

The **first account you register becomes the admin.**

### Run the tests

```bash
npm test
```

The suite (`test/flow.test.js`) drives the entire workflow on an isolated,
throwaway database: register → connect & verify an account → generate →
attempt-publish-too-early (blocked) → approve → publish → record views → read
analytics.

---

## 🧭 Using the app

1. **Accounts** → add a social account (platform, username, password/token).
   It is encrypted and verified instantly.
2. **Studio** → enter a title + prompt and click **Generate**. The video
   appears as `ready for review`.
3. Select the video → **watch it in the player** → click
   **✓ Mark watched & approve**.
4. Pick one or more verified accounts → **🚀 Publish**.
5. **Dashboard** → see views roll in per platform and per video.

> Want to see analytics move without real traffic? Each published post exposes
> a public `POST /api/analytics/view` endpoint that simulates the view webhook
> a real platform would send.

---

## 🏗️ Architecture

```
src/
  config/         env + path configuration (fails closed in production)
  db/             SQLite connection + schema.sql (migrations on boot)
  security/       crypto (AES-256-GCM), password (bcrypt), tokens (JWT),
                  oauthState (PKCE + signed state)
  middleware/     auth, validation (Zod), rate limiting, error handling
  repositories/   data-access layer (parameterized queries only)
  services/
    http.js       shared fetch helper (timeouts, structured errors)
    aiVideo/      registry + stub renderer + replicate + runway providers
    social/       OAuth + publish adapters: youtube, x, tiktok, instagram
  routes/         auth, accounts, videos, publish, analytics, oauth, media
  app.js          express wiring + security headers
  server.js       entrypoint + graceful shutdown
public/           zero-build dashboard (HTML/CSS/vanilla JS)
test/             end-to-end workflow test
```

### Video lifecycle

```
draft → generating → ready_for_review → approved → publishing → published
                                   └─────────── (must be watched) ──┘
```

---

## 🔒 Security model

- **Passwords** hashed with bcrypt (cost 12). Login responses are uniform to
  avoid user enumeration.
- **Sessions**: short-lived JWT **access tokens** (15m) for API calls; opaque
  **refresh tokens** (7d) stored only as SHA-256 hashes, delivered as
  `httpOnly`, `SameSite=strict` cookies, and **rotated on every use** (reuse is
  revoked).
- **Social credentials** are encrypted at rest with **AES-256-GCM** using a
  32-byte master key; the ciphertext is authenticated (tamper-evident) and the
  plaintext is never returned by the API.
- **Transport / headers**: Helmet with a strict Content-Security-Policy,
  `trust proxy` aware.
- **Abuse protection**: tight rate limits on auth endpoints, generous global
  API limit.
- **Input** validated with Zod; **all SQL** is parameterized; media reads are
  guarded against path traversal.

### Two ways to connect a social account

1. **OAuth 2.0 (recommended, production-grade)** — click *Connect …* in the
   dashboard. The app runs the platform's real OAuth flow (PKCE for X), stores
   the resulting **access/refresh tokens encrypted**, refreshes them
   just-in-time before publishing, and uploads via the official APIs:

   | Platform | Auth | Publish API |
   |---|---|---|
   | YouTube | Google OAuth 2.0 | Data API v3 resumable upload |
   | X (Twitter) | OAuth 2.0 + PKCE | chunked media upload + `POST /2/tweets` |
   | TikTok | Login Kit | Content Posting API (`FILE_UPLOAD`) |
   | Instagram | Facebook Login | Graph API Reels (container → publish) |

   Configure each app's client id/secret in `.env` (see `.env.example`) and
   register the redirect URI `…/api/oauth/<platform>/callback`. Platforms
   without configured credentials are disabled in the UI.

2. **Username + password/token** — stored encrypted at rest exactly as
   requested. Used as-is for verification/publishing when a platform's OAuth app
   isn't configured (simulated end-to-end so the workflow still runs offline).

> Instagram fetches the video from a **public URL**, so the publish flow mints a
> short-lived signed link (`/public/media/:token`) that exposes only that one
> asset to the platform's fetcher.

### Real AI video generation

Set `AI_VIDEO_PROVIDER` to `replicate` or `runway` and provide the matching API
key. The provider calls the real API, polls until the render finishes,
downloads the resulting **MP4** into `data/media/<id>/`, and the dashboard plays
it back in a `<video>` element for review. Add your own provider by
implementing `generate({ videoId, title, prompt })` and calling
`registerProvider()` in `src/services/aiVideo/index.js`.

---

## 📚 API reference (summary)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account (first = admin) |
| POST | `/api/auth/login` | – | Sign in |
| POST | `/api/auth/refresh` | cookie | Rotate session |
| POST | `/api/auth/logout` | – | End session |
| GET | `/api/accounts` | ✓ | List connected accounts |
| POST | `/api/accounts` | ✓ | Connect + verify (password/token) |
| POST | `/api/accounts/:id/verify` | ✓ | Re-verify |
| DELETE | `/api/accounts/:id` | ✓ | Remove |
| GET | `/api/oauth/status` | ✓ | Which platforms have OAuth configured |
| GET | `/api/oauth/:platform/start` | ✓ | Begin OAuth connect |
| GET | `/api/oauth/:platform/callback` | – | OAuth redirect handler |
| GET | `/public/media/:token` | signed | Public asset fetch (for Instagram) |
| GET | `/api/videos` | ✓ | List videos |
| POST | `/api/videos` | ✓ | Generate a video |
| GET | `/api/videos/:id/stream` | ✓ | Watch the asset |
| POST | `/api/videos/:id/approve` | ✓ | Approve after watching |
| POST | `/api/videos/:id/publish` | ✓ | Publish to accounts |
| GET | `/api/analytics/summary` | ✓ | Dashboard metrics |
| POST | `/api/analytics/view` | – | Record a view event |

---

## 🧰 Tech

Node.js 20+, Express, better-sqlite3, bcryptjs, jsonwebtoken, Helmet,
express-rate-limit, Zod. No frontend build step.

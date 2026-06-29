import { Router } from 'express';
import { z } from 'zod';
import ms from './ms.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { userRepo, refreshRepo } from '../repositories/userRepo.js';
import { hashPassword, verifyPassword } from '../security/password.js';
import {
  signAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from '../security/tokens.js';
import config from '../config/index.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(254),
  displayName: z.string().min(1).max(80),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(200)
    .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p), {
      message: 'Password needs upper, lower and a number',
    }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE = 'rt';

function setRefreshCookie(res, raw) {
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: ms(config.jwt.refreshTtl),
  });
}

function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const { raw, hash } = createRefreshToken();
  const expiresAt = new Date(Date.now() + ms(config.jwt.refreshTtl)).toISOString();
  refreshRepo.store({ userId: user.id, tokenHash: hash, expiresAt });
  setRefreshCookie(res, raw);
  return accessToken;
}

function publicUser(u) {
  return { id: u.id, email: u.email, displayName: u.display_name, role: u.role };
}

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, displayName, password } = req.body;
    if (userRepo.findByEmail(email)) {
      throw new HttpError(409, 'An account with that email already exists');
    }
    const passwordHash = await hashPassword(password);
    // First-ever user becomes admin.
    const role = userRepo.count() === 0 ? 'admin' : 'user';
    const user = userRepo.create({ email, displayName, passwordHash, role });
    const accessToken = issueSession(res, user);
    res.status(201).json({ user: publicUser(user), accessToken });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = userRepo.findByEmail(email);
    const ok = user && (await verifyPassword(password, user.password_hash));
    if (!ok) {
      // Uniform error + timing — do not reveal which field was wrong.
      throw new HttpError(401, 'Invalid email or password');
    }
    const accessToken = issueSession(res, user);
    res.json({ user: publicUser(user), accessToken });
  })
);

// POST /api/auth/refresh  — rotate refresh token, mint new access token.
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw new HttpError(401, 'No refresh token');
    const hash = hashRefreshToken(raw);
    const record = refreshRepo.findValid(hash);
    if (!record) throw new HttpError(401, 'Invalid or expired refresh token');

    refreshRepo.revoke(hash); // one-time use (rotation)
    const user = userRepo.findById(record.user_id);
    if (!user) throw new HttpError(401, 'Invalid session');
    const accessToken = issueSession(res, user);
    res.json({ user: publicUser(user), accessToken });
  })
);

// POST /api/auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) refreshRepo.revoke(hashRefreshToken(raw));
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.json({ ok: true });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

export default router;

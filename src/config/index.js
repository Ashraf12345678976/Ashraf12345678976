import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, 'data');

function required(name, value) {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';

// In development we tolerate the placeholder secrets so the app boots out of
// the box; in production we hard-fail to avoid shipping insecure defaults.
function secret(name, value, placeholder) {
  if (isProd && (!value || value === placeholder)) {
    throw new Error(
      `Refusing to start in production with an unset/placeholder ${name}. ` +
        `Set a strong value in your environment.`
    );
  }
  return value || placeholder;
}

const config = {
  isProd,
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  root: ROOT,

  paths: {
    data: DATA_DIR,
    db: path.join(DATA_DIR, 'app.db'),
    media: path.join(DATA_DIR, 'media'),
    public: path.join(ROOT, 'public'),
  },

  jwt: {
    secret: secret('JWT_SECRET', process.env.JWT_SECRET, 'dev-only-insecure-jwt-secret'),
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  },

  // 32-byte key for AES-256-GCM. Placeholder is all-zero (dev only).
  credentialKeyHex: secret(
    'CREDENTIAL_ENCRYPTION_KEY',
    process.env.CREDENTIAL_ENCRYPTION_KEY,
    '0'.repeat(64)
  ),

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  ai: {
    provider: process.env.AI_VIDEO_PROVIDER || 'stub',
    apiKey: process.env.AI_VIDEO_API_KEY || null,
  },
};

export default config;

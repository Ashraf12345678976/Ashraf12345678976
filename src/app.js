import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import videoRoutes from './routes/videos.js';
import publishRoutes from './routes/publish.js';
import analyticsRoutes from './routes/analytics.js';
import oauthRoutes from './routes/oauth.js';
import mediaRoutes from './routes/media.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security headers. The dashboard is same-origin and uses no inline-eval,
  // but does use a small inline bootstrap, so we allow 'unsafe-inline' for
  // styles/scripts on the dashboard only. The API itself serves JSON.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          // Generated assets are loaded as same-origin blob URLs.
          objectSrc: ["'self'", 'blob:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    })
  );

  app.use(
    cors({
      origin: config.cors.origin === '*' ? true : config.cors.origin.split(','),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', time: new Date().toISOString() })
  );

  // Public, token-authorised media (mounted before the API rate limiter so
  // external fetchers like Instagram aren't throttled with API clients).
  app.use('/public/media', mediaRoutes);

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/videos', publishRoutes); // /:id/publish
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/oauth', oauthRoutes);

  // Static dashboard (zero-build SPA).
  app.use(express.static(config.paths.public));

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

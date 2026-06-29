/** Thrown by route handlers/services to signal an HTTP-level error. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (req, res) => {
  res.status(404).json({ error: 'Not found' });
};

// Central error handler. Never leaks stack traces to clients.
export const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  // 501 = a feature that isn't configured (expected); don't treat as a crash.
  if (status >= 500 && status !== 501) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
};

/** Wrap an async route so rejected promises reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

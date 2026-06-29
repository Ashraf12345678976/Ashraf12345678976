import { verifyAccessToken } from '../security/tokens.js';
import { userRepo } from '../repositories/userRepo.js';
import { HttpError } from './error.js';

/**
 * Require a valid Bearer access token. Attaches req.user.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return next(new HttpError(401, 'Authentication required'));
  }
  try {
    const payload = verifyAccessToken(token);
    const user = userRepo.findById(payload.sub);
    if (!user) return next(new HttpError(401, 'Invalid session'));
    req.user = { id: user.id, email: user.email, role: user.role, displayName: user.display_name };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }
    next();
  };
}

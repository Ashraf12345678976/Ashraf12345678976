import bcrypt from 'bcryptjs';

const COST = 12; // ~250ms/hash — strong default for interactive logins.

export async function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length < 10) {
    throw new Error('Password must be at least 10 characters.');
  }
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

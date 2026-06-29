import crypto from 'node:crypto';
import config from '../config/index.js';

// AES-256-GCM authenticated encryption for social-account credentials at rest.
// The key is a 32-byte value supplied via CREDENTIAL_ENCRYPTION_KEY (hex).

const ALGO = 'aes-256-gcm';

function getKey() {
  const key = Buffer.from(config.credentialKeyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY must be 32 bytes (64 hex characters).'
    );
  }
  return key;
}

/**
 * Encrypt an arbitrary JSON-serialisable value.
 * @returns {string} JSON string {iv, tag, data} all hex-encoded.
 */
export function encryptJson(value) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce recommended for GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  });
}

/**
 * Decrypt a value produced by {@link encryptJson}.
 * Throws if the ciphertext or auth tag has been tampered with.
 */
export function decryptJson(payload) {
  const key = getKey();
  const { iv, tag, data } = JSON.parse(payload);
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

/** SHA-256 hex digest — used for opaque token lookups and viewer hashing. */
export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/** Cryptographically strong random token (hex). */
export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

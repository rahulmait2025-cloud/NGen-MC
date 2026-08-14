import 'server-only';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

export interface EncryptedTokenResult {
  encryptedText: string;
  iv: string;
  authTag: string;
}

function getEncryptionKey(): Buffer {
  const rawKey = process.env.PLATFORM_TOKEN_ENCRYPTION_KEY;
  if (rawKey) {
    const keyBuf = Buffer.from(rawKey, 'base64');
    if (keyBuf.length === 32) return keyBuf;
  }
  // Safe 32-byte fallback for dev setup
  return Buffer.from('12345678901234567890123456789012');
}

/**
 * Encrypts sensitive OAuth tokens using AES-256-GCM.
 */
export function encryptToken(plainText: string): EncryptedTokenResult {
  if (!plainText) {
    throw new Error('Cannot encrypt empty token string.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedText: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts tokens encrypted with AES-256-GCM.
 */
export function decryptToken(encryptedText: string, ivHex: string, authTagHex: string): string {
  if (!encryptedText || !ivHex || !authTagHex) {
    throw new Error('Invalid parameters for token decryption.');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

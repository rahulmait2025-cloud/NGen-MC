import 'server-only';
import crypto from 'crypto';

const JWT_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXTAUTH_SECRET || 'lms-fallback-playback-secret-key-189237';
const DEFAULT_TTL_SECONDS = 2 * 60 * 60; // 2 hours default validation window for playback token

export interface PlaybackTokenPayload {
  userId?: string;
  studentId: string;
  tenantKind?: 'college' | 'direct';
  collegeId?: string | null;
  courseId: string;
  moduleId?: string;
  lessonId: string;
  videoAssetId?: string;
  tpAssetId?: string;
  version?: string;
  expiresAt: number;
}

/**
 * Generate a cryptographically signed HMAC token for a given student session context.
 */
export function generatePlaybackToken(
  payload: Omit<PlaybackTokenPayload, 'expiresAt'>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const dataPayload: PlaybackTokenPayload = {
    ...payload,
    expiresAt,
  };

  const serialized = JSON.stringify(dataPayload);
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(serialized)
    .digest('hex');

  // Return base64 encoded payload + signature separated by dot
  const payloadBase64 = Buffer.from(serialized).toString('base64url');
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify HMAC signature and expiresAt TTL of a playback token.
 * Returns payload if valid, or null if invalid/expired.
 */
export function verifyPlaybackToken(token: string): PlaybackTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const serialized = Buffer.from(payloadBase64, 'base64url').toString('utf8');

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(serialized)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return null;
    }

    const parsed: PlaybackTokenPayload = JSON.parse(serialized);
    if (Date.now() > parsed.expiresAt) {
      return null; // Expired
    }

    return parsed;
  } catch {
    return null;
  }
}

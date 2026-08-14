/**
 * Client-safe helpers for short-TTL TPStreams playback tokens (default 300s).
 * Kept out of server-only modules so the course player can gate prefetch caches.
 */

import type { PlaybackTokenResult } from '@/types/student-runtime';

/** Safety margin before expiry when deciding a cached token is still usable (seconds). */
export const PLAYBACK_TOKEN_FRESHNESS_MARGIN_SECONDS = 60;

/**
 * Returns true if the token is still safe to use (not expired / near-expiry).
 * Tokens without expiresAt are treated as stale so the client remints.
 */
export function isPlaybackTokenFresh(
  token: Pick<PlaybackTokenResult, 'expiresAt'> | null | undefined,
  marginSeconds: number = PLAYBACK_TOKEN_FRESHNESS_MARGIN_SECONDS,
): boolean {
  if (!token?.expiresAt) return false;
  const expiresMs = Date.parse(token.expiresAt);
  if (!Number.isFinite(expiresMs)) return false;
  return expiresMs - marginSeconds * 1000 > Date.now();
}

import 'server-only';

/**
 * Shared Playback Policy and Validation Constraints.
 * Canonical source of truth for playback rates, segment counts, watch time caps, and tolerances.
 */

export const MIN_PLAYBACK_RATE = 0.5;
export const MAX_PLAYBACK_RATE = 2.0; // Supported player playback rate bounds (0.5x - 2.0x)

export const MAX_SEGMENTS_PER_HEARTBEAT = 50;
export const MAX_REQUEST_WATCH_TIME_SECONDS = 120; // Max watch time per heartbeat request (2 minutes)
export const MAX_SEGMENT_DURATION_SECONDS = 4 * 60 * 60; // 4 hours cap per segment
export const WATCH_TIME_PLAUSIBILITY_TOLERANCE = 1.35; // Server watch time vs wall clock tolerance multiplier
export const MAX_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours max session lifetime

/**
 * Validates whether a given playback rate is finite and within supported bounds [0.5, 2.0].
 */
export function isValidPlaybackRate(rate: unknown): rate is number {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return false;
  return rate >= MIN_PLAYBACK_RATE && rate <= MAX_PLAYBACK_RATE;
}

/**
 * Sanitizes playback rate, returning a fallback (default 1.0) if invalid.
 */
export function sanitizePlaybackRate(rate: unknown, fallback = 1.0): number {
  if (isValidPlaybackRate(rate)) {
    return rate;
  }
  return fallback;
}

import 'server-only';

/**
 * TPStreams Playback Security Layer (Phase 4).
 *
 * Higher-level functions that wrap the existing access-token API to
 * produce time-limited, optionally watermarked playback tokens.
 *
 * SECURITY:
 *   - Server-only — import guard prevents client-side usage.
 *   - Entitlement validation must occur BEFORE calling these functions.
 *   - Default TTL = 300 seconds (5 minutes).
 *   - TPStreams API key is never exposed to the client.
 *
 * Uses existing LMS TPStreams wrapper: lib/tpstreams/access-tokens.ts
 */

import { createAccessToken, buildEmbedUrl } from '@/lib/tpstreams/access-tokens';
import { getTpStreamsOrgId } from '@/lib/tpstreams/client';
import type { TpAccessToken, TpAnnotation } from '@/lib/tpstreams/types';
import type { PlaybackTokenResult } from '@/types/student-runtime';

/** Default time-to-live for playback tokens (5 minutes = 300 seconds). */
const DEFAULT_TTL_SECONDS = 300;

// ─── Unified dynamic playback token generator with optional watermark ─────────

/**
 * Generate a time-limited playback access token, optionally with dynamic student watermarks.
 * No caching is used so each call generates a fresh, unique token.
 *
 * @param tpAssetId   The TPStreams asset ID (NOT our internal UUID).
 * @param studentData Optional student profile details to embed as a moving screen-piracy watermark.
 * @param ttl         Token TTL in seconds (default: 300). Kept short to limit embed-URL leak risk.
 */
export async function generatePlaybackAccessToken(
  tpAssetId: string,
  studentData?: { name: string; email?: string } | null,
  ttl: number = DEFAULT_TTL_SECONDS,
): Promise<PlaybackTokenResult> {
  const orgId = getTpStreamsOrgId();

  const annotations: TpAnnotation[] = [];
  if (studentData?.name) {
    const textToShow = studentData.email 
      ? `${studentData.name} (${studentData.email})` 
      : studentData.name;
      
    annotations.push({
      type: 'dynamic',
      text: textToShow,
      opacity: '0.4',
      color: '#FFFFFF',
      size: 5,
      interval: 5000,
      skip: 2000,
      x: 10,
      y: 10,
    });
  }

  const token: TpAccessToken = await createAccessToken(tpAssetId, {
    time_to_live: ttl,
    annotations: annotations.length > 0 ? annotations : undefined,
  });

  // Prefer API valid_until; fall back so clients can detect expiry for short-TTL tokens.
  const expiresAt =
    token.valid_until ?? new Date(Date.now() + ttl * 1000).toISOString();

  return {
    embedUrl: buildEmbedUrl(orgId, tpAssetId, token.code),
    tokenCode: token.code,
    expiresAt,
  };
}



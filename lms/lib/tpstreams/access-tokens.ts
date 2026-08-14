import 'server-only';

/**
 * TPStreams Access Token service.
 *
 * Access tokens gate secure video playback. They must be generated server-side
 * and passed to the embed player. Never generate access tokens on the client.
 *
 * Covers:
 *   POST  /api/v1/<org>/assets/<asset_id>/access_tokens/
 *   GET   /api/v1/<org>/assets/<asset_id>/access_tokens/<code>/
 *   PATCH /api/v1/<org>/assets/<asset_id>/access_tokens/<code>/  (update TTL)
 */

import { tpPost, getTpStreamsOrgId, orgPath } from './client';
import type {
  TpCreateAccessTokenRequest,
  TpAccessToken,
} from './types';

// ─── Create access token ──────────────────────────────────────────────────────

/**
 * Generate an access token for secure video playback.
 *
 * SECURITY: This is a server-only operation. Never expose the TPStreams token
 * or call this endpoint from client-side code.
 *
 * Endpoint: POST /api/v1/<org>/assets/<asset_id>/access_tokens/
 *
 * @param assetId  The video asset to generate the token for.
 * @param options  Optional TTL, single-use, or watermark annotations.
 * @param orgId    Override default org ID from env.
 *
 * @example
 *   // Server action or Route Handler only:
 *   const token = await createAccessToken('yXrprYum2TS', {
 *     time_to_live: 3600,           // 1-hour token
 *     expires_after_first_usage: false,
 *   });
 *   // Pass token.code to the embed URL on the client
 */
export async function createAccessToken(
  assetId: string,
  options?: TpCreateAccessTokenRequest,
  orgId?: string,
): Promise<TpAccessToken> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpPost<TpAccessToken>(
    `${orgPath(id)}/assets/${assetId}/access_tokens/`,
    options ?? {},
  );
}

// ─── Get access token detail ──────────────────────────────────────────────────



// ─── Update access token TTL ──────────────────────────────────────────────────



// ─── Helper: build embed URL from access token ────────────────────────────────

/**
 * Constructs the TPStreams embed URL given an org ID, asset ID, and token code.
 * Use this in Server Components or Route Handlers to pass a safe embed URL
 * to the TpStreamEmbedFrame client component.
 *
 * @param orgId      TPStreams organisation UUID.
 * @param assetId    TPStreams asset ID.
 * @param tokenCode  Access token code.
 */
export function buildEmbedUrl(
  orgId: string,
  assetId: string,
  tokenCode: string,
): string {
  return `https://app.tpstreams.com/embed/${orgId}/${assetId}/?access_token=${tokenCode}`;
}



import 'server-only';

/**
 * TPStreams Webhook service.
 *
 * Webhooks notify your application when async events occur (e.g. video processing
 * complete, livestream status change). Configure the endpoint URL and a secret
 * token to verify authenticity (x-streams-token header).
 *
 * Covers:
 *   POST   /api/v1/<org>/webhooks/
 *   GET    /api/v1/<org>/webhooks/
 *   PUT    /api/v1/<org>/webhooks/<webhook_id>/
 *   DELETE /api/v1/<org>/webhooks/<webhook_id>/
 */

import { tpPost, tpGet, tpPut, tpDelete, getTpStreamsOrgId, orgPath } from './client';
import type {
  TpPaginatedResponse,
  TpWebhook,
  TpCreateWebhookRequest,
  TpUpdateWebhookRequest,
} from './types';

// --- Create webhook -----------------------------------------------------------

/**
 * Register a new webhook endpoint.
 *
 * Endpoint: POST /api/v1/<org>/webhooks/
 *
 * @param request  { url: string, secret_token: string }
 * @param orgId    Override default org ID.
 *
 * @example
 *   const webhook = await createWebhook({
 *     url: 'https://your-app.com/api/webhooks/tpstreams',
 *     secret_token: process.env.TPSTREAMS_WEBHOOK_SECRET!,
 *   });
 */
export async function createWebhook(
  request: TpCreateWebhookRequest,
  orgId?: string,
): Promise<TpWebhook> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpPost<TpWebhook>(`${orgPath(id)}/webhooks/`, request);
}

// --- List webhooks ------------------------------------------------------------

/**
 * List all webhooks configured for the organisation.
 *
 * Endpoint: GET /api/v1/<org>/webhooks/
 *
 * @param orgId  Override default org ID.
 */
export async function listWebhooks(orgId?: string): Promise<TpPaginatedResponse<TpWebhook>> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpGet<TpPaginatedResponse<TpWebhook>>(`${orgPath(id)}/webhooks/`);
}

// --- Update webhook -----------------------------------------------------------

/**
 * Replace an existing webhook's configuration (full replacement - PUT).
 *
 * Endpoint: PUT /api/v1/<org>/webhooks/<webhook_id>/
 *
 * @param webhookId  The webhook UUID.
 * @param request    Updated { url, secret_token }.
 * @param orgId      Override default org ID.
 */
async function _updateWebhook(
  webhookId: string,
  request: TpUpdateWebhookRequest,
  orgId?: string,
): Promise<TpWebhook> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpPut<TpWebhook>(`${orgPath(id)}/webhooks/${webhookId}/`, request);
}

// --- Delete webhook -----------------------------------------------------------

/**
 * Delete a webhook by ID.
 *
 * Endpoint: DELETE /api/v1/<org>/webhooks/<webhook_id>/
 *
 * @param webhookId  The webhook UUID.
 * @param orgId      Override default org ID.
 */
export async function deleteWebhook(webhookId: string, orgId?: string): Promise<void> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpDelete(`${orgPath(id)}/webhooks/${webhookId}/`);
}

// --- Webhook event verification helper ---------------------------------------

/**
 * Verifies that an incoming webhook request is genuinely from TPStreams
 * by comparing the x-streams-token header against your stored secret.
 *
 * Use this in your Next.js webhook Route Handler:
 *
 * @example
 *   // app/api/webhooks/tpstreams/route.ts
 *   export async function POST(req: Request) {
 *     const isValid = verifyWebhookSecret(
 *       req.headers.get('x-streams-token'),
 *       process.env.TPSTREAMS_WEBHOOK_SECRET!,
 *     );
 *     if (!isValid) return new Response('Unauthorized', { status: 401 });
 *     // ... handle event
 *   }
 *
 * @param receivedToken  Value of the x-streams-token request header.
 * @param storedSecret   The secret_token you configured when creating the webhook.
 */
export function verifyWebhookSecret(
  receivedToken: string | null,
  storedSecret: string,
): boolean {
  if (!receivedToken || !storedSecret) return false;
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(receivedToken);
  const b = Buffer.from(storedSecret);
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

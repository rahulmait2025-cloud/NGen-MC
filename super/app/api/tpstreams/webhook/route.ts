import { NextResponse } from 'next/server';
import { handleTpStreamsWebhook } from '@/lib/services/video-assets';
import { logTpWebhook } from '@/lib/services/tpstreams-analytics';
import { timingSafeEqual } from 'crypto';

/**
 * TPStreams Webhook Receiver (Phase 5C).
 *
 * Securely handles event notifications from TPStreams and logs them for audit.
 * Uses timing-safe comparison to prevent timing attacks on the webhook secret.
 */
export async function POST(request: Request) {
  let payload: {
    event: string;
    data: {
      asset_id: string;
      status?: string;
      duration?: number;
      cover_thumbnail_url?: string;
      playback_url?: string;
      dash_url?: string;
      [key: string]: unknown;
    };
  };
  try {
    // 1. Authentication with timing-safe comparison
    const receivedToken = request.headers.get('x-streams-token');
    const secret = process.env.TP_STREAMS_WEBHOOK_SECRET;

    if (!secret || !receivedToken) {
      console.warn('[TPStreams Webhook] Unauthorized request blocked.');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Use timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(Buffer.from(receivedToken, 'utf8'), Buffer.from(secret, 'utf8'))) {
      console.warn('[TPStreams Webhook] Unauthorized request blocked.');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Parse payload
    payload = await request.json();
    const { event, data } = payload;

    if (!event || !data || !data.asset_id) {
      return new NextResponse('Invalid payload', { status: 400 });
    }

    // 3. Handle event
    try {
      await handleTpStreamsWebhook(event, data);

      // Log success
      await logTpWebhook({
        event_type: event,
        tp_asset_id: data.asset_id,
        payload,
        processed_success: true
      });
    } catch (handlerError) {
      const error_message = handlerError instanceof Error ? handlerError.message : String(handlerError);

      // Log failure but return 200 to TPStreams (we handle it internally)
      await logTpWebhook({
        event_type: event,
        tp_asset_id: data.asset_id,
        payload,
        processed_success: false,
        error_message
      });

      console.error('[TPStreams Webhook] Handler Error:', error_message);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[TPStreams Webhook] Request Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ingestEvent } from '@/lib/email-center/webhooks/ingest';
import { EVENT_TYPE_MAPPING } from '@/lib/email-center/webhooks/types';

const WEBHOOK_PUBLIC_KEY = process.env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY;
const ALLOW_UNVERIFIED = process.env.EMAIL_WEBHOOK_ALLOW_UNVERIFIED === 'true';

function verifySendGridSignature(
  body: string,
  signature: string,
  timestamp: string
): boolean {
  if (!WEBHOOK_PUBLIC_KEY) return ALLOW_UNVERIFIED;

  try {
    const signedContent = `${timestamp}.${body}`;
    const signatureBytes = Buffer.from(signature, 'base64');

    const verifier = crypto.createVerify('sha256');
    verifier.update(signedContent);
    verifier.end();

    return verifier.verify(WEBHOOK_PUBLIC_KEY, signatureBytes);
  } catch (err) {
    console.error('[sendgrid-webhook] verification error:', err);
    if (ALLOW_UNVERIFIED) return true;
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-twilio-email-event-webhook-signature') || '';
  const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp') || '';

  const bodyText = await request.text();

  if (!ALLOW_UNVERIFIED && WEBHOOK_PUBLIC_KEY) {
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    }

    const isValid = verifySendGridSignature(bodyText, signature, timestamp);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let events: Record<string, unknown>[];
  try {
    events = JSON.parse(bodyText);
    if (!Array.isArray(events)) {
      events = [events];
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const settledResults = await Promise.allSettled(
    events.map(async (event) => {
      const providerEventType = (event.event as string) || (event.event_type as string);
      const eventType = EVENT_TYPE_MAPPING[providerEventType] || 'failed';

      const normalized = {
        provider: 'sendgrid' as const,
        providerEventId: (event.sg_event_id as string) || (event.event_id as string) || null,
        providerMessageId: (event.sg_message_id as string) || (event.message_id as string) || null,
        eventType,
        email: (event.email as string) || (event.to as string) || null,
        timestamp: new Date((event.timestamp as number) * 1000 || Date.now()),
        url: (event.url as string) || null,
        userAgent: (event.user_agent as string) || null,
        rawEvent: event,
      };

      return await ingestEvent(normalized);
    })
  );

  const results = settledResults.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    console.error('[webhooks] SendGrid event error:', r.reason);
    return { ok: false, error: r.reason instanceof Error ? r.reason.message : 'Unknown error' };
  });

  const hasError = results.some((r) => !r.ok);
  if (hasError) {
    return NextResponse.json(
      { error: 'Some events failed', details: results },
      { status: 207 }
    );
  }

  return NextResponse.json({ ok: true, count: results.length });
}
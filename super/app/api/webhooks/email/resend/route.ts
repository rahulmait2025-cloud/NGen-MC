import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { ingestEvent } from '@/lib/email-center/webhooks/ingest';
import { EVENT_TYPE_MAPPING } from '@/lib/email-center/webhooks/types';

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;
const ALLOW_UNVERIFIED = process.env.EMAIL_WEBHOOK_ALLOW_UNVERIFIED === 'true';

function logWebhookDebug(headers: {
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}) {
  console.log('[webhooks/resend] verify', {
    hasWebhookSecret: Boolean(WEBHOOK_SECRET),
    allowUnverified: ALLOW_UNVERIFIED,
    hasSvixId: Boolean(headers.svixId),
    hasSvixTimestamp: Boolean(headers.svixTimestamp),
    hasSvixSignature: Boolean(headers.svixSignature),
  });
}

function verifyResendWebhook(
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string
): { ok: true; bypassed: boolean } | { ok: false; reason: 'missing_secret' | 'missing_headers' | 'signature_invalid' } {
  if (ALLOW_UNVERIFIED) {
    return { ok: true, bypassed: true };
  }

  if (!WEBHOOK_SECRET) {
    return { ok: false, reason: 'missing_secret' };
  }

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, reason: 'missing_headers' };
  }

  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
    return { ok: true, bypassed: false };
  } catch {
    return { ok: false, reason: 'signature_invalid' };
  }
}

export async function POST(request: NextRequest) {
  const svixId = request.headers.get('svix-id') ?? '';
  const svixTimestamp = request.headers.get('svix-timestamp') ?? '';
  const svixSignature = request.headers.get('svix-signature') ?? '';

  const bodyText = await request.text();

  logWebhookDebug({ svixId, svixTimestamp, svixSignature });

  const verification = verifyResendWebhook(bodyText, svixId, svixTimestamp, svixSignature);
  if (!verification.ok) {
    return NextResponse.json(
      { error: 'Webhook verification failed', reason: verification.reason },
      { status: 401 }
    );
  }

  const bypassed = verification.ok && verification.bypassed;

  let events: Record<string, unknown>[];
  try {
    events = JSON.parse(bodyText);
    if (!Array.isArray(events)) {
      events = [events];
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const settled = await Promise.allSettled(
    events.map(async (event) => {
      const providerEventType = (event.event as string) || (event.type as string) || '';
      const eventType = EVENT_TYPE_MAPPING[providerEventType] || 'failed';

      const email = (event.email as string) || (event.to as string) || null;

      const normalized = {
        provider: 'resend' as const,
        providerEventId: (event.id as string) || (event.msg_id as string) || null,
        providerMessageId: (event.message_id as string) || (event.msg_id as string) || null,
        eventType,
        email,
        timestamp: event.created_at ? new Date(String(event.created_at)) : new Date(),
        url: (event.url as string) || null,
        userAgent: null,
        rawEvent: event,
      };

      return ingestEvent(normalized);
    }),
  );

  const results: { ok: boolean; error?: string }[] = settled.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    console.error('[webhooks] Resend event error:', r.reason);
    return { ok: false, error: r.reason instanceof Error ? r.reason.message : 'Unknown error' };
  });

  const hasError = results.some((r) => !r.ok);
  if (hasError) {
    return NextResponse.json(
      {
        error: 'Some events failed',
        details: results,
        ...(bypassed ? { reason: 'bypass_enabled' as const } : {}),
      },
      { status: 207 }
    );
  }

  return NextResponse.json({
    ok: true,
    count: results.length,
    ...(bypassed ? { reason: 'bypass_enabled' as const } : {}),
  });
}

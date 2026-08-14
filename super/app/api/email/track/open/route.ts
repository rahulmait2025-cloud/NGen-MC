import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { isTrackingPrefetchRequest, trackDevLog } from '@/lib/email-center/tracking-route-utils';
import { recordEmailOpenEvent, type EmailOpenTokenRow } from '@/lib/email-center/tracking-record';

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const;

function pixelResponse(status = 200) {
  return new NextResponse(TRANSPARENT_GIF, { status, headers: PIXEL_HEADERS });
}

/**
 * Open pixels are loaded with GET by email clients. Keep POST as a thin alias.
 */
async function handleOpenTrack(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const rateLimit = await consumeRateLimit({
    key: `email_open_track:${ip}`,
    limit: 100,
    windowMs: 60000,
  });

  if (!rateLimit.ok) {
    return new NextResponse(TRANSPARENT_GIF, {
      status: 429,
      headers: {
        'Content-Type': 'image/gif',
        'Retry-After': String(rateLimit.retryAfterSeconds),
      },
    });
  }

  const token = request.nextUrl.searchParams.get('token');
  trackDevLog('open', 'token received', { hasToken: Boolean(token), method: request.method });

  if (!token) {
    trackDevLog('open', 'token lookup failure', { reason: 'missing_token' });
    return pixelResponse();
  }

  const admin = createAdminClient();

  const { data: tokenData, error } = await admin
    .from('email_open_tokens')
    .select('*')
    .eq('tracking_token', token)
    .single();

  if (error || !tokenData) {
    trackDevLog('open', 'token lookup failure', { reason: error?.message ?? 'not_found' });
    return pixelResponse();
  }

  trackDevLog('open', 'token lookup success', {
    campaignId: tokenData.campaign_id,
    recipientId: tokenData.recipient_id,
  });

  await recordEmailOpenEvent({
    tokenRow: tokenData as EmailOpenTokenRow,
    skipAnalytics: isTrackingPrefetchRequest(request),
  });

  return pixelResponse();
}

export async function GET(request: NextRequest) {
  return handleOpenTrack(request);
}

export async function POST(request: NextRequest) {
  return handleOpenTrack(request);
}

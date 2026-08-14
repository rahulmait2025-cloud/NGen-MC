import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import {
  getTrackingFallbackUrl,
  isTrackingPrefetchRequest,
  trackDevLog,
} from '@/lib/email-center/tracking-route-utils';
import { recordEmailClickEvent, type EmailClickLinkRow } from '@/lib/email-center/tracking-record';
import crypto from 'crypto';

/**
 * Email clients open tracked links with GET. Keep POST as a thin alias for
 * any legacy callers / probes.
 */
async function handleClickTrack(request: NextRequest) {
  const fallbackUrl = getTrackingFallbackUrl();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const rateLimit = await consumeRateLimit({
    key: `email_click_track:${ip}`,
    limit: 100,
    windowMs: 60000,
  });

  if (!rateLimit.ok) {
    return new NextResponse('Rate limit exceeded', { status: 429 });
  }

  const token = request.nextUrl.searchParams.get('token');
  trackDevLog('click', 'token received', { hasToken: Boolean(token), method: request.method });

  if (!token) {
    trackDevLog('click', 'token lookup failure', { reason: 'missing_token' });
    return NextResponse.redirect(fallbackUrl, 302);
  }

  const admin = createAdminClient();

  const { data: link, error } = await admin
    .from('email_click_links')
    .select('*')
    .eq('tracking_token', token)
    .single();

  if (error || !link) {
    trackDevLog('click', 'token lookup failure', { reason: error?.message ?? 'not_found' });
    return NextResponse.redirect(fallbackUrl, 302);
  }

  trackDevLog('click', 'token lookup success', {
    campaignId: link.campaign_id,
    recipientId: link.recipient_id,
  });

  let urlObj: URL;
  try {
    urlObj = new URL(link.original_url);
  } catch {
    trackDevLog('click', 'invalid redirect URL', { originalUrl: link.original_url });
    return NextResponse.redirect(fallbackUrl, 302);
  }

  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    trackDevLog('click', 'invalid redirect URL', { originalUrl: link.original_url });
    return NextResponse.redirect(fallbackUrl, 302);
  }

  const userAgent = request.headers.get('user-agent') || '';
  const ipFull =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
  const ipHash = ipFull
    ? crypto
        .createHash('sha256')
        .update(ipFull + process.env.SUPABASE_SERVICE_ROLE_KEY)
        .digest('hex')
        .slice(0, 32)
    : null;

  const skipAnalytics = isTrackingPrefetchRequest(request);

  await recordEmailClickEvent({
    link: link as EmailClickLinkRow,
    userAgent,
    ipHash,
    skipAnalytics,
  });

  trackDevLog('click', 'redirect URL', { redirectTo: link.original_url });

  try {
    // 302 is the usual email-click redirect status (clients follow after GET).
    return NextResponse.redirect(link.original_url, 302);
  } catch {
    return NextResponse.redirect(fallbackUrl, 302);
  }
}

export async function GET(request: NextRequest) {
  return handleClickTrack(request);
}

export async function POST(request: NextRequest) {
  return handleClickTrack(request);
}

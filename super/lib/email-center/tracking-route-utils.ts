import type { NextRequest } from 'next/server';

/**
 * Public origin used in emailed open/click URLs.
 * Forces https for non-local hosts so Vercel never emits http://admin-... links.
 */
export function getEmailCenterPublicAppUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SUPERADMIN_URL ||
    process.env.NEXT_PUBLIC_SUPERADMIN_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  )
    .trim()
    .replace(/\/+$/, '');

  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1') {
      parsed.protocol = 'https:';
    }
    return parsed.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export function getTrackingFallbackUrl(): string {
  return getEmailCenterPublicAppUrl();
}

/** First-party click wrappers add an intermediate hop; off by default. Set EMAIL_CENTER_CLICK_TRACKING=1 to enable. */
export function isEmailCenterClickTrackingEnabled(): boolean {
  const v = (process.env.EMAIL_CENTER_CLICK_TRACKING ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function trackDevLog(
  route: 'click' | 'open',
  message: string,
  detail?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (detail) {
    console.log(`[email-track:${route}]`, message, detail);
  } else {
    console.log(`[email-track:${route}]`, message);
  }
}

/** Skip analytics for browser/link prefetch (still allow redirect / pixel). */
export function isTrackingPrefetchRequest(request: NextRequest): boolean {
  const secPurpose = (request.headers.get('sec-purpose') ?? '').toLowerCase();
  const purpose = (request.headers.get('purpose') ?? '').toLowerCase();
  const moz = (request.headers.get('x-moz') ?? '').toLowerCase();

  if (secPurpose.includes('prefetch') || secPurpose.includes('prerender')) return true;
  if (purpose.includes('prefetch')) return true;
  if (moz === 'prefetch') return true;

  return false;
}

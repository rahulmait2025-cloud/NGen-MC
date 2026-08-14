export interface CampusAmbassadorSharePayload {
  couponCode: string;
  shareUrl: string;
  shareMessage: string;
  whatsappUrl: string;
  linkedinUrl: string;
  linkedinCopyMessage: string;
}

const PRODUCTION_APP_URL = 'https://app.nextgen-cto.in';
const LOCAL_DEV_URL = 'http://localhost:3000';
export const CAMPUS_AMBASSADOR_OG_IMAGE_PATH = '/assets/campus-ambassador/social-preview.png';

function isLocalhostHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isLocalhostUrl(url: string): boolean {
  try {
    return isLocalhostHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Public app base URL for ambassador referral links and OG metadata.
 * Never uses localhost in production — falls back to app.nextgen-cto.in.
 */
export function getCampusAmbassadorAppBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_LMS_URL,
  ];

  const isProduction = process.env.NODE_ENV === 'production';

  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const normalized = normalizeBaseUrl(raw);
    if (isProduction && isLocalhostUrl(normalized)) continue;
    return normalized;
  }

  if (!isProduction) {
    return LOCAL_DEV_URL;
  }

  return PRODUCTION_APP_URL;
}

export function getCampusAmbassadorOgImageUrl(): string {
  return new URL(CAMPUS_AMBASSADOR_OG_IMAGE_PATH, getCampusAmbassadorAppBaseUrl()).toString();
}

export function getCampusAmbassadorShareUrl(code: string): string {
  const normalizedCode = code.trim().toUpperCase();
  const shareUrl = new URL('/campus-ambassador', getCampusAmbassadorAppBaseUrl());
  shareUrl.searchParams.set('ref', normalizedCode);
  return shareUrl.toString();
}

export function getCampusAmbassadorShareMessage(input: {
  couponCode: string;
  shareUrl: string;
  ambassadorName?: string | null;
  discountLabel?: string | null;
}): string {
  const couponCode = input.couponCode.trim().toUpperCase();
  const discountLabel = input.discountLabel?.trim() || 'a special discount';

  const introLine = input.ambassadorName?.trim()
    ? `Hey, I'm ${input.ambassadorName.trim()}, and I'm now a Campus Ambassador for NextGen CTO 🚀`
    : `Hey, I'm now a Campus Ambassador for NextGen CTO 🚀`;

  return [
    introLine,
    '',
    "I'm sharing this because I genuinely feel it can help students who want to get serious about placements, coding, AI, DSA, projects, and career-ready skills 💻",
    '',
    'NextGen CTO is built to help students learn in a more structured, practical, and industry-focused way — not just theory, but skills that actually matter for interviews, projects, and real growth.',
    '',
    `You can use my ambassador coupon code ${couponCode} to get ${discountLabel} on eligible NextGen CTO programs 🎁`,
    '',
    'Explore here:',
    input.shareUrl,
    '',
    "If you're planning to become placement-ready, this is a good place to start 🔥",
  ].join('\n');
}

export function getWhatsAppShareUrl(message: string): string {
  const whatsappUrl = new URL('https://wa.me/');
  whatsappUrl.searchParams.set('text', message);
  return whatsappUrl.toString();
}

export function getLinkedInShareUrl(shareUrl: string): string {
  const linkedInUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
  linkedInUrl.searchParams.set('url', shareUrl);
  return linkedInUrl.toString();
}

export function getCampusAmbassadorDiscountLabel(coupon: {
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
}): string {
  if (coupon.discount_type === 'percentage') {
    return `${coupon.discount_value}% off`;
  }

  return `₹${(coupon.discount_value / 100).toLocaleString('en-IN')} off`;
}

export function buildCampusAmbassadorShare(input: {
  couponCode: string;
  ambassadorName?: string | null;
  discountLabel?: string | null;
}): CampusAmbassadorSharePayload {
  const couponCode = input.couponCode.trim().toUpperCase();
  const shareUrl = getCampusAmbassadorShareUrl(couponCode);
  const shareMessage = getCampusAmbassadorShareMessage({
    couponCode,
    shareUrl,
    ambassadorName: input.ambassadorName,
    discountLabel: input.discountLabel,
  });

  return {
    couponCode,
    shareUrl,
    shareMessage,
    whatsappUrl: getWhatsAppShareUrl(shareMessage),
    linkedinUrl: getLinkedInShareUrl(shareUrl),
    linkedinCopyMessage: shareMessage,
  };
}

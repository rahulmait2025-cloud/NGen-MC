import { getEmailBrandLogoUrl } from '@/lib/brand/email-logo-url';

/** Canonical NextGen CTO brand asset URLs. */
const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://afgnktqrevcxbrimtdlx.supabase.co'
).replace(/\/+$/, '');

const BRAND_BUCKET = 'brand-assets';
export const BRAND_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BRAND_BUCKET}/nextgen-cto`;

export const BRAND_ASSETS = {
  /** LMS landing canonical logo mark (local, Next/Image optimized). */
  logoIcon: '/assets/logo-icon.png',
  /** Same mark — works in both light and dark with theme-aware wrapper. */
  logoLight: '/assets/logo-icon.png',
  logoDark: '/assets/logo-icon.png',
  /** Email-safe absolute HTTPS logo (Supabase public storage). */
  get logoEmail(): string {
    return getEmailBrandLogoUrl();
  },
  /** Founder / CTO Bhaiya portrait — LMS mentor sections (local public asset). */
  founderImage: '/assets/founder.png',
  founderImageWhite: '/anuj_white.png',
  founderImageBlack: '/anuj_black.png',
} as const;

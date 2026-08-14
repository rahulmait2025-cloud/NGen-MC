/**
 * Shared email logo URL for all platform emails.
 *
 * Prefer (in order):
 *   EMAIL_LOGO_URL
 *   EMAIL_BRAND_LOGO_URL
 *   NEXT_PUBLIC_EMAIL_BRAND_LOGO_URL
 *
 * Default: existing public Supabase object
 *   brand-assets/nextgen-cto/NextGen CTO Logo.png
 *
 * Do not invent new uploads — reuse the already-uploaded public asset.
 */

/** Canonical object path inside the public `brand-assets` bucket. */
export const EMAIL_LOGO_OBJECT_PATH = 'brand-assets/nextgen-cto/NextGen CTO Logo.png';

/**
 * Hard-coded public-object URL (project-ref from existing production storage).
 * Prefer env overrides when NEXT_PUBLIC_SUPABASE_URL differs per environment.
 */
export const DEFAULT_EMAIL_BRAND_LOGO_URL =
  'https://afgnktqrevcxbrimtdlx.supabase.co/storage/v1/object/public/brand-assets/nextgen-cto/NextGen%20CTO%20Logo.png';

/** Known-dead object keys that return 400 from this project's public bucket. */
const BROKEN_LOGO_PATH_MARKERS = [
  '/brand-assets/nextgen-cto/logo-hd.png',
  '/brand-assets/nextgen-cto/logo.png',
] as const;

function isBrokenLogoCandidate(url: string): boolean {
  const lower = url.toLowerCase();
  if (!/^https:\/\//i.test(url)) return true;
  if (/localhost|127\.0\.0\.1/i.test(lower)) return true;
  if (/\/storage\/v1\/object\/sign\//i.test(lower) || /[?&]token=/i.test(lower)) return true;
  return BROKEN_LOGO_PATH_MARKERS.some((marker) => lower.includes(marker));
}

function pickHttpsUrl(...candidates: (string | undefined)[]): string | null {
  for (const c of candidates) {
    const t = c?.trim();
    if (t && /^https:\/\//i.test(t) && !isBrokenLogoCandidate(t)) return t;
  }
  return null;
}

function buildDefaultEmailLogoUrl(): string {
  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  if (supabase) {
    // Encode each path segment so spaces become %20 (public permanent object URL).
    const encodedPath = EMAIL_LOGO_OBJECT_PATH.split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${supabase}/storage/v1/object/public/${encodedPath}`;
  }
  return DEFAULT_EMAIL_BRAND_LOGO_URL;
}

export function getEmailBrandLogoUrl(): string {
  return (
    pickHttpsUrl(
      process.env.EMAIL_LOGO_URL,
      process.env.EMAIL_BRAND_LOGO_URL,
      process.env.NEXT_PUBLIC_EMAIL_BRAND_LOGO_URL,
    ) ?? buildDefaultEmailLogoUrl()
  );
}

/**
 * Prefer a caller-provided HTTPS logo URL; otherwise the platform brand logo.
 * Rejects known-broken paths (e.g. logo-hd.png) so stale preview/env values cannot win.
 */
export function resolveEmailLogoUrl(candidate?: string | null): string {
  return pickHttpsUrl(candidate ?? undefined) ?? getEmailBrandLogoUrl();
}

/** True when URL looks like a permanent Supabase public-object URL (not signed). */
export function isSupabasePublicObjectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.searchParams.has('token')) return false;
    if (isBrokenLogoCandidate(url)) return false;
    return parsed.pathname.includes('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

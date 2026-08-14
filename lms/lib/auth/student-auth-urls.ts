import { getSafeNext } from './safe-next';

/**
 * Student LMS Supabase Auth dashboard settings (configure in Supabase, not in code):
 *
 * Site URL: https://your-production-domain.com
 *
 * Additional Redirect URLs (examples):
 * - http://localhost:3000/c/[collegeSlug]/student/auth/callback
 * - http://localhost:3000/c/[collegeSlug]/student/reset-password
 * - production and Vercel preview domains with the same path pattern
 *
 * Google Cloud OAuth authorized redirect URI (Supabase handles Google callback):
 * - https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
 */

export function studentPortalBasePath(collegeSlug: string): string {
  return `/c/${encodeURIComponent(collegeSlug)}/student`;
}

export function getStudentOAuthCallbackUrl(
  collegeSlug: string,
  origin: string,
  next?: string | null,
): string {
  const base = origin.replace(/\/+$/, '');
  const fallback = studentPortalBasePath(collegeSlug);
  const safeNext = getSafeNext(next, fallback);
  const callback = `${base}/c/${encodeURIComponent(collegeSlug)}/student/auth/callback`;
  return `${callback}?next=${encodeURIComponent(safeNext)}`;
}

export function getStudentPasswordResetRedirectUrl(
  collegeSlug: string,
  origin: string,
): string {
  const base = origin.replace(/\/+$/, '');
  const resetPath = `${base}${studentPortalBasePath(collegeSlug)}/reset-password`;
  const callback = `${base}${studentPortalBasePath(collegeSlug)}/auth/callback`;
  return `${callback}?next=${encodeURIComponent(resetPath)}`;
}

export function isStudentPasswordResetPath(path: string, collegeSlug: string): boolean {
  return path === `${studentPortalBasePath(collegeSlug)}/reset-password`;
}

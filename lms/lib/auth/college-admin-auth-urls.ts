import { getSafeNext } from './safe-next';

/**
 * College Admin portal Supabase Auth redirect URLs (configure in Supabase dashboard):
 *
 * Site URL: https://your-production-domain.com
 *
 * Additional Redirect URLs (examples):
 * - http://localhost:3000/auth/callback
 * - http://localhost:3000/reset-password
 * - production and Vercel preview domains with the same path pattern
 */

const COLLEGE_ADMIN_LOGIN_PATH = '/login';
export const COLLEGE_ADMIN_RESET_PASSWORD_PATH = '/reset-password';

export function getCollegeAdminPasswordResetRedirectUrl(origin: string): string {
  const base = origin.replace(/\/+$/, '');
  const resetPath = `${base}${COLLEGE_ADMIN_RESET_PASSWORD_PATH}`;
  const callback = `${base}/auth/callback`;
  return `${callback}?next=${encodeURIComponent(resetPath)}`;
}

export function isCollegeAdminPasswordResetPath(path: string): boolean {
  const normalized = path.split('?')[0].replace(/\/+$/, '');
  return normalized === COLLEGE_ADMIN_RESET_PASSWORD_PATH;
}

function _getCollegeAdminOAuthCallbackUrl(
  origin: string,
  next?: string | null,
): string {
  const base = origin.replace(/\/+$/, '');
  const safeNext = getSafeNext(next, COLLEGE_ADMIN_LOGIN_PATH);
  const callback = `${base}/auth/callback`;
  return `${callback}?next=${encodeURIComponent(safeNext)}`;
}

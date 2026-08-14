/**
 * Optimized cookie options for Supabase auth.
 * Hardened security settings — strict sameSite, shorter sessions.
 * Unique cookie name per app prevents collisions on same domain.
 */

export const PERSISTENT_COOKIE_OPTIONS = {
  name: 'sb-college-admin-auth',
  path: '/',
  maxAge: 24 * 60 * 60, // 24 hours
  sameSite: 'strict' as const, // CSRF protection
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};

export const BROWSER_COOKIE_OPTIONS = {
  ...PERSISTENT_COOKIE_OPTIONS,
  httpOnly: false,
};

export function resolveSupabaseKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
  }
  return key;
}

export function resolveSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !/^https:\/\/.+/i.test(url)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set or invalid.');
  }
  return url;
}
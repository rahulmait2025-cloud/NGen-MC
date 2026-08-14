import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createMiddlewareClient } from './lib/supabase/middleware';
import { PERSISTENT_COOKIE_OPTIONS } from './lib/supabase/cookie-options';

const PROXY_TIMEOUT_MS = 10_000;

const CLAIMS_FAST_PATH_ENABLED = process.env.AUTH_CLAIMS_FAST_PATH_ENABLED !== 'false';
const DEBUG_HEADERS_ENABLED = process.env.AUTH_DEBUG_HEADERS_ENABLED === 'true';

function setRequestAuthHeader(
  headers: Headers,
  name: string,
  value: string | null | undefined,
) {
  headers.set(name, value ? String(value) : '');
}

/**
 * Set all auth context headers from a verified User object onto sanitized request headers.
 * Always sets every header — empty string if value is absent — so no spoofed value can survive.
 * Authorization-sensitive fields come ONLY from app_metadata (server-controlled).
 * user_metadata is used only for display fields (full_name).
 */
function applyUserHeaders(
  requestHeaders: Headers,
  user: User | null,
  pathname?: string,
  authSource?: string,
) {
  if (!user) {
    setRequestAuthHeader(requestHeaders, 'x-user-id', '');
    setRequestAuthHeader(requestHeaders, 'x-user-email', '');
    setRequestAuthHeader(requestHeaders, 'x-user-role', '');
    setRequestAuthHeader(requestHeaders, 'x-college-role', '');
    setRequestAuthHeader(requestHeaders, 'x-college-id', '');
    setRequestAuthHeader(requestHeaders, 'x-college-slug', '');
    setRequestAuthHeader(requestHeaders, 'x-membership-id', '');
    setRequestAuthHeader(requestHeaders, 'x-user-fullname', '');
    setRequestAuthHeader(requestHeaders, 'x-auth-source', authSource ?? '');
    return;
  }

  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const userMeta = user.user_metadata as Record<string, unknown> | undefined;

  setRequestAuthHeader(requestHeaders, 'x-user-id', user.id);
  setRequestAuthHeader(requestHeaders, 'x-user-email', user.email);
  setRequestAuthHeader(requestHeaders, 'x-user-role', appMeta?.global_role as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-college-role', appMeta?.college_role as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-college-id', appMeta?.college_id as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-membership-id', appMeta?.membership_id as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-user-fullname', userMeta?.full_name as string | undefined);

  if (pathname) {
    const match = pathname.match(/^\/c\/([^/]+)/);
    setRequestAuthHeader(requestHeaders, 'x-college-slug', match?.[1] ?? '');
  } else {
    setRequestAuthHeader(requestHeaders, 'x-college-slug', '');
  }

  setRequestAuthHeader(requestHeaders, 'x-auth-source', authSource ?? '');
}

interface ClaimsData {
  claims: Record<string, unknown>;
}

/**
 * Set all auth context headers from verified JWT claims onto sanitized request headers.
 * Always sets every header — empty string if value is absent — so no spoofed value can survive.
 * Authorization-sensitive fields come ONLY from app_metadata (server-controlled).
 * user_metadata is used only for display fields (full_name).
 */
function applyClaimsHeaders(
  requestHeaders: Headers,
  claims: ClaimsData,
  pathname?: string,
  authSource?: string,
) {
  const payload = claims.claims;
  if (!payload?.sub) {
    setRequestAuthHeader(requestHeaders, 'x-user-id', '');
    setRequestAuthHeader(requestHeaders, 'x-user-email', '');
    setRequestAuthHeader(requestHeaders, 'x-user-role', '');
    setRequestAuthHeader(requestHeaders, 'x-college-role', '');
    setRequestAuthHeader(requestHeaders, 'x-college-id', '');
    setRequestAuthHeader(requestHeaders, 'x-college-slug', '');
    setRequestAuthHeader(requestHeaders, 'x-membership-id', '');
    setRequestAuthHeader(requestHeaders, 'x-user-fullname', '');
    setRequestAuthHeader(requestHeaders, 'x-auth-source', authSource ?? '');
    return;
  }

  const appMeta = payload.app_metadata as Record<string, unknown> | undefined;
  const userMeta = payload.user_metadata as Record<string, unknown> | undefined;

  setRequestAuthHeader(requestHeaders, 'x-user-id', payload.sub as string);
  setRequestAuthHeader(requestHeaders, 'x-user-email', payload.email as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-user-role', appMeta?.global_role as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-college-role', appMeta?.college_role as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-college-id', appMeta?.college_id as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-membership-id', appMeta?.membership_id as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-user-fullname', userMeta?.full_name as string | undefined);

  if (pathname) {
    const match = pathname.match(/^\/c\/([^/]+)/);
    setRequestAuthHeader(requestHeaders, 'x-college-slug', match?.[1] ?? '');
  } else {
    setRequestAuthHeader(requestHeaders, 'x-college-slug', '');
  }

  setRequestAuthHeader(requestHeaders, 'x-auth-source', authSource ?? '');
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/set-password') ||
    /^\/c\/[^/]+\/admin\/login/.test(pathname) ||
    /^\/c\/[^/]+\/admin\/forgot-password/.test(pathname) ||
    /^\/c\/[^/]+\/admin\/reset-password/.test(pathname) ||
    pathname === '/'
  );
}

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith(PERSISTENT_COOKIE_OPTIONS.name));
}

function isAuthCallbackRoute(pathname: string): boolean {
  return pathname === '/auth/callback' || pathname.startsWith('/auth/callback/');
}

async function getClaimsWithTimeout(
  supabase: ReturnType<typeof createMiddlewareClient>['supabase']
): Promise<ClaimsData | null> {
  const result = await Promise.race([
    supabase.auth.getClaims(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('auth.getClaims timeout')), PROXY_TIMEOUT_MS)
    ),
  ]);
  if (result.error || !result.data) return null;
  return { claims: result.data.claims as unknown as Record<string, unknown> };
}

async function getUserWithTimeout(supabase: ReturnType<typeof createMiddlewareClient>['supabase']): Promise<User | null> {
  const result = await Promise.race([
    supabase.auth.getUser(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('auth.getUser timeout')), PROXY_TIMEOUT_MS)
    ),
  ]);
  return result.data.user ?? null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api');
  const publicRoute = isPublicRoute(pathname);

  if (isApiRoute || publicRoute) {
    if (isAuthCallbackRoute(pathname) || !hasAuthCookie(request)) {
      return NextResponse.next({ request });
    }
    const { supabase, requestHeaders, buildResponse } = createMiddlewareClient(request);
    try {
      if (CLAIMS_FAST_PATH_ENABLED) {
        const claims = await getClaimsWithTimeout(supabase);
        if (claims) {
          applyClaimsHeaders(requestHeaders, claims, pathname, 'claims');
          if (DEBUG_HEADERS_ENABLED) {
            console.log('[auth-audit] CollegeAdmin public/api claims path', pathname, 'userId=', claims.claims?.sub);
          }
        } else {
          const user = await getUserWithTimeout(supabase);
          applyUserHeaders(requestHeaders, user, pathname, 'getUser-fallback');
        }
      } else {
        const user = await getUserWithTimeout(supabase);
        applyUserHeaders(requestHeaders, user, pathname, 'getUser');
      }
    } catch {
      // Timeout or error — pass through without headers (already stripped)
    }
    return buildResponse();
  }

  if (!hasAuthCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const { supabase, requestHeaders, buildResponse } = createMiddlewareClient(request);

  try {
    if (CLAIMS_FAST_PATH_ENABLED) {
      const claims = await getClaimsWithTimeout(supabase);
      if (claims) {
        applyClaimsHeaders(requestHeaders, claims, pathname, 'claims');
        if (DEBUG_HEADERS_ENABLED) {
          console.log('[auth-audit] CollegeAdmin protected claims path', pathname, 'userId=', claims.claims?.sub);
        }
      } else {
        const user = await getUserWithTimeout(supabase);
        if (!user) {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.search = '';
          return NextResponse.redirect(url);
        }
        applyUserHeaders(requestHeaders, user, pathname, 'getUser-fallback');
      }
    } else {
      const user = await getUserWithTimeout(supabase);
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.search = '';
        return NextResponse.redirect(url);
      }
      applyUserHeaders(requestHeaders, user, pathname, 'getUser');
    }
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // A timeout or transient Auth/JWKS failure must not destroy a valid refresh
    // session. Redirect for this request and let the next request retry/refresh.
    return NextResponse.redirect(url);
  }

  return buildResponse();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|eot|mp[34]|webm|ogg|wav|pdf)$).*)',
  ],
};

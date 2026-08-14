import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient, hasAuthCookie, stripAuthContextHeaders } from './lib/supabase/middleware';
import { isPublicStudentRoute } from './lib/auth/public-student-routes';

const PROXY_TIMEOUT_MS = 5_000;

const DEBUG_HEADERS_ENABLED = process.env.AUTH_DEBUG_HEADERS_ENABLED === 'true';
const AUTH_DIAGNOSTICS_ENABLED = process.env.AUTH_DIAGNOSTICS_ENABLED === 'true';

function setRequestAuthHeader(
  headers: Headers,
  name: string,
  value: string | null | undefined,
) {
  headers.set(name, value ? String(value) : '');
}

function logProxyAuth(pathname: string, routeClass: RouteClass, source: string) {
  if (!AUTH_DIAGNOSTICS_ENABLED) return;
  console.log(`[auth-diagnostics] proxy: pathname=${pathname}, routeClass=${routeClass}, authSource=${source}`);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteClass =
  | 'static-framework-asset'
  | 'public-non-tenant'
  | 'public-tenant-catalog'
  | 'authenticated-student'
  | 'auth-callback-recovery'
  | 'invitation'
  | 'webhook'
  | 'api'
  | 'protected-page';

type StudentClaimValidation =
  | { status: 'anonymous' }
  | { status: 'complete'; routeSlug: string; claimSlug: string }
  | { status: 'incomplete' }
  | { status: 'malformed' }
  | { status: 'mismatch' };

function normalizeCollegeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function extractRouteCollegeSlug(pathname: string): string {
  return normalizeCollegeSlug(pathname.match(/^\/c\/([^/]+)/)?.[1] ?? '');
}

function isStaticOrFrameworkAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|eot|mp[34]|webm|ogg|wav|pdf)$/.test(pathname)
  );
}

function isWebhookRoute(pathname: string): boolean {
  return pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/internal/');
}

function isHealthRoute(pathname: string): boolean {
  return pathname === '/health' || pathname === '/api/health';
}

function isInvitationRoute(pathname: string): boolean {
  return pathname.startsWith('/invite') || pathname.startsWith('/api/invite') || pathname.startsWith('/api/complete-invite');
}

function classifyRoute(pathname: string): RouteClass {
  if (isStaticOrFrameworkAsset(pathname) || isHealthRoute(pathname)) return 'static-framework-asset';
  if (isWebhookRoute(pathname)) return 'webhook';
  if (isAuthBootstrapRoute(pathname)) return 'auth-callback-recovery';
  if (isInvitationRoute(pathname)) return 'invitation';
  if (isPublicStudentRoute(pathname)) return 'public-tenant-catalog';
  if (isPublicRoute(pathname)) return 'public-non-tenant';
  if (/^\/c\/[^/]+\/student(?:\/|$)/.test(pathname)) return 'authenticated-student';
  if (pathname.startsWith('/api')) return 'api';
  return 'protected-page';
}

function continueWithSanitizedHeaders(request: NextRequest) {
  const sanitizedHeaders = new Headers(request.headers);
  stripAuthContextHeaders(sanitizedHeaders);
  return NextResponse.next({ request: { headers: sanitizedHeaders } });
}

function validateStudentClaimsForRoute(claims: ClaimsData, pathname: string): StudentClaimValidation {
  const payload = claims.claims;
  if (!payload?.sub) return { status: 'anonymous' };

  const appMeta = payload.app_metadata as Record<string, unknown> | undefined;
  const values = {
    userId: payload.sub,
    studentId: appMeta?.student_id,
    membershipId: appMeta?.membership_id,
    collegeId: appMeta?.college_id,
    claimSlug: appMeta?.college_slug,
    role: appMeta?.college_role,
  };

  const hasAnyStudentTuple = Boolean(
    values.studentId || values.membershipId || values.collegeId || values.claimSlug || values.role,
  );

  if (!hasAnyStudentTuple) return { status: 'incomplete' };

  if (
    values.role !== 'student' ||
    typeof values.userId !== 'string' || !UUID_REGEX.test(values.userId) ||
    typeof values.studentId !== 'string' || !UUID_REGEX.test(values.studentId) ||
    typeof values.membershipId !== 'string' || !UUID_REGEX.test(values.membershipId) ||
    typeof values.collegeId !== 'string' || !UUID_REGEX.test(values.collegeId) ||
    typeof values.claimSlug !== 'string' || !values.claimSlug.trim()
  ) {
    return { status: 'malformed' };
  }

  const routeSlug = extractRouteCollegeSlug(pathname);
  const claimSlug = normalizeCollegeSlug(values.claimSlug);
  if (routeSlug && routeSlug !== claimSlug) return { status: 'mismatch' };

  return { status: 'complete', routeSlug, claimSlug };
}

interface ClaimsData {
  claims: Record<string, unknown>;
}

/**
 * Set all auth context headers from verified JWT claims onto sanitized request headers.
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
    setRequestAuthHeader(requestHeaders, 'x-global-role', '');
    setRequestAuthHeader(requestHeaders, 'x-college-role', '');
    setRequestAuthHeader(requestHeaders, 'x-college-id', '');
    setRequestAuthHeader(requestHeaders, 'x-student-id', '');
    setRequestAuthHeader(requestHeaders, 'x-membership-id', '');
    setRequestAuthHeader(requestHeaders, 'x-user-fullname', '');
    setRequestAuthHeader(requestHeaders, 'x-route-college-slug', '');
    setRequestAuthHeader(requestHeaders, 'x-claim-college-slug', '');
    setRequestAuthHeader(requestHeaders, 'x-auth-source', authSource ?? '');
    return;
  }

  const appMeta = payload.app_metadata as Record<string, unknown> | undefined;
  const userMeta = payload.user_metadata as Record<string, unknown> | undefined;

  setRequestAuthHeader(requestHeaders, 'x-user-id', payload.sub as string);
  setRequestAuthHeader(requestHeaders, 'x-user-email', payload.email as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-global-role', appMeta?.global_role as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-college-role', appMeta?.college_role as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-college-id', appMeta?.college_id as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-student-id', appMeta?.student_id as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-membership-id', appMeta?.membership_id as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-user-fullname', userMeta?.full_name as string | undefined);
  setRequestAuthHeader(requestHeaders, 'x-claim-college-slug', appMeta?.college_slug as string | undefined);

  if (pathname) {
    const routeSlug = extractRouteCollegeSlug(pathname);
    setRequestAuthHeader(requestHeaders, 'x-route-college-slug', routeSlug);
  } else {
    setRequestAuthHeader(requestHeaders, 'x-route-college-slug', '');
  }

  setRequestAuthHeader(requestHeaders, 'x-auth-source', authSource ?? '');
}

function isAuthBootstrapRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/set-password') ||
    pathname === '/api/auth/password-login' ||
    /^\/c\/[^/]+\/student\/login(?:\/|$)/.test(pathname) ||
    /^\/c\/[^/]+\/student\/auth\/callback/.test(pathname) ||
    /^\/c\/[^/]+\/student\/forgot-password/.test(pathname) ||
    /^\/c\/[^/]+\/student\/reset-password/.test(pathname)
  );
}

function isApiRouteThatUsesAuthContext(pathname: string): boolean {
  return (
    pathname === '/api/me' ||
    pathname === '/api/my-student-tenant' ||
    pathname === '/api/check-student-access' ||
    pathname === '/api/student/streak' ||
    pathname === '/api/invite-status' ||
    pathname === '/api/complete-invite' ||
    pathname === '/api/paid-mentorship/create-order' ||
    pathname === '/api/paid-mentorship/reschedule' ||
    pathname === '/api/paid-mentorship/verify-payment' ||
    pathname === '/api/integrations/github/connect' ||
    pathname === '/api/integrations/github/disconnect' ||
    pathname.startsWith('/api/analytics/student/') ||
    pathname.startsWith('/api/analytics/admin/') ||
    pathname.startsWith('/api/video-analytics/') ||
    pathname.startsWith('/api/notes/pages/') ||
    pathname === '/api/lms/invoices/download'
  );
}

function isPublicCodingProfileRoute(pathname: string): boolean {
  return /^\/u\/[^/]+\/?$/.test(pathname);
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/set-password') ||
    pathname.startsWith('/invite/accept') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/auth/unsubscribe') ||
    pathname.startsWith('/campus-ambassador') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/cookies') ||
    pathname.startsWith('/refund-policy') ||
    pathname.startsWith('/cancellation-policy') ||
    /^\/c\/[^/]+\/student\/login/.test(pathname) ||
    /^\/c\/[^/]+\/student\/auth\/callback/.test(pathname) ||
    /^\/c\/[^/]+\/student\/forgot-password/.test(pathname) ||
    /^\/c\/[^/]+\/student\/reset-password/.test(pathname) ||
    pathname === '/' ||
    isPublicCodingProfileRoute(pathname) ||
    isPublicStudentRoute(pathname)
  );
}

function getUnauthenticatedRedirectUrl(
  _pathname: string,
  requestUrl: NextRequest['nextUrl'],
): NextRequest['nextUrl'] {
  const url = requestUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return url;
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

const CACHEABLE_ROUTES: Record<string, { maxAge: number; staleWhileRevalidate: number }> = {
  '/student/my-courses': { maxAge: 30, staleWhileRevalidate: 300 },
};

function applyCacheHeaders(response: NextResponse, pathname: string) {
  for (const [segment, config] of Object.entries(CACHEABLE_ROUTES)) {
    if (pathname.includes(segment)) {
      response.headers.set(
        'Cache-Control',
        `private, max-age=${config.maxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`,
      );
      break;
    }
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const routeClass = classifyRoute(pathname);

  if (
    routeClass === 'static-framework-asset' ||
    routeClass === 'webhook' ||
    routeClass === 'auth-callback-recovery' ||
    routeClass === 'invitation'
  ) {
    logProxyAuth(pathname, routeClass, 'none');
    return continueWithSanitizedHeaders(request);
  }

  // Redirect legacy /our-team to the authenticated student route.
  if (pathname.startsWith('/our-team')) {
    const url = request.nextUrl.clone();
    url.pathname = '/c/direct-learners/student/our-team';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (routeClass === 'public-tenant-catalog' || routeClass === 'public-non-tenant') {
    if (!hasAuthCookie(request)) {
      // SECURITY: Strip any client-provided auth context headers before passing through.
      // No cookie means zero auth work.
      logProxyAuth(pathname, routeClass, 'none');
      return continueWithSanitizedHeaders(request);
    }
    const { supabase, requestHeaders, buildResponse } = createMiddlewareClient(request);
    try {
      const claims = await getClaimsWithTimeout(supabase);
      if (claims?.claims?.sub) {
        applyClaimsHeaders(requestHeaders, claims, pathname, 'claims');
        logProxyAuth(pathname, routeClass, 'claims');
        if (DEBUG_HEADERS_ENABLED) {
          console.log('[auth-audit] LMS public claims path', pathname, 'userId=', claims.claims.sub);
        }
      } else {
        logProxyAuth(pathname, routeClass, 'none');
      }
    } catch {
      // Timeout or error — pass through without headers (claims failure renders anonymous context)
      logProxyAuth(pathname, routeClass, 'none');
    }
    const resp = buildResponse();
    applyCacheHeaders(resp, pathname);
    return resp;
  }

  if (routeClass === 'api') {
    if (!hasAuthCookie(request) || !isApiRouteThatUsesAuthContext(pathname)) {
      logProxyAuth(pathname, routeClass, 'none');
      return continueWithSanitizedHeaders(request);
    }

    const { supabase, requestHeaders, buildResponse } = createMiddlewareClient(request);
    try {
      const claims = await getClaimsWithTimeout(supabase);
      if (claims?.claims?.sub) {
        applyClaimsHeaders(requestHeaders, claims, pathname, 'claims');
        logProxyAuth(pathname, routeClass, 'claims');
        if (DEBUG_HEADERS_ENABLED) {
          console.log('[auth-audit] LMS api claims path', pathname, 'userId=', claims.claims.sub);
        }
      } else {
        logProxyAuth(pathname, routeClass, 'none');
      }
    } catch {
      logProxyAuth(pathname, routeClass, 'none');
    }

    const resp = buildResponse();
    applyCacheHeaders(resp, pathname);
    return resp;
  }

  if (!hasAuthCookie(request)) {
    logProxyAuth(pathname, routeClass, 'none');
    return NextResponse.redirect(getUnauthenticatedRedirectUrl(pathname, request.nextUrl));
  }

  const { supabase, requestHeaders, buildResponse } = createMiddlewareClient(request);
  const isAuthenticatedStudentRoute = routeClass === 'authenticated-student';

  try {
    // Auth identity: verified JWT claims are the canonical protected-route boundary.
    // Normal page loads do NOT fall back to network getUser() calls.
    const claims = await getClaimsWithTimeout(supabase);
    if (claims?.claims?.sub) {
      const validation = isAuthenticatedStudentRoute
        ? validateStudentClaimsForRoute(claims, pathname)
        : { status: 'complete' as const, routeSlug: '', claimSlug: '' };
      if (isAuthenticatedStudentRoute) {
        if (validation.status === 'mismatch' || validation.status === 'malformed') {
          return new NextResponse('Forbidden', { status: 403 });
        }
        if (validation.status === 'anonymous') {
          return NextResponse.redirect(getUnauthenticatedRedirectUrl(pathname, request.nextUrl));
        }
      }
      if (isAuthenticatedStudentRoute && validation.status === 'incomplete') {
        applyClaimsHeaders(requestHeaders, claims, pathname, 'claims-incomplete');
        logProxyAuth(pathname, routeClass, 'claims-incomplete');
        const fallbackUserId = requestHeaders.get('x-user-id');
        if (!fallbackUserId) {
          return NextResponse.redirect(getUnauthenticatedRedirectUrl(pathname, request.nextUrl));
        }
        const response = buildResponse();
        applyCacheHeaders(response, pathname);
        return response;
      }
      applyClaimsHeaders(requestHeaders, claims, pathname, 'claims');
      logProxyAuth(pathname, routeClass, 'claims');
      if (DEBUG_HEADERS_ENABLED) {
        console.log('[auth-audit] LMS protected claims path', pathname, 'userId=', claims.claims?.sub);
      }
    } else {
      logProxyAuth(pathname, routeClass, 'none');
      return NextResponse.redirect(getUnauthenticatedRedirectUrl(pathname, request.nextUrl));
    }

    const userId = requestHeaders.get('x-user-id');
    if (!userId) {
      return NextResponse.redirect(getUnauthenticatedRedirectUrl(pathname, request.nextUrl));
    }
  } catch {
    const url = getUnauthenticatedRedirectUrl(pathname, request.nextUrl);
    // A timeout or transient Auth/JWKS failure must not destroy a valid refresh
    // session. Redirect for this request and let the next request retry/refresh.
    return NextResponse.redirect(url);
  }

  const response = buildResponse();
  applyCacheHeaders(response, pathname);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|eot|mp[34]|webm|ogg|wav|pdf)$).*)',
  ],
};

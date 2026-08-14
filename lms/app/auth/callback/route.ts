import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getPortalBaseUrl } from '@/lib/auth/app-url';
import { resolveLoginRouteContext } from '@/lib/auth/login-route-context';
import { ensureDirectLearnerStudent } from '@/lib/services/direct-learners';
import { directLearnerStudentExists } from '@/lib/lms/transactional-email/direct-learner-provisioning';
import { maybeQueueGoogleWelcomeEmail } from '@/lib/lms/transactional-email/google-welcome';
import { oauthExchangeFailureCode } from '@/lib/auth/oauth-exchange-error';
import { logOAuthCallbackDiagnostics } from '@/lib/auth/oauth-callback-diagnostics';
import { consumeRateLimit, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limit';
import {
  createRouteHandlerClient,
  hasPkceVerifierCookie,
} from '@/lib/supabase/route-handler';

const AUTH_CALLBACK_RATE_LIMIT = 20;
const AUTH_CALLBACK_WINDOW_MS = 60 * 1000;

import {
  isCollegeAdminPasswordResetPath,
} from '@/lib/auth/college-admin-auth-urls';

const ALLOWED_REDIRECT_PATHS = new Set([
  '/dashboard',
  '/login',
  '/reset-password',
  '/set-password',
  '/auth/set-password',
]);

function isAllowedRedirect(path: string): boolean {
  if (!path.startsWith('/')) return false;
  const normalizedPath = path.split('?')[0].replace(/\/+$/, '');
  if (ALLOWED_REDIRECT_PATHS.has(normalizedPath)) return true;
  if (normalizedPath.startsWith('/c/') && normalizedPath.includes('/student')) return true;
  if (normalizedPath.startsWith('/c/') && normalizedPath.includes('/admin')) return true;
  return false;
}

/** OAuth code exchange runs in GET; session cookies and redirects are the intended response. */
export async function GET(request: NextRequest) {
  const reqUrl = request.nextUrl;
  const base = reqUrl.origin.replace(/\/+$/, '');
  const clientIp = getRequestIp(request);

  const limited = await consumeRateLimit({
    key: `auth_callback:${clientIp}`,
    limit: AUTH_CALLBACK_RATE_LIMIT,
    windowMs: AUTH_CALLBACK_WINDOW_MS,
    failClosed: true,
  });
  if (!limited.ok) {
    return rateLimitResponse('Too many auth requests', limited, AUTH_CALLBACK_RATE_LIMIT);
  }

  const { searchParams } = reqUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  const { supabase, commitAuthCookies, applyCookiesToResponse, getPendingCookieCount } =
    createRouteHandlerClient(request);

  const redirectWithSession = (path: string) => {
    const response = NextResponse.redirect(new URL(path, base));
    applyCookiesToResponse(response);
    return response;
  };

  let authenticatedUser: User | null = null;

  if (code) {
    logOAuthCallbackDiagnostics('auth/callback', request, {
      codePresent: true,
      redirectToHint: next,
    });

    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.warn('[auth/callback] exchange failed', {
        message: exchangeError.message,
        pkceCookiePresent: hasPkceVerifierCookie(request),
      });
      const exchangeCode = oauthExchangeFailureCode(exchangeError);
      if (next && isCollegeAdminPasswordResetPath(next)) {
        return redirectWithSession('/reset-password?error=expired');
      }
      return redirectWithSession(`/login?error=${exchangeCode}`);
    }

    await commitAuthCookies();
    authenticatedUser = exchangeData.user ?? null;
    console.warn('[auth/callback] session cookies committed', {
      cookieCount: getPendingCookieCount(),
      userPresent: Boolean(authenticatedUser),
    });

    if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
      console.log(`[auth-diagnostics] oauth-callback: userId=${authenticatedUser?.id ?? 'unknown'}, next=${next}`);
    }

    if (next && isAllowedRedirect(next)) {
      console.warn('[auth/callback] redirect', { path: next, reason: 'safe_next' });
      return redirectWithSession(next);
    }
  }

  const user =
    authenticatedUser ??
    (await supabase.auth.getUser()).data.user;
  if (!user) {
    console.warn('[auth/callback] no user after exchange');
    return redirectWithSession('/login?error=session');
  }

  let routeContext;
  try {
    routeContext = await resolveLoginRouteContext(user.id, supabase);
  } catch (err) {
    console.warn('[auth/callback] resolveLoginRouteContext failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return redirectWithSession('/login?error=session');
  }

  if (routeContext?.profile_is_active === false) {
    return redirectWithSession('/login?error=account_disabled');
  }

  const superadminBase = getPortalBaseUrl('superadmin', base);
  if (routeContext?.profile_global_role === 'superadmin') {
    return redirectWithSession(`${superadminBase}/dashboard`);
  }

  if (routeContext?.admin_college_slug) {
    const collegeBase = getPortalBaseUrl('college_admin', base);
    return redirectWithSession(
      `${collegeBase}/c/${encodeURIComponent(routeContext.admin_college_slug)}/admin/dashboard`,
    );
  }

  const studentBase = getPortalBaseUrl('student', base);
  if (routeContext?.student_college_slug) {
    if (!routeContext.student_id && routeContext.student_college_id) {
      const { error: studentUpsertError } = await supabase.from('students').upsert(
        {
          user_id: user.id,
          college_id: routeContext.student_college_id,
        },
        { onConflict: 'user_id,college_id' },
      );
      if (studentUpsertError) {
        return redirectWithSession('/login?error=session');
      }
    }

    return redirectWithSession(
      `${studentBase}/c/${encodeURIComponent(routeContext.student_college_slug)}/student`,
    );
  }

  try {
    const hadDirectLearnerStudent = await directLearnerStudentExists(user.id);
    const tenant = await ensureDirectLearnerStudent(user.id);
    const dashboardUrl = `${studentBase}/c/${encodeURIComponent(tenant.slug)}/student`;
    void maybeQueueGoogleWelcomeEmail({
      user,
      dashboardUrl,
      isNewStudentProvisioning: !hadDirectLearnerStudent,
    });
    return redirectWithSession(dashboardUrl);
  } catch (err) {
    console.error('[auth/callback] ensureDirectLearnerStudent failed:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.message === 'partnered_student_exists') {
      return redirectWithSession('/login?error=no_access');
    }
    const errorMsg = err instanceof Error ? err.message : 'no_access';
    return redirectWithSession(`/login?error=${encodeURIComponent(errorMsg)}`);
  }
}

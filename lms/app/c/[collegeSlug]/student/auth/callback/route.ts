import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getPortalBaseUrl } from "@/lib/auth/app-url";
import { oauthExchangeFailureCode } from "@/lib/auth/oauth-exchange-error";
import { logOAuthCallbackDiagnostics } from "@/lib/auth/oauth-callback-diagnostics";
import { getSafeNext } from "@/lib/auth/safe-next";
import {
  isStudentPasswordResetPath,
  studentPortalBasePath,
} from "@/lib/auth/student-auth-urls";
import { syncProfile } from "@/lib/auth/profile-sync";
import {
  createRouteHandlerClient,
  hasPkceVerifierCookie,
} from "@/lib/supabase/route-handler";

/**
 * Auth callback for college-specific student login.
 * Validates user + student membership, redirects to student home or safe next path.
 * Supabase session is the only source of truth - no custom JWT needed.
 */
/** OAuth code exchange runs in GET; session cookies and redirects are the intended response. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collegeSlug: string }> },
) {
  const { collegeSlug } = await params;
  const base = request.nextUrl.origin;
  const normalizedSlug = collegeSlug.trim().toLowerCase();
  const loginUrl = `/c/${encodeURIComponent(collegeSlug)}/student/login`;
  const defaultHome = studentPortalBasePath(collegeSlug);

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const safeNext = getSafeNext(rawNext, defaultHome);

  const { supabase, commitAuthCookies, applyCookiesToResponse, getPendingCookieCount } =
    createRouteHandlerClient(request);

  const redirectWithSession = (path: string) => {
    const response = NextResponse.redirect(new URL(path, base));
    applyCookiesToResponse(response);
    return response;
  };

  logOAuthCallbackDiagnostics('student-auth-callback', request, {
    codePresent: Boolean(code),
    redirectToHint: safeNext,
  });

  if (!code) {
    console.warn("[student-auth-callback] missing code, redirecting to login?error=session");
    return NextResponse.redirect(new URL(`${loginUrl}?error=session`, base));
  }

  const { error: exchangeError, data: exchangeData } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.warn("[student-auth-callback] exchange failed", {
      message: exchangeError.message,
      pkceCookiePresent: hasPkceVerifierCookie(request),
    });
    const errorParam = oauthExchangeFailureCode(exchangeError);
    if (isStudentPasswordResetPath(safeNext, collegeSlug)) {
      return redirectWithSession(`${safeNext}?error=expired`);
    }
    return redirectWithSession(`${loginUrl}?error=${errorParam}`);
  }

  await commitAuthCookies();
  console.warn("[student-auth-callback] session cookies committed", {
    cookieCount: getPendingCookieCount(),
    userPresent: Boolean(exchangeData.user),
  });

  const user: User | null =
    exchangeData.user ??
    (await supabase.auth.getUser()).data.user;

  if (!user) {
    console.warn("[student-auth-callback] getUser failed", {
      message: "no user after exchange",
    });
    return redirectWithSession(`${loginUrl}?error=session`);
  }

  if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
    console.log(`[auth-diagnostics] oauth-callback: userId=${user.id}, collegeSlug=${normalizedSlug}`);
  }

  if (isStudentPasswordResetPath(safeNext, collegeSlug)) {
    console.warn("[student-auth-callback] redirect", { path: safeNext, reason: "password_reset" });
    return redirectWithSession(safeNext);
  }

  const [resolvedResult, profileResult] = await Promise.all([
    supabase
      .rpc('resolve_student_auth_context', {
        p_user_id: user.id,
        p_slug: normalizedSlug,
      })
      .single(),
    supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const resolved = resolvedResult.data as {
    allowed: boolean;
    error_code: string | null;
    membership_id: string | null;
    membership_status: string | null;
    student_id: string | null;
    college_id: string | null;
    college_slug: string | null;
  } | null;

  if (!resolved || !resolved.college_id) {
    return redirectWithSession(`${loginUrl}?error=tenant`);
  }

  if (profileResult.data?.global_role === "superadmin") {
    const superadminBase = getPortalBaseUrl("superadmin", base);
    return redirectWithSession(`${superadminBase}/dashboard`);
  }

  const collegeId = resolved.college_id;
  const resolvedSlug = resolved.college_slug ?? normalizedSlug;

  if (resolved.allowed && resolved.membership_id) {
    const isNewCollegeStudent = !resolved.student_id;
    if (isNewCollegeStudent) {
      await Promise.all([
        supabase.from("students").insert({
          user_id: user.id,
          college_id: collegeId,
        }),
        syncProfile(user, supabase),
      ]);
    } else {
      await syncProfile(user, supabase);
    }

    if (isNewCollegeStudent) {
      const { maybeQueueGoogleWelcomeEmail } = await import('@/lib/lms/transactional-email/google-welcome');
      void maybeQueueGoogleWelcomeEmail({
        user,
        dashboardUrl: `${base}/c/${encodeURIComponent(resolvedSlug)}/student`,
        isNewStudentProvisioning: true,
      });
    }

    console.warn("[student-auth-callback] redirect", { path: safeNext, reason: "student_home" });
    return redirectWithSession(safeNext);
  }

  if (resolved.error_code === 'account_disabled') {
    return redirectWithSession(`${loginUrl}?error=account_disabled`);
  }

  const { data: adminMemberships } = await supabase
    .from("college_memberships")
    .select("id, college_id, status, role")
    .eq("user_id", user.id)
    .in("role", ["college_admin", "faculty_spoc", "mentor"])
    .in("status", ["active", "invited"])
    .limit(10);
  const adminMembership =
    adminMemberships?.find((m) => m.college_id === collegeId) ??
    adminMemberships?.[0];
  if (adminMembership) {
    if (adminMembership.status === "invited") {
      await supabase
        .from("college_memberships")
        .update({ status: "active" })
        .eq("id", adminMembership.id)
        .eq("user_id", user.id)
        .eq("status", "invited");
    }
    const { data: adminCollege } = await supabase
      .from("colleges")
      .select("slug")
      .eq("id", adminMembership.college_id)
      .eq("status", "active")
      .maybeSingle();
    if (adminCollege?.slug) {
      const collegeBase = getPortalBaseUrl("college_admin", base);
      return redirectWithSession(
        `${collegeBase}/c/${encodeURIComponent(adminCollege.slug)}/admin/dashboard`,
      );
    }
  }
  return redirectWithSession(`${loginUrl}?error=no_access&redirected=1`);
}

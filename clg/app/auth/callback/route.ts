import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortalBaseUrl } from "@/lib/auth/app-url";
import { consumeRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { after } from "next/server";

const AUTH_CALLBACK_RATE_LIMIT = 20;
const AUTH_CALLBACK_WINDOW_MS = 60 * 1000;
const ADMIN_ROLES = ["college_admin", "faculty_spoc", "mentor"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const base = new URL(request.url).origin.replace(/\/+$/, "");
  const searchParams = new URL(request.url).searchParams;
  const slug = searchParams.get("slug")?.trim() || null;
  const portalHint = searchParams.get("portal");
  const code = searchParams.get("code");
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

  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(new URL("/login?error=session", base));
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL("/login?error=session", base));
  }

  const [profileResult, studentMembershipsResult, adminMembershipsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("is_active, global_role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("college_memberships")
        .select("id, college_id, status")
        .eq("user_id", user.id)
        .eq("role", "student")
        .in("status", ["active", "invited"])
        .order("created_at", { ascending: true })
        .limit(10),
      supabase
        .from("college_memberships")
        .select("id, college_id, role, status")
        .eq("user_id", user.id)
        .in("role", ADMIN_ROLES)
        .in("status", ["active", "invited"])
        .order("created_at", { ascending: true })
        .limit(10),
    ]);

  if (profileResult.data?.is_active === false) {
    return NextResponse.redirect(
      new URL("/login?error=account_disabled", base),
    );
  }

  const superadminBase = getPortalBaseUrl("superadmin", base);
  if (profileResult.data?.global_role === "superadmin") {
    return NextResponse.redirect(`${superadminBase}/dashboard`);
  }

  const requestedSlug = slug?.toLowerCase() ?? null;
  let adminMembership = adminMembershipsResult.data?.[0] ?? null;
  if (requestedSlug) {
    const { data: requestedCollege } = await supabase
      .from("colleges")
      .select("id")
      .ilike("slug", requestedSlug)
      .eq("status", "active")
      .maybeSingle();
    if (requestedCollege) {
      adminMembership =
        adminMembershipsResult.data?.find(
          (m) => m.college_id === requestedCollege.id,
        ) ?? adminMembership;
    }
  }

  if (adminMembership) {
    if (adminMembership.status === "invited") {
      after(async () => {
        await supabase
          .from("college_memberships")
          .update({ status: "active" })
          .eq("id", adminMembership.id)
          .eq("user_id", user.id)
          .eq("status", "invited");
      });
    }
    const { data: college } = await supabase
      .from("colleges")
      .select("slug")
      .eq("id", adminMembership.college_id)
      .eq("status", "active")
      .maybeSingle();
    if (college?.slug) {
      const collegeBase = getPortalBaseUrl("college_admin", base);
      return NextResponse.redirect(
        `${collegeBase}/c/${encodeURIComponent(college.slug)}/admin/dashboard`,
      );
    }
  }

  const studentMembership = studentMembershipsResult.data?.[0] ?? null;
  if (studentMembership) {
    if (studentMembership.status === "invited") {
      after(async () => {
        await supabase
          .from("college_memberships")
          .update({ status: "active" })
          .eq("id", studentMembership.id)
          .eq("user_id", user.id)
          .eq("status", "invited");
      });
    }
    const { data: studentCollege } = await supabase
      .from("colleges")
      .select("slug")
      .eq("id", studentMembership.college_id)
      .eq("status", "active")
      .maybeSingle();
    if (studentCollege?.slug) {
      const lmsBase = getPortalBaseUrl("student", base);
      return NextResponse.redirect(
        `${lmsBase}/c/${encodeURIComponent(studentCollege.slug)}/student`,
      );
    }
  }

  const redirected =
    portalHint && portalHint !== "college_admin" ? "&redirected=1" : "";
  const loginPath = requestedSlug
    ? `/c/${encodeURIComponent(requestedSlug)}/admin/login?error=no_college_access${redirected}`
    : `/login?error=no_college_access${redirected}`;
  return NextResponse.redirect(new URL(loginPath, base));
}

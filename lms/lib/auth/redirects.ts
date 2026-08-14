import "server-only";
import { redirect } from "next/navigation";
import { getVerifiedIdentity } from "@/lib/student-runtime/identity";
import { resolveLoginRouteContext } from "@/lib/auth/login-route-context";
import { ensureDirectLearnerStudent } from "@/lib/services/direct-learners";

export type RedirectReason =
  | "unauthenticated"
  | "wrong_portal"
  | "no_membership"
  | "invalid_tenant"
  | "inactive_account"
  | "not_authorized";

/**
 * Redirect authenticated student to their first tenant dashboard.
 * Use on root page or when student needs to be routed to their college.
 *
 * Membership policy: Accepts both 'active' and 'invited' memberships.
 * Auto-activation happens in requireStudent() guard, NOT here - this is a redirect helper only.
 *
 * When there is no student membership, calls `ensureDirectLearnerStudent` to provision the B2C
 * direct-learner tenant + `non_partnered_students` (not the legacy `unknown` college).
 */
export async function redirectToStudentTenant(
  subPath: string = "",
): Promise<never> {
  const identity = await getVerifiedIdentity();

  if (!identity?.userId) {
    redirect("/login");
  }

  const context = await resolveLoginRouteContext(identity.userId);

  if (context?.profile_is_active === false) {
    redirect("/login");
  }

  if (context?.profile_global_role === 'superadmin' || context?.admin_college_slug) {
    redirect("/unauthorized?reason=wrong_portal");
  }

  if (context?.student_college_slug) {
    redirect(`/c/${context.student_college_slug}/student${subPath ? `/${subPath}` : ""}`);
  }

  if (!context?.student_membership_id) {
    let tenant;
    let redirectOnFail;
    try {
      tenant = await ensureDirectLearnerStudent(identity.userId);
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e) throw e;
      console.error("[redirects] auto-provision failed", e instanceof Error ? e.message : String(e));
      redirectOnFail = true;
    }
    if (redirectOnFail) redirect("/unauthorized?reason=no_membership");
    redirect(`/c/${tenant!.slug}/student${subPath ? `/${subPath}` : ""}`);
  }
  redirect("/unauthorized?reason=invalid_tenant");
}





"use server";

/**
 * Legacy **unknown-college** migration only (`colleges.slug = 'unknown'`).
 *
 * - Moves the student from the internal `unknown` tenant to a **real partner** `colleges` row by name match;
 *   this is not the same as B2C **direct learner** provisioning (`direct-learners` / `non_partnered_students`).
 * - New B2C signups must **never** rely on this path; they use `ensureDirectLearnerStudent` and self-reported
 *   school metadata only (no new `colleges` rows from student typing).
 *
 * For B2C self-reported school (metadata only), see `updateNonPartneredStudentCollege`.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAuth } from "@/lib/auth/require-student-action";

/*
 * This module uses createAdminClient (service role) to bypass RLS because
 * application-level auth checks (requireAuth) are enforced before each operation.
 * RLS is not relied upon for authorization here.
 */
 
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";

/** Strip characters that would act as SQL LIKE wildcards in ilike patterns. */
function sanitizeForLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "").trim();
}

/**
 * Move the current user from the **legacy unknown** tenant to another **existing partner** college,
 * resolved by **name** (typed manually). Prefers an exact case-insensitive name match; if several
 * rows match a partial search, the user must enter the full official name.
 */
export async function changeCollegeFromUnknown(collegeName: string) {
  const authContext = await requireAuth('unknown');
  if (!authContext) {
    return { error: "You do not have access to the unknown college." };
  }
  const userId = authContext.user.id;

  const trimmed = collegeName.trim();
  if (trimmed.length < 2) {
    return { error: "Enter your full college name." };
  }

  const limited = await consumeRateLimit({
    key: `change-college:${userId}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!limited.ok) return { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

  after(() => console.log(`[change-college] User ${userId.slice(0, 8)}... attempting college change`));

  const admin = createAdminClient();

  const { data: unknownCollege, error: unknownErr } = await admin
    .from("colleges")
    .select("id")
    .eq("slug", "unknown")
    .eq("status", "active")
    .maybeSingle();

  if (unknownErr || !unknownCollege?.id) {
    after(() => console.error('[change-college] Unknown college fetch failed:', unknownErr?.code ?? 'not found'));
    return { error: "Unknown college is not configured." };
  }

  const safePattern = sanitizeForLikePattern(trimmed);
  if (safePattern.length < 2) {
    return { error: "Enter a valid college name." };
  }

  const { data: rows, error: listErr } = await admin
    .from("colleges")
    .select("id, slug, name")
    .eq("status", "active")
    .neq("slug", "unknown")
    .ilike("name", `%${safePattern}%`);

  if (listErr) {
    after(() => console.error(`[change-college] list by name error:`, listErr.code ?? 'unknown'));
    return { error: "Could not look up colleges. Try again." };
  }

  const candidates = rows ?? [];

  const exact = candidates.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  let targetCollege: { id: string; slug: string; name: string } | null = null;
  
  if (exact) {
    targetCollege = exact;
  } else if (candidates.length === 1) {
    targetCollege = candidates[0];
  }

  // If we found a real tenant, execute the tenant migration
  if (targetCollege) {
    if (targetCollege.id === unknownCollege.id) {
      return { error: "Choose a different college." };
    }

    const { data: membership } = await admin
      .from("college_memberships")
      .select("id, role, status")
      .eq("user_id", userId)
      .eq("college_id", unknownCollege.id)
      .eq("role", "student")
      .in("status", ["active", "invited"])
      .maybeSingle();

    if (!membership?.id) {
      after(() => console.log(`[change-college] Membership not found for user ${userId.slice(0, 8)}...`));
      return { error: "You are not registered under Unknown college." };
    }

    const { error: memUpsertErr } = await admin.from("college_memberships").upsert(
      {
        user_id: userId,
        college_id: targetCollege.id,
        role: membership.role || 'student',
        status: membership.status || 'active',
      },
      { onConflict: "user_id,college_id" }
    );

    if (memUpsertErr) {
      after(() => console.error("[change-college] membership upsert failed", memUpsertErr.code ?? 'unknown'));
      return { error: "Could not update your college membership." };
    }

    await admin
      .from("college_memberships")
      .delete()
      .eq("id", membership.id);

    const { error: stuUpsertErr } = await admin.from("students").upsert(
      {
        user_id: userId,
        college_id: targetCollege.id,
      },
      { onConflict: "user_id,college_id" }
    );

    if (stuUpsertErr) {
      after(() => console.error("[change-college] student upsert failed", stuUpsertErr.code ?? 'unknown'));
      return { error: "Could not provision your student record in the new college." };
    }

    const { error: stuDelErr } = await admin
      .from("students")
      .delete()
      .eq("user_id", userId)
      .eq("college_id", unknownCollege.id);

    if (stuDelErr) {
      after(() => console.warn("[change-college] could not delete old unknown student record", stuDelErr.code ?? 'unknown'));
    }

    revalidatePath(`/c/unknown`, "layout");
    revalidatePath(`/c/${encodeURIComponent(targetCollege.slug)}`, "layout");
    redirect(`/c/${encodeURIComponent(targetCollege.slug)}/student/profile?college_updated=1`);
  } 
  
  // Custom fallback: Save the entered string as a custom college name
  const { error: customUpdateErr } = await admin
    .from("students")
    .upsert(
      { 
        user_id: userId,
        college_id: unknownCollege.id,
        custom_college_name: trimmed 
      },
      { onConflict: "user_id,college_id" }
    );
    
  if (customUpdateErr) {
    after(() => console.error("[change-college] Failed to save custom college name", customUpdateErr.code ?? 'unknown'));
    return { error: "Could not save your custom college name." };
  }
  
  // Custom names stay in the unknown college tenant
  revalidatePath(`/c/unknown`, "layout");
  redirect(`/c/unknown/student/profile?college_updated=1`);
}

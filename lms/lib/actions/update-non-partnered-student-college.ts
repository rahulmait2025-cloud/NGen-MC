'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/require-student-action';

/*
 * This module uses createAdminClient (service role) to bypass RLS because
 * application-level auth checks (requireAuth) are enforced before each operation.
 * RLS is not relied upon for authorization here.
 */
 
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { isDirectLearnerCollegeSlug } from '@/lib/tenant/direct-learner-slug';

const selfReportedCollegeNameSchema = z
  .string()
  .trim()
  .min(2, 'Enter at least 2 characters.')
  .max(200, 'College name is too long (max 200 characters).')
  .refine((v) => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v), {
    message: 'Remove invalid characters from the college name.',
  });

function normalizeCollegeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Save self-reported school name for B2C / direct-learner students (`non_partnered_students`).
 * **Metadata only:** does not create `colleges` rows, does not change B2B/B2C catalog visibility
 * (visibility is assignment-driven for B2B and `global_courses.audience_scope` for B2C), and does not
 * change which login portal the user uses.
 */
export async function updateNonPartneredStudentCollege(
  collegeSlug: string,
  selfReportedCollegeName: string
): Promise<{ ok?: true; error?: string }> {
  const slug = collegeSlug.trim();
  if (!isDirectLearnerCollegeSlug(slug)) {
    return { error: 'This action is only available on the direct learner account.' };
  }

  const ctx = await requireAuth(slug);
  if (!ctx) {
    return { error: 'You do not have access to this student account.' };
  }

  const parsed = selfReportedCollegeNameSchema.safeParse(selfReportedCollegeName);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid college name.' };
  }

  const name = normalizeCollegeName(parsed.data);
  if (name.length < 2) {
    return { error: 'Enter at least 2 characters.' };
  }

  const limited = await consumeRateLimit({
    key: `b2c-college-name:${ctx.user.id}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!limited.ok) {
    return { error: `Too many updates. Retry in ${limited.retryAfterSeconds}s.` };
  }

  const admin = createAdminClient();
  const userId = ctx.user.id;
  const studentId = ctx.studentId;

  const { data: existing, error: selErr } = await admin
    .from('non_partnered_students')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (selErr) {
    console.error('[b2c-college] select non_partnered_students', selErr.code);
    return { error: 'Could not save your college name. Try again.' };
  }

  if (!existing) {
    const { error: insErr } = await admin.from('non_partnered_students').insert({
      user_id: userId,
      student_id: studentId,
      status: 'active',
      self_reported_college_name: name,
    });
    if (insErr) {
      console.error('[b2c-college] insert non_partnered_students', insErr.code);
      return { error: 'Could not save your college name. Try again.' };
    }
  } else {
    const { error: upErr } = await admin
      .from('non_partnered_students')
      .update({ self_reported_college_name: name })
      .eq('user_id', userId);
    if (upErr) {
      console.error('[b2c-college] update non_partnered_students', upErr.code);
      return { error: 'Could not save your college name. Try again.' };
    }
  }

  revalidatePath(`/c/${encodeURIComponent(slug)}/student`, 'layout');
  revalidatePath(`/c/${encodeURIComponent(slug)}/student/profile`, 'page');
  return { ok: true };
}

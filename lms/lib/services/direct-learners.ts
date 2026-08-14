import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/*
 * This module uses createAdminClient (service role) to bypass RLS because
 * application-level auth checks are enforced at the calling sites.
 * RLS is not relied upon for authorization here.
 */
 
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Slugs treated as "not a partnered college" for `userHasPartneredStudentMembership`.
 * Includes legacy `unknown` and B2C `direct-learners` / `direct-learner`; new provisioning uses only the latter.
 */
const NON_PARTNERED_STUDENT_SLUGS = new Set(['direct-learners', 'direct-learner']);

export interface DirectLearnerTenant {
  collegeId: string;
  slug: string;
  membershipId?: string;
  studentId?: string;
}

/**
 * Resolves the canonical B2C direct-learner college row.
 * Prefers `direct-learners` (seeded in migration 00039), then `direct-learner`.
 * Never returns `unknown` - unknown is legacy-only and must not be used for new B2C provisioning.
 */
export async function getDirectLearnerTenant(): Promise<DirectLearnerTenant> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('colleges')
    .select('id, slug')
    .in('slug', ['direct-learners', 'direct-learner'])
    .eq('status', 'active');

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const preferred =
    rows.find((r) => r.slug?.toLowerCase() === 'direct-learners') ??
    rows.find((r) => r.slug?.toLowerCase() === 'direct-learner') ??
    null;

  if (!preferred?.id || !preferred.slug) {
    throw new Error('Direct learner tenant is not configured.');
  }

  return { collegeId: preferred.id, slug: preferred.slug };
}

async function userHasPartneredStudentMembership(
  admin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: mems, error: memErr } = await admin
    .from('college_memberships')
    .select('college_id')
    .eq('user_id', userId)
    .eq('role', 'student')
    .in('status', ['active', 'invited']);

  if (memErr) throw new Error(memErr.message);
  if (!mems?.length) return false;

  const collegeIds = [...new Set(mems.flatMap((m) => m.college_id ? [m.college_id] : []))];
  if (!collegeIds.length) return false;

  const { data: colleges, error: colErr } = await admin
    .from('colleges')
    .select('slug')
    .in('id', collegeIds)
    .eq('status', 'active');

  if (colErr) throw new Error(colErr.message);

  return (colleges ?? []).some((c) => {
    const s = (c.slug ?? '').toLowerCase();
    return s.length > 0 && !NON_PARTNERED_STUDENT_SLUGS.has(s);
  });
}

async function ensureNonPartneredStudentProfile(
  admin: SupabaseClient,
  userId: string,
  studentId: string
): Promise<void> {
  const { data: existing, error: selErr } = await admin
    .from('non_partnered_students')
    .select('id, student_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  if (!existing) {
    const { error: insErr } = await admin.from('non_partnered_students').insert({
      user_id: userId,
      student_id: studentId,
      status: 'active',
    });
    if (insErr && insErr.code !== '23505') throw new Error(insErr.message);
    return;
  }

  if (existing.student_id !== studentId) {
    const { error: upErr } = await admin
      .from('non_partnered_students')
      .update({ student_id: studentId })
      .eq('user_id', userId);
    if (upErr) throw new Error(upErr.message);
  }
}

/**
 * Idempotent B2C bootstrap: membership + student row on the direct-learner tenant + `non_partnered_students`.
 * Skips when the user already has an active student membership at a partnered (non-internal) college.
 * Does not remove legacy `unknown` memberships; login routing may still land those users on `/c/unknown` until they migrate.
 */
export async function ensureDirectLearnerStudent(userId: string): Promise<DirectLearnerTenant> {
  const admin = createAdminClient();

  if (await userHasPartneredStudentMembership(admin, userId)) {
    throw new Error('partnered_student_exists');
  }

  const [tenant, { data: authUser }] = await Promise.all([
    getDirectLearnerTenant(),
    admin.auth.admin.getUserById(userId),
  ]);
  if (!authUser?.user) {
    throw new Error('User not found.');
  }

  const allowedDomains = process.env.PROVISIONING_ALLOWED_DOMAINS;
  if (allowedDomains) {
    const domains = allowedDomains.split(',').flatMap((d) => {
      const trimmed = d.trim().toLowerCase();
      return trimmed ? [trimmed] : [];
    });
    const email = authUser.user.email ?? '';
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || !domains.includes(domain)) {
      throw new Error('not_authorized');
    }
  }

  const membershipResult = await admin.from('college_memberships').upsert(
    {
      user_id: userId,
      college_id: tenant.collegeId,
      role: 'student',
      status: 'active',
    },
    { onConflict: 'user_id,college_id' }
  );
  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }

  const studentResult = await admin.from('students').upsert(
    {
      user_id: userId,
      college_id: tenant.collegeId,
    },
    { onConflict: 'user_id,college_id' }
  );
  if (studentResult.error) {
    throw new Error(studentResult.error.message);
  }

  const { data: studentRow, error: studentSelErr } = await admin
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .eq('college_id', tenant.collegeId)
    .maybeSingle();

  if (studentSelErr) throw new Error(studentSelErr.message);
  if (!studentRow?.id) {
    throw new Error('Student record missing after upsert.');
  }

  await Promise.all([
    ensureNonPartneredStudentProfile(admin, userId, studentRow.id),
    admin.from('profiles').upsert(
      {
        id: userId,
        email: authUser.user.email ?? '',
        full_name: authUser.user.user_metadata?.full_name ?? authUser.user.user_metadata?.name ?? '',
        is_active: true,
      },
      { onConflict: 'id' }
    ),
  ]);

  const { data: memRow, error: memSelErr } = await admin
    .from('college_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('college_id', tenant.collegeId)
    .maybeSingle();

  if (memSelErr) throw new Error(memSelErr.message);

  return {
    collegeId: tenant.collegeId,
    slug: tenant.slug,
    membershipId: memRow?.id || '',
    studentId: studentRow.id,
  };
}

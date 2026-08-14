import 'server-only';
import { getStudentPortalBaseUrl } from '@/lib/auth/app-url';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
/* SECURITY: This module uses createAdminClient (service-role, bypasses RLS) intentionally.
 * All entry points call getSessionFromHeaders() first to enforce application-level
 * auth — only authenticated superadmins reach this code. RLS remains enabled on the
 * database as defense-in-depth. No client-side code imports this module (server-only).
 *
 * Role/status values written to college_memberships are SERVER-CONTROLLED constants
 * ('student' / 'active') never sourced from user input. CHECK constraints on the
 * table (migration 00244) enforce valid role values as defense-in-depth.
 * Do NOT expose this module to client bundles. */
import { createAdminClient } from '@/lib/supabase/admin';
import { sendTransactionalStudentInviteEmail } from '@/lib/services/student-invite-email';
import { generateStudentInvitePlainToken, hashStudentInviteToken } from '@/lib/services/student-invite-crypto';
import { getStudentInviteExpiryHours } from '@/lib/services/student-invite-expiry';
import { inspectEmailConfig } from '@/lib/email/config';
import { grantEntitlementsForNewStudent } from './content-assignments';
import type { CollegeWithCounts } from '@/lib/services/colleges';

export type InviteStudentResult = {
  user_id?: string;
  invite_id?: string;
  email_sent: boolean;
};

export interface InviteStudentInput {
  college_id: string;
  email: string;
  full_name: string;
  student_code?: string | null;
  cohort_id?: string | null;
  password?: string | null;
}

export interface UpdateStudentInput {
  college_id: string;
  student_id: string;
  email: string;
  full_name: string;
  student_code?: string | null;
}

const ALREADY_REGISTERED_PATTERNS = [
  'already been registered',
  'already registered',
  'user already exists',
  'already exists',
];

function isAlreadyRegisteredError(message: string): boolean {
  const lower = message.toLowerCase();
  return ALREADY_REGISTERED_PATTERNS.some((p) => lower.includes(p));
}

import { isDirectLearnerCollegeSlug } from '@/lib/colleges/direct-learner-slug';

export { isDirectLearnerCollegeSlug };

type NonPartneredSelectRow = { student_id: string; self_reported_college_name: string | null };

/**
 * If `public.non_partnered_students` is missing (migration 00056 not applied), PostgREST errors with a
 * schema-cache message. Return no rows so Superadmin still loads; apply `00056_b2c_non_partnered_students_foundation.sql` for B2C labels.
 */
function selectNonPartneredStudentsOrEmpty(result: {
  data: NonPartneredSelectRow[] | null;
  error: { message?: string } | null;
}): NonPartneredSelectRow[] {
  if (!result.error) return result.data ?? [];
  const msg = (result.error.message ?? '').toLowerCase();
  const tableMissing =
    msg.includes('non_partnered_students') &&
    (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('could not find'));
  if (tableMissing) {
    console.warn(
      '[superadmin/students] public.non_partnered_students is missing. Apply migration 00056_b2c_non_partnered_students_foundation.sql. B2C self-reported college names will be omitted until then.'
    );
    return [];
  }
  throw new Error(result.error.message);
}

/** Check if email has opted out of invite emails (same DB, table in LMS migrations). */
async function isUnsubscribed(admin: ReturnType<typeof createAdminClient>, email: string): Promise<boolean> {
  const { data } = await admin
    .from('email_unsubscribes')
    .select('email')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function revokePendingStudentInvitesForEmailCollege(
  admin: ReturnType<typeof createAdminClient>,
  collegeId: string,
  email: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const { error } = await admin
    .from('student_invites')
    .update({ status: 'revoked', revoked_at: now, updated_at: now })
    .eq('college_id', collegeId)
    .eq('email', normalized)
    .eq('status', 'pending')
    .is('revoked_at', null);
  if (error) throw new Error(error.message);
}

async function sendPendingStudentInviteEmail(opts: {
  plainToken: string;
  email: string;
  fullName: string;
  collegeName: string;
  category: 'student_invite' | 'student_invite_resend';
}): Promise<void> {
  const baseUrl = getStudentPortalBaseUrl();
  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_LMS_URL or NEXT_PUBLIC_LMS_APP_URL env.');
  }
  const inviteUrl = `${baseUrl.replace(/\/+$/, '')}/auth/set-password?token=${encodeURIComponent(opts.plainToken)}`;
  await sendTransactionalStudentInviteEmail({
    to: opts.email,
    fullName: opts.fullName,
    collegeName: opts.collegeName,
    inviteUrl,
    category: opts.category,
  });
}

/**
 * Invite without password: `student_invites` row + transactional email with custom token URL (no auth user yet).
 * Manual entry with password: creates auth user, profile, membership, and student immediately.
 */
export async function inviteStudent(input: InviteStudentInput): Promise<InviteStudentResult> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const actor = _auth!;
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const cohortId = input.cohort_id?.trim() ? input.cohort_id.trim() : null;
  const password = input.password?.trim() || null;

  const { data: college, error: collegeError } = await admin
    .from('colleges')
    .select('id, name, slug')
    .eq('id', input.college_id)
    .single();
  if (collegeError) throw new Error(collegeError.message);
  if (!college?.slug) throw new Error('College not found.');

  if (!password) {
    const unsubscribed = await isUnsubscribed(admin, email);
    if (unsubscribed) {
      throw new Error(
        'This recipient has unsubscribed from invite emails. We cannot send a new invite. They can sign up via the college student login page.'
      );
    }

    const nowIso = new Date().toISOString();
    const { data: pendingTokenInvite } = await admin
      .from('student_invites')
      .select('id')
      .eq('college_id', input.college_id)
      .eq('email', email)
      .eq('status', 'pending')
      .is('revoked_at', null)
      .gt('expires_at', nowIso)
      .maybeSingle();
    if (pendingTokenInvite?.id) {
      throw new Error(
        'An invite is already pending for this student. Use Pending invites on the dashboard to resend.'
      );
    }

    const { data: profileForDup } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (profileForDup?.id) {
      const { data: memDup } = await admin
        .from('college_memberships')
        .select('status')
        .eq('user_id', profileForDup.id)
        .eq('college_id', input.college_id)
        .eq('role', 'student')
        .maybeSingle();
      if (memDup) {
        if (memDup.status === 'invited') {
          throw new Error(
            'An invite is already pending for this student. Use Pending invites to resend from the dashboard.'
          );
        }
        throw new Error('This student is already enrolled in this college.');
      }
    }

    if (cohortId) {
      const { data: cohortRow, error: cohortErr } = await admin
        .from('cohorts')
        .select('id')
        .eq('id', cohortId)
        .eq('college_id', input.college_id)
        .maybeSingle();
      if (cohortErr) throw new Error(cohortErr.message);
      if (!cohortRow) throw new Error('Cohort not found for this college.');
    }

    const inspected = inspectEmailConfig();
    if (!inspected.ready && !inspected.dryRun) {
      throw new Error(`Email is not configured: ${inspected.issues.join('; ')}`);
    }

    await revokePendingStudentInvitesForEmailCollege(admin, input.college_id, email);

    const expiryHours = await getStudentInviteExpiryHours(admin);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    const plainToken = generateStudentInvitePlainToken();
    const tokenHash = hashStudentInviteToken(plainToken);

    const { data: inserted, error: insertError } = await admin
      .from('student_invites')
      .insert({
        college_id: input.college_id,
        email,
        full_name: input.full_name.trim(),
        student_code: input.student_code?.trim() || null,
        cohort_id: cohortId,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
        created_by: actor.id,
      })
      .select('id')
      .single();

    if (insertError) {
      const msg = insertError.message ?? '';
      if (msg.includes('student_invites') || insertError.code === '42P01') {
        throw new Error(
          'Student invites table is missing. Apply migration 00146_fix_student_invite_acceptance_flow.sql, then retry.'
        );
      }
      throw new Error(insertError.message);
    }

    console.info('[students/invite] pending token invite created', {
      email,
      college_id: input.college_id,
      invite_id: inserted?.id,
      expiryHours,
      expires_at: expiresAt,
      token_hash_prefix: tokenHash.slice(0, 8),
    });

    await sendPendingStudentInviteEmail({
      plainToken,
      email,
      fullName: input.full_name.trim(),
      collegeName: college.name ?? college.slug,
      category: 'student_invite',
    });

    return { invite_id: inserted?.id, email_sent: true };
  }

  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const { data: userData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name.trim(), college_id: input.college_id },
  });

  if (authError) {
    if (isAlreadyRegisteredError(authError.message)) {
      throw new Error(
        'A user with this email already exists. Use the invite flow (leave password blank) or choose a different email.'
      );
    }
    throw new Error(authError.message);
  }

  if (!userData.user) throw new Error('Create user failed.');
  const userId = userData.user.id;

  const { error: confirmError } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (confirmError) throw new Error(confirmError.message);

  await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: input.full_name.trim(),
      email,
      is_active: true,
      invited_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (cohortId) {
    const { data: cohortRow, error: cohortErr } = await admin
      .from('cohorts')
      .select('id')
      .eq('id', cohortId)
      .eq('college_id', input.college_id)
      .maybeSingle();
    if (cohortErr) throw new Error(cohortErr.message);
    if (!cohortRow) throw new Error('Cohort not found for this college.');
  }

  const { error: memError } = await admin.from('college_memberships').insert({
    user_id: userId,
    college_id: input.college_id,
    role: 'student',
    status: 'active',
  });
  if (memError && memError.code !== '23505') {
    throw new Error(memError.message);
  }

  const { error: studentError } = await admin.from('students').insert({
    user_id: userId,
    college_id: input.college_id,
    student_code: input.student_code?.trim() || null,
    cohort_id: cohortId,
  });
  if (studentError) {
    if (studentError.code === '23505') {
      const { data: existingStudent, error: existingStudentError } = await admin
        .from('students')
        .select('id, student_code, cohort_id')
        .eq('user_id', userId)
        .eq('college_id', input.college_id)
        .maybeSingle();
      if (existingStudentError) throw new Error(existingStudentError.message);
      if (!existingStudent) {
        throw new Error('Student membership exists, but student profile is missing. Please retry.');
      }

      const nextStudentCode =
        input.student_code?.trim() && !existingStudent.student_code
          ? input.student_code.trim()
          : existingStudent.student_code;
      const nextCohortId =
        cohortId && !existingStudent.cohort_id ? cohortId : existingStudent.cohort_id;

      if (nextStudentCode !== existingStudent.student_code || nextCohortId !== existingStudent.cohort_id) {
        const { error: patchStudentError } = await admin
          .from('students')
          .update({
            student_code: nextStudentCode,
            cohort_id: nextCohortId,
          })
          .eq('id', existingStudent.id);
        if (patchStudentError) throw new Error(patchStudentError.message);
      }

      return { user_id: userId, email_sent: false };
    }
    throw new Error(studentError.message);
  }

  const { data: newStudent } = await admin
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .eq('college_id', input.college_id)
    .single();

  if (newStudent) {
    await grantEntitlementsForNewStudent(newStudent.id, input.college_id);
  }

  return { user_id: userId, email_sent: false };
}


export interface BulkInviteRow {
  email: string;
  full_name: string;
  student_code?: string | null;
}

export interface BulkInviteResult {
  /** Emails for which an invite email was actually sent. */
  invited: string[];
  /** Emails added to the college without sending (existing account or unsubscribed). */
  added: string[];
  failed: { email: string; reason: string }[];
}

/** Invite multiple students. Sends invite email only for new, non-unsubscribed addresses; others are added without email. */
export async function bulkInviteStudents(
  rows: BulkInviteRow[],
  college_id: string
): Promise<BulkInviteResult> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const invited: string[] = [];
  const added: string[] = [];
  const failed: { email: string; reason: string }[] = [];

  const validRows = rows.filter((row) => {
    const email = row.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      failed.push({ email: row.email, reason: 'Invalid email' });
      return false;
    }
    return true;
  });

  if (validRows.length === 0) {
    return { invited, added, failed };
  }

  const admin = createAdminClient();
  const allEmails = validRows.map((r) => r.email.trim().toLowerCase());

  // Batch pre-checks: profiles, pending invites, memberships, unsubscribes (4 queries instead of 4N)
  const [profilesRes, pendingInvitesRes, membershipsRes, unsubscribesRes] = await Promise.all([
    admin.from('profiles').select('id, email').in('email', allEmails),
    admin.from('student_invites').select('id, email').eq('college_id', college_id).eq('status', 'pending').is('revoked_at', null).in('email', allEmails),
    admin.from('college_memberships').select('user_id, status').eq('college_id', college_id).eq('role', 'student'),
    admin.from('email_unsubscribes').select('email').in('email', allEmails),
  ]);

  const pendingInviteEmails = new Set((pendingInvitesRes.data ?? []).map((r) => r.email.toLowerCase()));
  const unsubscribedEmails = new Set((unsubscribesRes.data ?? []).map((r) => r.email.toLowerCase()));

  // Build membership lookup: userId -> status
  const membershipByUserId = new Map((membershipsRes.data ?? []).map((m) => [m.user_id, m.status]));
  // Map profile emails to their user IDs for membership check
  const emailToProfileId = new Map((profilesRes.data ?? []).map((p) => [p.email.toLowerCase(), p.id]));

  // Partition rows into categories
  const rowsToInvite: { row: BulkInviteRow; email: string }[] = [];
  for (const row of validRows) {
    const email = row.email.trim().toLowerCase();

    if (unsubscribedEmails.has(email)) {
      // Unsubscribed: add without sending
      added.push(email);
      continue;
    }

    if (pendingInviteEmails.has(email)) {
      // Already has pending invite
      continue;
    }

    const profileId = emailToProfileId.get(email);
    if (profileId) {
      const memStatus = membershipByUserId.get(profileId);
      if (memStatus === 'invited') {
        // Already has pending invite via membership
        continue;
      }
      if (memStatus === 'active') {
        added.push(email);
        continue;
      }
    }

    // New student — needs invite
    rowsToInvite.push({ row, email });
  }

  // TODO: Each inviteStudent call performs 4-5 sequential writes (auth user, profile, membership,
  // student, entitlements). For large batches, these should be batched:
  //   1. Batch auth user creation via admin.auth.admin.batch() or sequential with Promise.all
  //   2. Batch profile upserts via a single .upsert([...]) call
  //   3. Batch membership + student inserts via .insert([...]) with multi-row values
  //   4. Batch entitlement grants via a single RPC or bulk insert
  // Current approach: calls inviteStudent per row, which is correct but O(N) round-trips.
  const inviteResults = await Promise.allSettled(
    rowsToInvite.map(async ({ row, email }) => {
      const result = await inviteStudent({
        college_id,
        email: row.email,
        full_name: row.full_name.trim() || email,
        student_code: row.student_code ?? null,
      });
      return { email, email_sent: result.email_sent };
    }),
  );

  for (const r of inviteResults) {
    if (r.status === 'fulfilled') {
      if (r.value.email_sent) {
        invited.push(r.value.email);
      } else {
        added.push(r.value.email);
      }
    } else {
      const idx = inviteResults.indexOf(r);
      const email = rowsToInvite[idx]?.email ?? 'unknown';
      failed.push({ email, reason: r.reason instanceof Error ? r.reason.message : 'Invite failed' });
    }
  }

  return { invited, added, failed };
}

/** Update student auth/profile + students row. */
export async function updateStudent(input: UpdateStudentInput): Promise<{ user_id: string }> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();

  const { data: studentRow, error: studentLookupError } = await admin
    .from('students')
    .select('id, user_id, college_id')
    .eq('id', input.student_id)
    .eq('college_id', input.college_id)
    .single();

  if (studentLookupError || !studentRow) {
    throw new Error('Student not found for this college.');
  }

  const userId = studentRow.user_id;
  const email = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim();

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
    email,
    user_metadata: { full_name: fullName },
  });
  if (authUpdateError) throw new Error(authUpdateError.message);

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      is_active: true,
    },
    { onConflict: 'id' }
  );
  if (profileError) throw new Error(profileError.message);

  const { error: studentUpdateError } = await admin
    .from('students')
    .update({ student_code: input.student_code?.trim() || null })
    .eq('id', input.student_id)
    .eq('college_id', input.college_id);
  if (studentUpdateError) throw new Error(studentUpdateError.message);

  return { user_id: userId };
}

/**
 * Remove a student from one college only. Deletes their college_membership and students row for this college.
 * Auth user and profile are kept; they can still sign in or be in other colleges.
 */
export async function removeStudentFromCollege(collegeId: string, studentId: string): Promise<{ user_id: string }> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();

  const { data: studentRow, error: studentLookupError } = await admin
    .from('students')
    .select('id, user_id, college_id')
    .eq('id', studentId)
    .eq('college_id', collegeId)
    .single();

  if (studentLookupError || !studentRow) {
    throw new Error('Student not found for this college.');
  }

  const userId = studentRow.user_id;

  const { error: studentDelError } = await admin.from('students').delete().eq('id', studentId).eq('college_id', collegeId);
  if (studentDelError) throw new Error(studentDelError.message);

  const { error: memDelError } = await admin
    .from('college_memberships')
    .delete()
    .eq('user_id', userId)
    .eq('college_id', collegeId)
    .eq('role', 'student');
  if (memDelError) throw new Error(memDelError.message);

  return { user_id: userId };
}

/**
 * Explicitly revoke a user's course/note/bootcamp/bundle/DSA/CA access before
 * hard-deleting their student rows.
 *
 * Requires the transactional RPC `revoke_student_access_state(p_user_id)`.
 * Fail closed if the function is missing — never fall back to a non-atomic
 * sequence of entitlement deletes.
 *
 * Does NOT touch payments, invoices, refunds, orders, lms_email_outbox,
 * note_payment_orders, or other accounting history.
 */
async function revokeStudentAccessState(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const { error: rpcError } = await admin.rpc('revoke_student_access_state', {
    p_user_id: userId,
  });

  if (!rpcError) return;

  const message = (rpcError.message ?? '').toLowerCase();
  const missingFn =
    rpcError.code === 'PGRST202' ||
    rpcError.code === '42883' ||
    message.includes('could not find the function') ||
    message.includes('revoke_student_access_state') ||
    message.includes('schema cache');

  if (missingFn) {
    throw new Error(
      'Student access revocation failed: database function revoke_student_access_state(p_user_id) is not deployed. Apply the Manual SQL for this function, then retry deletion. Non-atomic entitlement deletes are intentionally disabled.',
    );
  }

  throw new Error(rpcError.message);
}

/** Hard delete student login credentials + linked rows via FK cascade. */
export async function deleteStudentCredential(collegeId: string, studentId: string): Promise<{ user_id: string }> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();

  const { data: studentRow, error: studentLookupError } = await admin
    .from('students')
    .select('id, user_id, college_id')
    .eq('id', studentId)
    .eq('college_id', collegeId)
    .single();

  if (studentLookupError || !studentRow) {
    throw new Error('Student not found for this college.');
  }

  const userId = studentRow.user_id;

  // Explicitly revoke access (entitlements, bootcamp enrollments, ambassador/coupon status)
  // before deleting student/profile/auth rows below.
  await revokeStudentAccessState(admin, userId);

  // Hard delete must not destroy financial history. note_payment_orders.student_id
  // is SET NULL via migration 00320; invoices retain note_payment_order_id.
  // Delete engagement/student rows first, then auth.
  const { error: studentDeleteError } = await admin.from('students').delete().eq('user_id', userId);
  if (studentDeleteError) throw new Error(studentDeleteError.message);

  const { error: membershipDeleteError } = await admin.from('college_memberships').delete().eq('user_id', userId);
  if (membershipDeleteError) throw new Error(membershipDeleteError.message);

  const { error: profileDeleteError } = await admin.from('profiles').delete().eq('id', userId);
  if (profileDeleteError) throw new Error(profileDeleteError.message);

  const { error: nonPartneredDeleteError } = await admin
    .from('non_partnered_students')
    .delete()
    .eq('user_id', userId);

  if (nonPartneredDeleteError) {
    const message = (nonPartneredDeleteError.message ?? '').toLowerCase();
    const missingTable =
      message.includes('non_partnered_students') &&
      (message.includes('schema cache') || message.includes('does not exist') || message.includes('could not find'));

    if (!missingTable) {
      throw new Error(nonPartneredDeleteError.message);
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    const message = (deleteUserError.message ?? '').toLowerCase();
    const alreadyDeleted =
      message.includes('user not found') ||
      message.includes('not found') ||
      message.includes('no rows');

    if (!alreadyDeleted) {
      // DB access cleanup already succeeded. Do not report overall success —
      // Auth row still exists and must be retried. Operator should re-run delete.
      throw new Error(
        `Account is not fully deleted: access state was revoked but Auth user deletion failed (${deleteUserError.message}). Retry deletion — access revocation is idempotent.`,
      );
    }
  }

  return { user_id: userId };
}

export type StudentListClassification = 'partnered' | 'direct_learner';

export interface StudentListItem {
  id: string;
  user_id: string;
  college_id: string;
  student_code: string | null;
  full_name: string | null;
  email: string | null;
  /** Partnered: display name of the institution (custom_college_name for unknown-college flow, else colleges.name). Direct learner: raw self-reported school only, not the B2C tenant name. */
  college_name: string | null;
  college_slug: string | null;
  student_classification: StudentListClassification;
  /** From non_partnered_students; meaningful when classification is direct_learner. */
  self_reported_college_name: string | null;
  /** Primary label for admin tables (includes "(self-reported)" for B2C school when set). */
  college_display: string;
  /** Dashboard pending-invite resend: token-based row id in student_invites. */
  pending_invite_id?: string;
  pending_invite_kind?: 'token' | 'legacy';
}

function buildStudentListRow(input: {
  id: string;
  user_id: string;
  college_id: string;
  student_code: string | null;
  full_name: string | null;
  email: string | null;
  custom_college_name: string | null | undefined;
  college: { id: string; name: string; slug: string } | undefined;
  self_reported_college_name: string | null;
}): StudentListItem {
  const slug = input.college?.slug ?? null;
  const direct = isDirectLearnerCollegeSlug(slug);
  const reported = input.self_reported_college_name?.trim() || null;

  if (direct) {
    const college_display = reported ? `${reported} (self-reported)` : 'Direct learner - not provided';
    return {
      id: input.id,
      user_id: input.user_id,
      college_id: input.college_id,
      student_code: input.student_code,
      full_name: input.full_name,
      email: input.email,
      college_name: reported,
      college_slug: slug,
      student_classification: 'direct_learner',
      self_reported_college_name: reported,
      college_display,
    };
  }

  const partnerLabel = input.custom_college_name?.trim() || input.college?.name || null;
  const college_display = partnerLabel?.trim() ? partnerLabel.trim() : '-';

  return {
    id: input.id,
    user_id: input.user_id,
    college_id: input.college_id,
    student_code: input.student_code,
    full_name: input.full_name,
    email: input.email,
    college_name: partnerLabel,
    college_slug: slug,
    student_classification: 'partnered',
    self_reported_college_name: null,
    college_display,
  };
}

/** List all students with profile and college info (SuperAdmin only). Optional filter by college_id. */
export async function listStudents(opts?: {
  college_id?: string;
  limit?: number;
  offset?: number;
  college?: Pick<CollegeWithCounts, 'id' | 'name' | 'slug'>;
}): Promise<StudentListItem[]> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const limit = Math.min(opts?.limit ?? 50, 100); // Cap at 100
  const offset = opts?.offset ?? 0;
  
  let query = admin.from('students')
    .select('id, user_id, college_id, student_code, custom_college_name')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (opts?.college_id) query = query.eq('college_id', opts.college_id);
  
  const { data: students, error: studentsError } = await query;
  if (studentsError) throw new Error(studentsError.message);
  if (!students?.length) return [];

  const userIds = [...new Set(students.map((s) => s.user_id))];
  const collegeIds = [...new Set(students.map((s) => s.college_id))];
  const studentIds = students.map((s) => s.id);
  const providedCollege = opts?.college;
  const shouldReuseCollege =
    providedCollege != null &&
    collegeIds.length === 1 &&
    collegeIds[0] === providedCollege.id;
  const [profilesRes, collegesRes, npsRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, email').in('id', userIds),
    shouldReuseCollege
      ? Promise.resolve({
        data: [{ id: providedCollege.id, name: providedCollege.name, slug: providedCollege.slug }],
        error: null,
      })
      : admin.from('colleges').select('id, name, slug').in('id', collegeIds),
    admin.from('non_partnered_students').select('student_id, self_reported_college_name').in('student_id', studentIds),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (collegesRes.error) throw new Error(collegesRes.error.message);
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const collegeMap = new Map((collegesRes.data ?? []).map((c) => [c.id, c]));
  const npsRows = selectNonPartneredStudentsOrEmpty(npsRes);
  const npsMap = new Map(npsRows.map((r) => [r.student_id, r.self_reported_college_name ?? null]));

  return students.map((s) => {
    const college = collegeMap.get(s.college_id);
    return buildStudentListRow({
      id: s.id,
      user_id: s.user_id,
      college_id: s.college_id,
      student_code: s.student_code,
      full_name: profileMap.get(s.user_id)?.full_name ?? null,
      email: profileMap.get(s.user_id)?.email ?? null,
      custom_college_name: (s as { custom_college_name?: string | null }).custom_college_name,
      college,
      self_reported_college_name: npsMap.get(s.id) ?? null,
    });
  });
}



/** List all students who have been invited but not yet accepted (SuperAdmin only). */
export async function getPendingStudentInvites(): Promise<StudentListItem[]> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: tokenInvites, error: tokenErr } = await admin
    .from('student_invites')
    .select('id, college_id, email, full_name, student_code, expires_at')
    .eq('status', 'pending')
    .is('revoked_at', null)
    .gt('expires_at', nowIso);

  if (tokenErr) {
    const msg = (tokenErr.message ?? '').toLowerCase();
    const missingTable =
      msg.includes('student_invites') ||
      tokenErr.code === '42P01' ||
      msg.includes('does not exist') ||
      msg.includes('schema cache');
    if (!missingTable) throw new Error(tokenErr.message);
  }

  const tokenRows = tokenInvites ?? [];
  const tokenPairs = new Set(tokenRows.map((r) => `${r.college_id}:${r.email.trim().toLowerCase()}`));

  const { data: memberships, error: memError } = await admin
    .from('college_memberships')
    .select('user_id, college_id')
    .eq('status', 'invited')
    .eq('role', 'student');

  if (memError) throw new Error(memError.message);

  const collegeIds = new Set<string>();
  tokenRows.forEach((r) => collegeIds.add(r.college_id));
  (memberships ?? []).forEach((m) => collegeIds.add(m.college_id));

  const { data: collegeRows, error: collegeErr } = await admin
    .from('colleges')
    .select('id, name, slug')
    .in('id', [...collegeIds]);
  if (collegeErr) throw new Error(collegeErr.message);
  const collegeMap = new Map((collegeRows ?? []).map((c) => [c.id, c]));

  const tokenItems: StudentListItem[] = tokenRows.map((inv) => {
    const college = collegeMap.get(inv.college_id);
    const base = buildStudentListRow({
      id: inv.id,
      user_id: inv.id,
      college_id: inv.college_id,
      student_code: inv.student_code,
      full_name: inv.full_name,
      email: inv.email,
      custom_college_name: null,
      college,
      self_reported_college_name: null,
    });
    return { ...base, pending_invite_id: inv.id, pending_invite_kind: 'token' as const };
  });

  if (!memberships?.length) return tokenItems;

  const userIds = memberships.map((m) => m.user_id);
  const [profilesRes, studentsRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, email').in('id', userIds),
    admin.from('students').select('id, user_id, student_code, custom_college_name, college_id').in('user_id', userIds),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (studentsRes.error) throw new Error(studentsRes.error.message);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const studentByUser = new Map((studentsRes.data ?? []).map((s) => [s.user_id, s]));

  const studentRows = studentsRes.data ?? [];
  const studentIds = studentRows.map((r) => r.id as string);
  const npsRes =
    studentIds.length > 0
      ? await admin.from('non_partnered_students').select('student_id, self_reported_college_name').in('student_id', studentIds)
      : { data: [] as NonPartneredSelectRow[], error: null };
  const npsRows = selectNonPartneredStudentsOrEmpty(npsRes);
  const npsMap = new Map(npsRows.map((r) => [r.student_id, r.self_reported_college_name ?? null]));

  const legacyItems: StudentListItem[] = [];
  for (const m of memberships) {
    const profile = profileMap.get(m.user_id);
    const emailLower = (profile?.email ?? '').trim().toLowerCase();
    if (emailLower && tokenPairs.has(`${m.college_id}:${emailLower}`)) continue;

    const college = collegeMap.get(m.college_id);
    const s = studentByUser.get(m.user_id);
    if (s) {
      legacyItems.push({
        ...buildStudentListRow({
          id: s.id as string,
          user_id: m.user_id,
          college_id: m.college_id,
          student_code: (s.student_code as string | null) ?? null,
          full_name: profileMap.get(m.user_id)?.full_name ?? null,
          email: profileMap.get(m.user_id)?.email ?? null,
          custom_college_name: (s as { custom_college_name?: string | null }).custom_college_name,
          college,
          self_reported_college_name: npsMap.get(s.id as string) ?? null,
        }),
        pending_invite_kind: 'legacy',
      });
      continue;
    }
    const slug = college?.slug ?? null;
    const direct = isDirectLearnerCollegeSlug(slug);
    if (direct) {
      legacyItems.push({
        id: m.user_id,
        user_id: m.user_id,
        college_id: m.college_id,
        student_code: null,
        full_name: profileMap.get(m.user_id)?.full_name ?? null,
        email: profileMap.get(m.user_id)?.email ?? null,
        college_name: null,
        college_slug: slug,
        student_classification: 'direct_learner',
        self_reported_college_name: null,
        college_display: 'Direct learner - not provided',
        pending_invite_kind: 'legacy',
      });
    } else {
      const partnerLabel = college?.name ?? null;
      legacyItems.push({
        id: m.user_id,
        user_id: m.user_id,
        college_id: m.college_id,
        student_code: null,
        full_name: profileMap.get(m.user_id)?.full_name ?? null,
        email: profileMap.get(m.user_id)?.email ?? null,
        college_name: partnerLabel,
        college_slug: slug,
        student_classification: 'partnered',
        self_reported_college_name: null,
        college_display: partnerLabel?.trim() ? partnerLabel.trim() : '-',
        pending_invite_kind: 'legacy',
      });
    }
  }

  return [...tokenItems, ...legacyItems];
}

/** Re-send a token-based student invite (revokes prior pending rows for same email+college). */
export async function resendTokenStudentInvite(inviteId: string): Promise<{ ok: boolean }> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const actor = _auth!;
  const admin = createAdminClient();

  const { data: row, error } = await admin.from('student_invites').select('*').eq('id', inviteId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error('Invite not found.');
  if (row.status !== 'pending' || row.revoked_at) throw new Error('Invite is no longer pending.');
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw new Error('Invite expired. Send a new invite from the college page.');
  }

  const { data: college, error: colErr } = await admin
    .from('colleges')
    .select('id, name, slug')
    .eq('id', row.college_id)
    .single();
  if (colErr || !college?.slug) throw new Error(colErr?.message ?? 'College not found.');

  const inspected = inspectEmailConfig();
  if (!inspected.ready && !inspected.dryRun) {
    throw new Error(`Email is not configured: ${inspected.issues.join('; ')}`);
  }

  await revokePendingStudentInvitesForEmailCollege(admin, row.college_id, row.email);

  const expiryHours = await getStudentInviteExpiryHours(admin);
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
  const plainToken = generateStudentInvitePlainToken();
  const tokenHash = hashStudentInviteToken(plainToken);

  const { data: inserted, error: insErr } = await admin
    .from('student_invites')
    .insert({
      college_id: row.college_id,
      email: row.email,
      full_name: row.full_name,
      student_code: row.student_code,
      cohort_id: row.cohort_id,
      token_hash: tokenHash,
      status: 'pending',
      expires_at: expiresAt,
      created_by: actor.id,
    })
    .select('id')
    .single();
  if (insErr) throw new Error(insErr.message);

  console.info('[students/invite] token invite resent', {
    email: row.email,
    college_id: row.college_id,
    invite_id: inserted?.id,
    expiryHours,
    expires_at: expiresAt,
    token_hash_prefix: tokenHash.slice(0, 8),
  });

  await sendPendingStudentInviteEmail({
    plainToken,
    email: row.email,
    fullName: row.full_name?.trim() || row.email,
    collegeName: college.name ?? college.slug,
    category: 'student_invite_resend',
  });

  return { ok: true };
}

/** Legacy resend: Supabase recovery email (students provisioned before token invites). */
export async function resendLegacyStudentInvite(userId: string): Promise<{ ok: boolean }> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.email) throw new Error('Student profile not found.');

  const baseUrl = getStudentPortalBaseUrl();
  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_LMS_URL or NEXT_PUBLIC_LMS_APP_URL env.');
  }
  const redirectTo = `${baseUrl.replace(/\/+$/, '')}/auth/set-password`;

  const { error: resetErr } = await admin.auth.resetPasswordForEmail(profile.email, { redirectTo });
  if (resetErr) throw new Error(resetErr.message);

  await admin.from('profiles').update({
    invite_completed_at: null,
    invited_at: new Date().toISOString(),
  }).eq('id', userId);

  return { ok: true };
}


import 'server-only';

/*
 * This module uses createAdminClient (service role) to bypass RLS because
 * application-level auth checks (requireAuth) are enforced before each operation.
 * RLS is not relied upon for authorization here.
 */
 
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { hashStudentInviteToken } from '@/lib/services/student-invite-crypto';
import { grantEntitlementsForNewStudentLms } from './course-access-manager';
import { maybeQueueAccountWelcomeEmail } from '@/lib/lms/transactional-email/google-welcome';
import { getCampusAmbassadorAppBaseUrl } from '@/lib/campus-ambassador/share';

export type CompleteStudentInviteResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

export async function completeStudentInviteAcceptance(input: {
  plainToken: string;
  password: string;
}): Promise<CompleteStudentInviteResult> {
  const password = input.password;
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const admin = createAdminClient();
  const hash = hashStudentInviteToken(input.plainToken.trim());
  const tokenHashPrefix = hash.slice(0, 8);

  const { data: invite, error: invErr } = await admin
    .from('student_invites')
    .select(
      'id, email, full_name, college_id, student_code, cohort_id, token_hash, status, expires_at, accepted_at, revoked_at, accepted_user_id, accepted_student_id, created_at, updated_at',
    )
    .eq('token_hash', hash)
    .maybeSingle();

  if (invErr) {
    console.error('[invite/accept] load invite failed', { message: invErr.message });
    return { ok: false, error: 'Something went wrong while creating your account.' };
  }
  if (!invite) {
    console.warn('[invite/accept] complete rejected', {
      label: 'student-invite-not-found',
      tokenHashPrefix,
    });
    return { ok: false, error: 'Invalid invite link.' };
  }

  if (invite.accepted_at || invite.status === 'accepted') {
    console.warn('[invite/accept] complete rejected', {
      label: 'student-invite-already-used',
      tokenHashPrefix,
    });
    return { ok: false, error: 'This invite has already been used.' };
  }
  if (invite.revoked_at || invite.status === 'revoked') {
    console.warn('[invite/accept] complete rejected', {
      label: 'student-invite-revoked',
      tokenHashPrefix,
    });
    return { ok: false, error: 'This invite is no longer valid.' };
  }
  if (new Date(invite.expires_at as string).getTime() <= Date.now()) {
    console.warn('[invite/accept] complete rejected', {
      label: 'student-invite-expired',
      tokenHashPrefix,
    });
    return { ok: false, error: 'This invite has expired.' };
  }
  if (invite.status !== 'pending') {
    console.warn('[invite/accept] complete rejected', {
      label: 'student-invite-bad-status',
      tokenHashPrefix,
    });
    return { ok: false, error: 'This invite is no longer valid.' };
  }

  const email = String(invite.email).trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (currentUser?.email && currentUser.email.trim().toLowerCase() !== email) {
    console.warn('[invite/accept] complete rejected', {
      label: 'student-invite-existing-user-mismatch',
    });
    return { ok: false, error: 'You are signed in to a different account. Please log out first.' };
  }

  const { data: profDup } = await admin
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  let userId: string;
  let createdAuthUser = false;
  let createdAuthUserId: string | null = null;
  let createdProfileRow = false;
  let createdProfileId: string | null = null;
  let createdMembershipRow = false;
  let createdMembershipId: string | null = null;
  let createdStudentRow = false;
  let createdStudentId: string | null = null;
  const createdEntitlementIds: string[] = [];

  if (profDup?.id) {
    if (!currentUser || currentUser.id !== profDup.id || currentUser.email?.trim().toLowerCase() !== email) {
      console.warn('[invite/accept] complete rejected', {
        label: 'student-invite-existing-user-login-required',
      });
      return {
        ok: false,
        error:
          'An account with this email already exists. Please sign in to accept this invitation or reset your password.',
      };
    }
    userId = profDup.id;
  } else if (currentUser?.email && currentUser.email.trim().toLowerCase() === email) {
    // Active session email matches invitation email, but profiles row is missing
    userId = currentUser.id;
  } else {
    const { data: userData, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: String(invite.full_name ?? '').trim() || email,
        college_id: invite.college_id,
      },
    });

    if (cErr) {
      const msg = (cErr.message ?? '').toLowerCase();
      if (
        msg.includes('already exists') ||
        msg.includes('already registered') ||
        cErr.status === 422
      ) {
        console.warn('[invite/accept] createUser conflict', {
          label: 'student-invite-existing-user-login-required',
        });
        return {
          ok: false,
          error:
            'An account with this email already exists. Please sign in to accept this invitation or reset your password.',
        };
      }
      console.error('[invite/accept] createUser failed', { message: cErr.message });
      return { ok: false, error: 'Something went wrong while creating your account.' };
    }
    if (!userData.user) {
      return { ok: false, error: 'Something went wrong while creating your account.' };
    }
    userId = userData.user.id;
    createdAuthUser = true;
    createdAuthUserId = userData.user.id;
  }

  const { data: stDup } = await admin
    .from('students')
    .select('id, user_id, college_id')
    .eq('user_id', userId)
    .eq('college_id', invite.college_id as string)
    .maybeSingle();

  if (stDup) {
    if (stDup.user_id !== userId || stDup.college_id !== invite.college_id) {
      console.warn('[invite/accept] complete rejected', {
        label: 'student-invite-existing-user-mismatch',
      });
      return { ok: false, error: 'Account relationship mismatch.' };
    }
    return { ok: false, error: 'You already have an account for this college.' };
  }

  const nowIso = new Date().toISOString();
  const invitedAt = (invite as { created_at?: string }).created_at ?? nowIso;
  let studentId: string | null = null;

  try {
    const { data: existingProf } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (existingProf) {
      createdProfileRow = false;
      createdProfileId = existingProf.id;
      console.info('[invite/accept] profile reused', { label: 'student-invite-profile-reused' });
      const { error: profUpdErr } = await admin
        .from('profiles')
        .update({
          is_active: true,
          invited_at: invitedAt,
          invite_completed_at: nowIso,
        })
        .eq('id', userId);
      if (profUpdErr) throw new Error(profUpdErr.message);
    } else {
      const { data: profIns, error: profInsErr } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: String(invite.full_name ?? '').trim() || email,
          is_active: true,
          invited_at: invitedAt,
          invite_completed_at: nowIso,
        })
        .select('id')
        .single();

      if (profInsErr) {
        const { data: retryProf } = await admin
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (retryProf) {
          createdProfileRow = false;
          createdProfileId = retryProf.id;
          console.info('[invite/accept] profile reused on conflict', {
            label: 'student-invite-profile-reused',
          });
        } else {
          throw new Error(profInsErr.message);
        }
      } else if (profIns) {
        createdProfileRow = true;
        createdProfileId = profIns.id;
        console.info('[invite/accept] profile created', {
          label: 'student-invite-profile-created',
        });
      }
    }

    const { data: memIns, error: memErr } = await admin
      .from('college_memberships')
      .insert({
        user_id: userId,
        college_id: invite.college_id as string,
        role: 'student',
        status: 'active',
      })
      .select('id')
      .single();

    if (memErr) {
      const { data: existingMem } = await admin
        .from('college_memberships')
        .select('id, user_id, college_id, role')
        .eq('user_id', userId)
        .eq('college_id', invite.college_id as string)
        .maybeSingle();

      if (
        existingMem &&
        existingMem.user_id === userId &&
        existingMem.college_id === invite.college_id
      ) {
        if (existingMem.role !== 'student') {
          throw new Error('membership_role_mismatch');
        }
        createdMembershipRow = false;
        createdMembershipId = existingMem.id as string;
      } else {
        throw new Error(memErr.message);
      }
    } else if (memIns) {
      createdMembershipRow = true;
      createdMembershipId = memIns.id as string;
    }

    const { data: studentIns, error: stErr } = await admin
      .from('students')
      .insert({
        user_id: userId,
        college_id: invite.college_id as string,
        student_code: (invite.student_code as string | null) ?? null,
        cohort_id: (invite.cohort_id as string | null) ?? null,
      })
      .select('id, user_id, college_id')
      .single();

    if (stErr) {
      const { data: existingSt } = await admin
        .from('students')
        .select('id, user_id, college_id')
        .eq('user_id', userId)
        .eq('college_id', invite.college_id as string)
        .maybeSingle();

      if (
        existingSt &&
        existingSt.user_id === userId &&
        existingSt.college_id === invite.college_id
      ) {
        createdStudentRow = false;
        createdStudentId = existingSt.id as string;
        studentId = existingSt.id as string;
      } else {
        throw new Error(stErr.message);
      }
    } else if (studentIns) {
      createdStudentRow = true;
      createdStudentId = studentIns.id as string;
      studentId = studentIns.id as string;
    }

    if (studentId) {
      const entResult = await grantEntitlementsForNewStudentLms(
        studentId,
        invite.college_id as string,
      );
      if (entResult.createdIds && entResult.createdIds.length > 0) {
        createdEntitlementIds.push(...entResult.createdIds);
        console.info('[invite/accept] entitlement created', {
          label: 'student-invite-entitlement-created',
          count: entResult.created,
        });
      }
      if (entResult.existed > 0) {
        console.info('[invite/accept] entitlement reused', {
          label: 'student-invite-entitlement-reused',
          count: entResult.existed,
        });
      }
    }

    const { data: updatedInvites, error: markErr } = await admin
      .from('student_invites')
      .update({
        status: 'accepted',
        accepted_at: nowIso,
        accepted_user_id: userId,
        accepted_student_id: studentId,
        updated_at: nowIso,
      })
      .eq('id', invite.id as string)
      .eq('status', 'pending')
      .select('id');

    if (markErr) throw new Error(markErr.message);
    if (!updatedInvites?.length) {
      console.warn('[invite/accept] concurrent request rejected', {
        label: 'student-invite-concurrent-request-rejected',
      });
      throw new Error('invite_already_completed');
    }

    const { data: college } = await admin
      .from('colleges')
      .select('slug')
      .eq('id', invite.college_id as string)
      .single();
    if (!college?.slug) throw new Error('College not found.');

    if (createdAuthUser) {
      const { data: authUserData } = await admin.auth.admin.getUserById(userId);
      if (authUserData?.user) {
        const dashboardUrl = `${getCampusAmbassadorAppBaseUrl().replace(/\/+$/, '')}/c/${encodeURIComponent(college.slug)}/student`;
        void maybeQueueAccountWelcomeEmail({
          user: authUserData.user,
          studentId: studentId ?? '',
          dashboardUrl,
          isNewStudentProvisioning: true,
        });
      }
    }

    console.info('[invite/accept] completed', { label: 'student-invite-completed' });

    const targetPath = currentUser
      ? `/c/${encodeURIComponent(college.slug)}/student`
      : `/c/${encodeURIComponent(college.slug)}/student/login`;

    return {
      ok: true,
      redirectUrl: targetPath,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';

    if (createdEntitlementIds.length > 0) {
      try {
        await admin
          .from('student_content_entitlements')
          .delete()
          .in('id', createdEntitlementIds);
      } catch {
        console.warn('[invite/accept] entitlement rollback skipped/failed', {
          label: 'student-invite-rollback-resource-skipped',
        });
      }
    } else {
      console.info('[invite/accept] entitlement rollback skipped (none created or pre-existing)', {
        label: 'student-invite-rollback-resource-skipped',
      });
    }

    if (createdStudentRow && createdStudentId) {
      try {
        await admin
          .from('students')
          .delete()
          .eq('id', createdStudentId);
      } catch {
        console.warn('[invite/accept] student rollback skipped/failed', {
          label: 'student-invite-rollback-resource-skipped',
        });
      }
    } else {
      console.info('[invite/accept] student rollback skipped (pre-existing)', {
        label: 'student-invite-rollback-resource-skipped',
      });
    }

    if (createdMembershipRow && createdMembershipId) {
      try {
        await admin
          .from('college_memberships')
          .delete()
          .eq('id', createdMembershipId);
      } catch {
        console.warn('[invite/accept] membership rollback skipped/failed', {
          label: 'student-invite-rollback-resource-skipped',
        });
      }
    } else {
      console.info('[invite/accept] membership rollback skipped (pre-existing)', {
        label: 'student-invite-rollback-resource-skipped',
      });
    }

    if (createdProfileRow && createdProfileId) {
      try {
        await admin
          .from('profiles')
          .delete()
          .eq('id', createdProfileId);
      } catch {
        console.warn('[invite/accept] profile rollback skipped/failed', {
          label: 'student-invite-rollback-resource-skipped',
        });
      }
    } else {
      console.info('[invite/accept] profile rollback skipped (pre-existing)', {
        label: 'student-invite-rollback-resource-skipped',
      });
    }

    if (createdAuthUser && createdAuthUserId) {
      try {
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        console.warn('[invite/accept] auth user rollback skipped/failed', {
          label: 'student-invite-rollback-resource-skipped',
        });
      }
    } else {
      console.info('[invite/accept] auth user rollback skipped (pre-existing)', {
        label: 'student-invite-rollback-resource-skipped',
      });
    }

    if (msg === 'invite_already_completed') {
      return { ok: false, error: 'This invite has already been used.' };
    }
    console.error('[invite/accept] provisioning failed', { message: msg || 'unknown' });
    return { ok: false, error: 'Something went wrong while creating your account.' };
  }
}

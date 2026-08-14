/**
 * Admin security operations — session management, force-logout, suspension.
 *
 * RLS BYPASS: Yes — uses createAdminClient() (service-role key).
 * AUTH GUARD: None at this level. ALL callers must invoke requireSuperadmin()
 *             (or equivalent) before calling any function in this module.
 * TENANT SCOPE: Functions accept userId/sessionId and operate across tenants.
 *               This is intentional for SuperAdmin cross-tenant management.
 */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/services/audit';

export interface AdminSessionListItem {
  id: string;
  user_id: string;
  college_id: string | null;
  role: string;
  status: string;
  device_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
}

export async function listAdminSessionsForUser(userId: string, limit = 100): Promise<AdminSessionListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_sessions')
    .select('id, user_id, college_id, role, status, device_id, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at, revoke_reason')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function revokeAdminSessionById(input: {
  actorId: string;
  sessionId: string;
  reason?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: target, error: lookupError } = await admin
    .from('admin_sessions')
    .select('id, user_id, college_id')
    .eq('id', input.sessionId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (!target) throw new Error('Admin session not found.');

  const { error } = await admin
    .from('admin_sessions')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: input.actorId,
      revoke_reason: input.reason ?? 'revoked_by_superadmin',
    })
    .eq('id', input.sessionId)
    .eq('status', 'active');

  if (error) throw new Error(error.message);

  await logAudit({
    actor_id: input.actorId,
    action: 'admin.session.revoked',
    resource_type: 'admin_session',
    resource_id: input.sessionId,
    college_id: target.college_id,
    payload: {
      user_id: target.user_id,
      reason: input.reason ?? 'revoked_by_superadmin',
    },
  });
}

export async function revokeAllAdminSessionsForUser(input: {
  actorId: string;
  userId: string;
  reason?: string;
}): Promise<number> {
  const admin = createAdminClient();

  const { data: rows, error: readError } = await admin
    .from('admin_sessions')
    .select('id, college_id')
    .eq('user_id', input.userId)
    .eq('status', 'active');

  if (readError) throw new Error(readError.message);

  const { data, error } = await admin
    .from('admin_sessions')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: input.actorId,
      revoke_reason: input.reason ?? 'revoked_all_by_superadmin',
    })
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .select('id');

  if (error) throw new Error(error.message);

  await logAudit({
    actor_id: input.actorId,
    action: 'admin.session.revoked_all',
    resource_type: 'user',
    resource_id: input.userId,
    college_id: rows?.[0]?.college_id ?? null,
    payload: {
      reason: input.reason ?? 'revoked_all_by_superadmin',
      count: data?.length ?? 0,
    },
  });

  return data?.length ?? 0;
}

export async function forceLogoutAdminUser(input: {
  actorId: string;
  userId: string;
  reason?: string;
}): Promise<{ revokedSessions: number }> {
  const admin = createAdminClient();

  const nowIso = new Date().toISOString();
  const { error: updateError } = await admin
    .from('profiles')
    .update({ force_logout_after: nowIso })
    .eq('id', input.userId);

  if (updateError) throw new Error(updateError.message);

  const revokedSessions = await revokeAllAdminSessionsForUser({
    actorId: input.actorId,
    userId: input.userId,
    reason: input.reason ?? 'force_logout',
  });

  await logAudit({
    actor_id: input.actorId,
    action: 'admin.force_logout',
    resource_type: 'user',
    resource_id: input.userId,
    payload: { revoked_sessions: revokedSessions, reason: input.reason ?? 'force_logout' },
  });

  return { revokedSessions };
}

export async function setAdminSuspended(input: {
  actorId: string;
  userId: string;
  suspended: boolean;
  reason?: string;
}): Promise<void> {
  const admin = createAdminClient();

  const updates = input.suspended
    ? {
        is_active: false,
        suspended_at: new Date().toISOString(),
        suspension_reason: input.reason ?? 'suspended_by_superadmin',
        force_logout_after: new Date().toISOString(),
      }
    : {
        is_active: true,
        suspended_at: null,
        suspension_reason: null,
      };

  const { error: profileError } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', input.userId);

  if (profileError) throw new Error(profileError.message);

  const { error: membershipError } = await admin
    .from('college_memberships')
    .update({ status: input.suspended ? 'inactive' : 'active' })
    .eq('user_id', input.userId)
    .in('role', ['college_admin', 'faculty_spoc'])
    .in('status', input.suspended ? ['active', 'invited'] : ['inactive']);

  if (membershipError) throw new Error(membershipError.message);

  if (input.suspended) {
    await revokeAllAdminSessionsForUser({
      actorId: input.actorId,
      userId: input.userId,
      reason: input.reason ?? 'account_suspended',
    });
  }

  await logAudit({
    actor_id: input.actorId,
    action: input.suspended ? 'admin.account.suspended' : 'admin.account.reactivated',
    resource_type: 'user',
    resource_id: input.userId,
    payload: { reason: input.reason ?? null },
  });
}

export async function setAdminTwoFactorRequirement(input: {
  actorId: string;
  userId: string;
  required: boolean;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('profiles')
    .update({ requires_2fa: input.required })
    .eq('id', input.userId);

  if (error) throw new Error(error.message);

  await logAudit({
    actor_id: input.actorId,
    action: input.required ? 'admin.2fa.enabled' : 'admin.2fa.disabled',
    resource_type: 'user',
    resource_id: input.userId,
  });
}

export async function auditPasswordReset(input: {
  actorId: string;
  userId: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('profiles')
    .update({ last_password_reset_at: new Date().toISOString() })
    .eq('id', input.userId);

  if (error) throw new Error(error.message);

  await logAudit({
    actor_id: input.actorId,
    action: 'admin.password_reset.completed',
    resource_type: 'user',
    resource_id: input.userId,
    payload: input.payload ?? null,
  });
}

export async function auditAdminInviteAccepted(input: {
  actorId: string;
  userId: string;
  collegeId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await logAudit({
    actor_id: input.actorId,
    action: 'admin.invite.accepted',
    resource_type: 'user',
    resource_id: input.userId,
    college_id: input.collegeId ?? null,
    payload: input.payload ?? null,
  });
}

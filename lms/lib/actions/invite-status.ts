'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVerifiedIdentity } from '@/lib/student-runtime/identity';
import { normalizeStudentInviteExpiryHours } from '@/lib/services/student-invite-expiry';

export async function getInviteStatusAction() {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return { ok: false as const, error: 'Unauthorized' };
  }
  const userId = identity.userId;

  const supabase = await createClient();
  const admin = createAdminClient();
  const [profileResult, settingsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('invite_completed_at, invited_at')
      .eq('id', userId)
      .maybeSingle(),
    admin
      .from('platform_settings')
      .select('invite_expiry_hours')
      .eq('id', 'default')
      .maybeSingle(),
  ]);
  const { data: profile } = profileResult;

  const inviteCompleted = !!profile?.invite_completed_at;
  const invitedAt = profile?.invited_at ?? null;

  const expiryHours = normalizeStudentInviteExpiryHours(
    settingsResult.data?.invite_expiry_hours ?? 24,
  );

  return { ok: true as const, inviteCompleted, invitedAt, expiryHours };
}

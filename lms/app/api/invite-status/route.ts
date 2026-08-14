import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVerifiedIdentity } from '@/lib/student-runtime/identity';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { normalizeStudentInviteExpiryHours } from '@/lib/services/student-invite-expiry';

/** Returns whether the current user has already completed the invite (set password),
 *  when they were invited (profile.invited_at), and the configured invite expiry hours. */
export async function GET() {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = identity.userId;

  const limited = await consumeRateLimit({ key: `invite-status:${userId}`, limit: 30, windowMs: 60 * 1000, failClosed: true });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: profile }, settingsData] = await Promise.all([
    supabase.from('profiles').select('invite_completed_at, invited_at').eq('id', userId).maybeSingle(),
    (async () => {
      try {
        const result = await admin.from('platform_settings').select('invite_expiry_hours').eq('id', 'default').maybeSingle();
        return result.data;
      } catch {
        return null;
      }
    })(),
  ]);
  const inviteCompleted = !!profile?.invite_completed_at;

  const invitedAt = profile?.invited_at ?? null;

  // Read configurable invite expiry from platform_settings
  const expiryHours = normalizeStudentInviteExpiryHours(settingsData?.invite_expiry_hours ?? 24);

  return NextResponse.json({ inviteCompleted, invitedAt, expiryHours });
}

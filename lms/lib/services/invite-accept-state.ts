import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashStudentInviteToken } from '@/lib/services/student-invite-crypto';
import { getStudentInviteExpiryHours } from '@/lib/services/student-invite-expiry';
import type { InviteAcceptUiState } from '@/lib/types/invite-accept';

export async function getInviteAcceptUiState(plainToken: string | null): Promise<{
  state: InviteAcceptUiState;
  expiryHours: number;
}> {
  const admin = createAdminClient();
  const expiryHours = await getStudentInviteExpiryHours(admin);

  if (!plainToken?.trim()) {
    return { state: 'missing_token', expiryHours };
  }

  const hash = hashStudentInviteToken(plainToken.trim());
  const { data: row, error } = await admin
    .from('student_invites')
    .select('status, revoked_at, accepted_at, expires_at')
    .eq('token_hash', hash)
    .maybeSingle();

  if (error) {
    const msg = (error.message ?? '').toLowerCase();
    if (msg.includes('student_invites') || error.code === '42P01') {
      console.warn('[invite/accept] student_invites table missing');
      return { state: 'invalid', expiryHours };
    }
    throw new Error(error.message);
  }

  if (!row) {
    console.warn('[invite/accept] verify rejected', { reason: 'not_found', token_hash_prefix: hash.slice(0, 8) });
    return { state: 'invalid', expiryHours };
  }

  if (row.accepted_at || row.status === 'accepted') {
    console.warn('[invite/accept] verify rejected', { reason: 'already_used', token_hash_prefix: hash.slice(0, 8) });
    return { state: 'already_used', expiryHours };
  }
  if (row.revoked_at || row.status === 'revoked') {
    console.warn('[invite/accept] verify rejected', { reason: 'revoked', token_hash_prefix: hash.slice(0, 8) });
    return { state: 'revoked', expiryHours };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    console.warn('[invite/accept] verify rejected', { reason: 'expired', token_hash_prefix: hash.slice(0, 8) });
    return { state: 'expired', expiryHours };
  }
  if (row.status !== 'pending') {
    console.warn('[invite/accept] verify rejected', { reason: 'bad_status', token_hash_prefix: hash.slice(0, 8) });
    return { state: 'invalid', expiryHours };
  }

  return { state: 'ok', expiryHours };
}

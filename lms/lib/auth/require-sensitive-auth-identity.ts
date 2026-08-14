import 'server-only';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export interface SensitiveAuthIdentity {
  userId: string;
  email: string | null;
}

/**
 * Auth-only sensitive identity verification helper.
 * Verifies authenticated Supabase Auth user identity without triggering student tenant authorization RPCs.
 * Used exclusively for self-service account security operations (password change, email change, multi-session revocation).
 */
export async function requireSensitiveAuthIdentity(): Promise<SensitiveAuthIdentity> {
  const headerStore = await headers();
  const claimUserId = headerStore.get('x-user-id');
  const claimEmail = headerStore.get('x-user-email');

  const supabase = await createClient();

  // Fresh identity verification call to Supabase Auth server
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('SESSION_VALIDATION_FAILED');
  }

  if (claimUserId && user.id !== claimUserId) {
    throw new Error('SESSION_VALIDATION_FAILED');
  }

  return {
    userId: user.id,
    email: user.email ?? claimEmail ?? null,
  };
}

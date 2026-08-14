import 'server-only';
import { headers } from 'next/headers';
import type { VerifiedIdentity } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string | null | undefined): id is string {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

/**
 * Reads proxy-injected headers set after JWT verification.
 * Rejects malformed IDs and returns a narrow application identity.
 * Does not manufacture missing values.
 */
export async function getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  
  if (!userId || !isValidUuid(userId)) {
    return null;
  }

  const email = headerStore.get('x-user-email') || null;
  const fullName = headerStore.get('x-user-fullname') || null;
  const globalRole = headerStore.get('x-global-role') || null;

  return {
    userId,
    email,
    fullName,
    globalRole,
  };
}

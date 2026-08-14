import 'server-only';

import { after } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { ensureSuperadminProfile } from '@/lib/auth/ensure-superadmin-profile';

export type SuperadminActionUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  globalRole: 'superadmin';
  isActive: true;
};

function emptyToNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Require SuperAdmin authentication in server actions.
 *
 * Uses the same verification model as requireSuperadmin():
 * 1. Fast path — proxy-injected headers from verified JWT app_metadata
 * 2. Claims fallback — Server Actions sometimes receive user id without role
 *    headers; re-read verified JWT claims for app_metadata.global_role
 * 3. Session fallback — resolve user id when headers are missing
 * 4. DB verification — profiles.global_role via ensureSuperadminProfile()
 *
 * This module is `server-only` (not `"use server"`) so callers invoke it as a
 * normal server function with the current request headers — not as a nested
 * Server Action round-trip.
 */
async function requireSuperadminAction(): Promise<SuperadminActionUser> {
  const headerStore = await headers();
  const headerUserId = emptyToNull(headerStore.get('x-user-id'));
  const headerRole = emptyToNull(headerStore.get('x-user-role'));
  const headerEmail = emptyToNull(headerStore.get('x-user-email'));
  const headerFullName = emptyToNull(headerStore.get('x-user-fullname'));

  if (headerUserId && headerRole === 'superadmin') {
    return {
      id: headerUserId,
      email: headerEmail,
      fullName: headerFullName ?? 'Super Admin',
      globalRole: 'superadmin',
      isActive: true,
    };
  }

  let userId = headerUserId;
  let email = headerEmail;
  let fullName = headerFullName;
  let claimsRole: string | null = null;

  // Re-resolve from verified JWT claims when middleware headers are incomplete.
  // Common for Server Action POSTs where x-user-id is present but x-user-role is empty,
  // while page renders still received the role header (layout fast path).
  if (!userId || headerRole !== 'superadmin') {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      const claims = data?.claims;
      if (claims?.sub) {
        userId = userId ?? String(claims.sub);
        if (!email && typeof claims.email === 'string') {
          email = claims.email;
        }
        const appMeta = claims.app_metadata as Record<string, unknown> | undefined;
        const userMeta = claims.user_metadata as Record<string, unknown> | undefined;
        if (typeof appMeta?.global_role === 'string') {
          claimsRole = appMeta.global_role;
        }
        if (!fullName && typeof userMeta?.full_name === 'string') {
          fullName = userMeta.full_name;
        }
      }
    } catch {
      // Fall through to session / DB paths.
    }
  }

  if (userId && claimsRole === 'superadmin') {
    return {
      id: userId,
      email,
      fullName: fullName ?? 'Super Admin',
      globalRole: 'superadmin',
      isActive: true,
    };
  }

  if (!userId) {
    const { session } = await getSession();
    if (!session?.user?.id) {
      after(() => console.warn('[auth/action] requireSuperadminAction: unauthenticated request'));
      throw new Error('Unauthorized: authentication required');
    }
    userId = session.user.id;
    email = email ?? session.user.email ?? null;
    const appMeta = session.user.app_metadata as Record<string, unknown> | undefined;
    if (!claimsRole && typeof appMeta?.global_role === 'string') {
      claimsRole = appMeta.global_role;
    }
  }

  if (claimsRole === 'superadmin') {
    return {
      id: userId,
      email,
      fullName: fullName ?? 'Super Admin',
      globalRole: 'superadmin',
      isActive: true,
    };
  }

  const profile = await ensureSuperadminProfile({ id: userId, email });
  if (!profile || profile.global_role !== 'superadmin') {
    after(() =>
      console.warn('[auth/action] requireSuperadminAction: non-superadmin attempt', {
        userId,
        headerRole,
        claimsRole,
        profileRole: profile?.global_role ?? null,
      }),
    );
    throw new Error('Forbidden: superadmin role required');
  }

  if (profile.is_active === false || profile.suspended_at != null) {
    after(() => console.warn('[auth/action] requireSuperadminAction: inactive user attempt'));
    throw new Error('Forbidden: account is deactivated');
  }

  return {
    id: profile.id,
    email: profile.email ?? email ?? null,
    fullName: profile.full_name ?? fullName,
    globalRole: 'superadmin',
    isActive: true,
  };
}

/**
 * Convenience wrapper that returns { ok: false, error } instead of throwing.
 * Use in server actions that return result objects.
 */
async function requireSuperadminActionSafe(): Promise<
  | { ok: true; user: SuperadminActionUser }
  | { ok: false; error: string }
> {
  try {
    const user = await requireSuperadminAction();
    return { ok: true, user };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unauthorized.' };
  }
}

/**
 * Alias for requireSuperadminActionSafe.
 */
export const requireAuth = requireSuperadminActionSafe;

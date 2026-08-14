import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ensureSuperadminProfile } from '@/lib/auth/ensure-superadmin-profile';

export interface SuperAdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  globalRole: 'superadmin';
  isActive: boolean;
}

class SuperadminAuthError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isSuperadminAuthError(error: unknown): error is SuperadminAuthError {
  return error instanceof SuperadminAuthError;
}

function deny(options: { forApi?: boolean; redirectTo: string; status: number; code: string; message: string }): never {
  if (options.forApi) {
    throw new SuperadminAuthError(options.status, options.code, options.message);
  }
  redirect(options.redirectTo);
}

/**
 * Fast path: read session from middleware-injected headers. No network call.
 * Use in page components that need user identity but don't need full profile.
 */
export const getSessionFromHeaders = cache(async function getSessionFromHeaders() {
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  const userEmail = headerStore.get('x-user-email');
  const globalRole = headerStore.get('x-user-role');

  if (!userId) return null;
  return { id: userId, email: userEmail, globalRole };
});

/**
 * Full superadmin auth — uses FAST PATH (header role check) first, then DB for profile.
 *
 * SECURITY MODEL:
 * - Middleware strips ALL incoming auth headers and sets them from verified JWT claims/app_metadata.
 * - x-user-role comes from app_metadata.global_role (server-controlled).
 * - If app_metadata lacks global_role, header is empty and fast path fails.
 * - Fast path is safe only because headers are sanitized and set from app_metadata.
 * - If fast path conditions aren't met, falls back to DB (ensureSuperadminProfile → profiles table).
 */
export const requireSuperadmin = cache(async function requireSuperadmin(
  options?: { forApi?: boolean; redirectTo?: string }
): Promise<SuperAdminUser> {
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  const userEmail = headerStore.get('x-user-email');
  const globalRole = headerStore.get('x-user-role');

  if (!userId) {
    deny({
      forApi: options?.forApi,
      redirectTo: options?.redirectTo ?? '/login',
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required.',
    });
  }

  // FAST PATH: JWT claim already proves superadmin — skip DB for role verification
  if (globalRole === 'superadmin') {
    const userFullName = headerStore.get('x-user-fullname');
    return {
      id: userId!,
      email: userEmail ?? null,
      fullName: userFullName ?? 'Super Admin',
      globalRole: 'superadmin',
      isActive: true,
    };
  }

  // SLOW PATH: JWT claim missing/incorrect — verify via DB (rare, first load or token expired)
  const profile = await ensureSuperadminProfile({ id: userId!, email: userEmail });

  if (!profile) {
    deny({
      forApi: options?.forApi,
      redirectTo: '/login?error=missing_profile',
      status: 403,
      code: 'MISSING_PROFILE',
      message: 'Superadmin profile is missing.',
    });
  }

  if (profile.global_role !== 'superadmin') {
    deny({
      forApi: options?.forApi,
      redirectTo: '/login?error=not_authorized',
      status: 403,
      code: 'NOT_AUTHORIZED',
      message: 'Superadmin role is required.',
    });
  }

  if (profile.is_active === false || profile.suspended_at != null) {
    deny({
      forApi: options?.forApi,
      redirectTo: '/login?error=inactive_account',
      status: 403,
      code: 'ACCOUNT_INACTIVE',
      message: 'Account is deactivated.',
    });
  }

  return {
    id: profile.id,
    email: profile.email ?? userEmail ?? null,
    fullName: profile.full_name ?? null,
    globalRole: 'superadmin',
    isActive: true,
  };
});
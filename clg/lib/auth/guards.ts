import 'server-only';
/**
 * Auth guards for College Admin.
 *
 * SECURITY NOTE: autoActivateMembership is used to auto-activate invited memberships
 * (status: 'invited' -> 'active'). This is safe because:
 * 1. It only activates memberships, never creates or deletes them
 * 2. The user is already authenticated via JWT claims verified by middleware
 * 3. The update only proceeds if the membership exists AND is in 'invited' status
 * 4. All authorization is enforced server-side via RLS policies on auth.uid()
 *
 * SECURITY NOTE: Header-based fast path was removed in Phase 2.6.
 * All auth context is now resolved via DB/RPC (getCollegeAdminAuthContext),
 * which queries profiles + college_memberships + colleges directly.
 * Middleware-injected headers (x-user-id, x-college-role, etc.) are sanitized
 * and set from app_metadata (server-controlled), but this guard does not
 * trust them for authorization — it always verifies via DB.
 */
import { redirect } from 'next/navigation';
import { cache } from 'react';
import {
  getCollegeAdminAuthContext,
  SUPERADMIN_TENANT_MEMBERSHIP_SENTINEL,
  type CollegeAdminAuthContext,
} from '@/lib/auth/context';
import { autoActivateMembership } from '@/lib/auth/auto-activate-membership';
import type { RedirectReason } from '@/lib/auth/redirects';

export type { CollegeAdminAuthContext, CollegeAdminUser, CollegeAdminMembership, CollegeAdminTenant } from '@/lib/auth/context';

class AuthError extends Error {
  status: number;
  code: RedirectReason;

  constructor(status: number, code: RedirectReason, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface GuardOptions {
  forApi?: boolean;
  redirectTo?: string;
}

function deny(options: GuardOptions & { status: number; code: RedirectReason; message: string }): never {
  if (options.forApi) {
    throw new AuthError(options.status, options.code, options.message);
  }
  redirect(options.redirectTo ?? '/login');
}

/**
 * Primary guard — resolves full auth context via DB/RPC.
 * Middleware-injected headers are NOT trusted for authorization.
 * All role/tenant/membership checks are performed via getCollegeAdminAuthContext
 * which queries profiles + college_memberships + colleges directly.
 */
export const requireCollegeAdmin = cache(async (
  collegeSlug: string,
  options?: GuardOptions & { allowedRoles?: Array<'college_admin' | 'faculty_spoc' | 'mentor'> }
): Promise<CollegeAdminAuthContext> => {
  const defaultRedirect = `/c/${encodeURIComponent(collegeSlug)}/admin/login?reason=unauthenticated`;
  const context = await getCollegeAdminAuthContext(collegeSlug);

  if (!context) {
    deny({
      ...options,
      redirectTo: options?.redirectTo ?? defaultRedirect,
      status: 401,
      code: 'unauthenticated',
      message: 'Authentication required.',
    });
  }

  if (options?.allowedRoles && !options.allowedRoles.includes(context!.membership.role)) {
    deny({
      ...options,
      redirectTo: '/unauthorized?reason=forbidden_role',
      status: 403,
      code: 'forbidden_role',
      message: 'Insufficient role permissions.',
    });
  }

  if (
    context!.membership.status === 'invited' &&
    context!.membership.id !== SUPERADMIN_TENANT_MEMBERSHIP_SENTINEL
  ) {
    autoActivateMembership(context!.membership.id);
  }

  return context!;
});
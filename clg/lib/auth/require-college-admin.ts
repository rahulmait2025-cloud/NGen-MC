import { cache } from 'react';
import { requireCollegeAdmin as requireCollegeAdminGuard, type CollegeAdminAuthContext } from '@/lib/auth/guards';
import type { CurrentMembership, CurrentTenant, CurrentUser } from '@/lib/tenant/get-tenant';

export interface CollegeAdminContext {
  user: CurrentUser;
  tenant: CurrentTenant;
  membership: CurrentMembership;
}

/**
 * Use in Server Components under /c/[collegeSlug]/admin/* (except login).
 * Wraps the new guards.requireCollegeAdmin() for backward compatibility.
 * Wrapped with React.cache() to deduplicate within a single request.
 */
export const requireCollegeAdmin = cache(async (collegeSlug: string): Promise<CollegeAdminContext> => {
  const context: CollegeAdminAuthContext = await requireCollegeAdminGuard(collegeSlug);

  return {
    user: {
      id: context.user.id,
      email: context.user.email,
      fullName: context.user.fullName,
      isActive: context.user.isActive,
      globalRole: context.user.globalRole,
    },
    tenant: {
      id: context.tenant.id,
      name: context.tenant.name,
      slug: context.tenant.slug,
      shortName: context.tenant.shortName,
      logoUrl: context.tenant.logoUrl,
      primaryColor: context.tenant.primaryColor,
      secondaryColor: context.tenant.secondaryColor,
    },
    membership: {
      id: context.membership.id,
      collegeId: context.membership.collegeId,
      role: context.membership.role,
      status: context.membership.status,
    },
  };
});

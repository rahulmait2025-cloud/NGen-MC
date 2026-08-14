import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@/lib/auth/session';
import { resolveLoginRouteContext } from '@/lib/auth/login-route-context';
import { createClient } from '@/lib/supabase/server';
import type { CurrentTenant, CurrentUser } from '@/lib/tenant/get-tenant';
import { cacheTag } from 'next/cache';

export interface AdminContext {
  tenant: CurrentTenant;
  user: CurrentUser;
  collegeId: string;
  isSuperAdmin: boolean;
}

interface GuardOptions {
  forApi?: boolean;
}

function deny(forApi?: boolean, errorMsg: string = 'Unauthorized'): never {
  if (forApi) {
    throw new Error(errorMsg);
  }
  redirect('/login?error=' + encodeURIComponent(errorMsg));
}

export const requireAdmin = cache(async function requireAdmin(
  collegeSlug: string,
  options?: GuardOptions
): Promise<AdminContext> {
  // Fast-path: check proxy headers before doing any DB lookups.
  // The middleware already validated the JWT and set these headers.
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  const userRole = headerStore.get('x-user-role');
  const collegeRole = headerStore.get('x-college-role');
  const collegeIdHeader = headerStore.get('x-college-id');
  const userEmail = headerStore.get('x-user-email');
  const userFullName = headerStore.get('x-user-fullname');

  if (userId && (userRole === 'superadmin' || collegeRole === 'college_admin' || collegeRole === 'faculty_spoc')) {
    // We have proxy-validated headers. Skip DB lookups for superadmins.
    // For college admins, we still need to verify the college slug matches.
    const isSuperAdmin = userRole === 'superadmin';
    if (isSuperAdmin) {
      // Superadmin: construct context directly from headers
      // Still need to resolve the college by slug for the tenant info
      const supabase = await createClient();
      const normalizedSlug = collegeSlug.trim();
      const { data: college } = await supabase
        .from('colleges')
        .select('id, name, slug, short_name, logo_url, primary_color, secondary_color')
        .ilike('slug', normalizedSlug)
        .eq('status', 'active')
        .maybeSingle();
      cacheTag('lms-tenant-branding');
      if (college) {
        return {
          tenant: {
            id: college.id,
            name: college.name,
            slug: college.slug,
            shortName: college.short_name,
            logoUrl: college.logo_url,
            primaryColor: college.primary_color,
            secondaryColor: college.secondary_color,
          },
          user: {
            id: userId,
            email: userEmail,
            fullName: userFullName,
            isActive: true,
          },
          collegeId: college.id,
          isSuperAdmin: true,
        };
      }
    } else if (collegeIdHeader) {
      // College admin with proxy headers: skip route context resolution
      // but still verify college membership
      const supabase = await createClient();
      const normalizedSlug = collegeSlug.trim();
      const { data: college } = await supabase
        .from('colleges')
        .select('id, name, slug, short_name, logo_url, primary_color, secondary_color')
        .ilike('slug', normalizedSlug)
        .eq('status', 'active')
        .maybeSingle();
      cacheTag('lms-tenant-branding');

      if (college) {
        // Verify membership exists for this college
        const { data: membership } = await supabase
          .from('college_memberships')
          .select('role, status')
          .eq('user_id', userId)
          .eq('college_id', college.id)
          .in('role', ['college_admin', 'faculty_spoc'])
          .in('status', ['active', 'invited'])
          .maybeSingle();

        if (membership) {
          return {
            tenant: {
              id: college.id,
              name: college.name,
              slug: college.slug,
              shortName: college.short_name,
              logoUrl: college.logo_url,
              primaryColor: college.primary_color,
              secondaryColor: college.secondary_color,
            },
            user: {
              id: userId,
              email: userEmail,
              fullName: userFullName,
              isActive: true,
            },
            collegeId: college.id,
            isSuperAdmin: false,
          };
        }
      }
    }
  }

  // Fallback: full DB-backed auth flow
  const { session } = await getSession();
  if (!session?.user) {
    deny(options?.forApi, 'unauthenticated');
  }

  const supabase = await createClient();
  const routeContext = await resolveLoginRouteContext(session.user.id, supabase);
  if (!routeContext || routeContext.profile_is_active === false) {
    deny(options?.forApi, 'account_disabled');
  }

  const isSuperAdmin = routeContext.profile_global_role === 'superadmin';

  const normalizedSlug = collegeSlug.trim();
  const { data: college, error } = await supabase
    .from('colleges')
    .select('id, name, slug, short_name, logo_url, primary_color, secondary_color')
    .ilike('slug', normalizedSlug)
    .eq('status', 'active')
    .maybeSingle();
  cacheTag('lms-tenant-branding');

  if (!college || error) {
    deny(options?.forApi, 'no_access');
  }

  if (!isSuperAdmin) {
    const { data: membership } = await supabase
      .from('college_memberships')
      .select('role, status')
      .eq('user_id', session.user.id)
      .eq('college_id', college.id)
      .in('role', ['college_admin', 'faculty_spoc'])
      .in('status', ['active', 'invited'])
      .maybeSingle();

    if (!membership) {
      deny(options?.forApi, 'unauthorized');
    }
  }

  return {
    tenant: {
      id: college.id,
      name: college.name,
      slug: college.slug,
      shortName: college.short_name,
      logoUrl: college.logo_url,
      primaryColor: college.primary_color,
      secondaryColor: college.secondary_color,
    },
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      fullName: (session.user.user_metadata?.full_name as string) ?? null,
      isActive: true,
    },
    collegeId: college.id,
    isSuperAdmin,
  };
});

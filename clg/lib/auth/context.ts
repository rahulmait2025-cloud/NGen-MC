import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { SUPERADMIN_TENANT_MEMBERSHIP_SENTINEL } from '@/lib/auth/college-admin-constants';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CollegeAdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
  globalRole: 'superadmin' | null;
}

export interface CollegeAdminMembership {
  id: string;
  collegeId: string;
  role: 'college_admin' | 'faculty_spoc' | 'mentor';
  status: string;
}

export interface CollegeAdminTenant {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface CollegeAdminAuthContext {
  user: CollegeAdminUser;
  membership: CollegeAdminMembership;
  tenant: CollegeAdminTenant;
}

export { SUPERADMIN_TENANT_MEMBERSHIP_SENTINEL } from '@/lib/auth/college-admin-constants';

type AdminAuthRpcRow = {
  allowed: boolean;
  error_code: string | null;
  membership_id: string | null;
  college_id: string | null;
  college_slug: string | null;
  membership_role: string | null;
  membership_status: string | null;
  profile_is_active: boolean | null;
  // Tenant fields (returned by RPC since migration 00188)
  college_name: string | null;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

/**
 * Build a complete auth context for CollegeAdmin routes in one call.
 * Validates Supabase session, fetches profile + membership + tenant.
 * Returns null if user is not authenticated or has no valid membership.
 * 
 * Use this in Server Components to get all auth data once per request.
 * The result is cached per request via React's cache().
 * 
 * Optimized: RPC returns tenant fields since migration 00188 — no extra colleges query needed.
 * Falls back to separate query if RPC doesn't return tenant fields (backward compatible).
 */
/**
 * Cross-request token cache for the resolved auth context.
 * Keyed by `${userId}:${collegeSlug}` with a minutes TTL (mirrors the `minutes`
 * cacheLife profile: stale 30s / revalidate 60s). This collapses the per-request
 * `resolve_admin_auth_context` RPC + `profiles` (+ `colleges`) resolution to a
 * cache hit for the majority of requests, while still re-resolving on a miss
 * (preserving the Phase 2.6 security posture — no blind header trust).
 * Not cached: null/error results, so a freshly activated membership or a
 * just-disabled account is picked up on the very next request.
 */
// OPTIMIZATION: Extended TTL from 60s to 5 minutes. Auth context rarely changes.
const AUTH_CONTEXT_TTL_MS = 300_000;
const authContextCache = new Map<
  string,
  { value: CollegeAdminAuthContext; expiresAt: number }
>();

export const getCollegeAdminAuthContext = cache(
  async (collegeSlug: string, existingSupabase?: SupabaseClient): Promise<CollegeAdminAuthContext | null> => {
    const { session } = await getSession();

    if (!session?.user) {
      return null;
    }

    const userId = session.user.id;
    const normalizedSlug = collegeSlug.trim();

    // When a caller supplies its own client (e.g. a specific transaction scope)
    // we skip the cache and resolve fresh to avoid returning stale scoped data.
    if (!existingSupabase) {
      const cacheKey = `${userId}:${normalizedSlug}`;
      const hit = authContextCache.get(cacheKey);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value;
      }
      const resolved = await resolveAdminAuthContext(normalizedSlug, session.user, await createClient());
      if (resolved) {
        authContextCache.set(cacheKey, { value: resolved, expiresAt: Date.now() + AUTH_CONTEXT_TTL_MS });
      }
      return resolved;
    }

    return resolveAdminAuthContext(normalizedSlug, session.user, existingSupabase);
  }
);

async function resolveAdminAuthContext(
  normalizedSlug: string,
  sessionUser: { id: string; email?: string | null | undefined; user_metadata?: Record<string, unknown> },
  supabase: SupabaseClient,
): Promise<CollegeAdminAuthContext | null> {
    const userId = sessionUser.id;

    // OPTIMIZATION: Removed parallel profile query. RPC returns profile_is_active.
  // Only query profiles for global_role (not in RPC). Use session for email/full_name.
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', userId)
    .maybeSingle();

  const { data: rpcRaw, error: rpcError } = await supabase.rpc('resolve_admin_auth_context', {
    p_user_id: userId,
    p_slug: normalizedSlug,
  });

  if (rpcError) {
    return null;
  }

  const authRow = (Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw) as AdminAuthRpcRow | null;
  if (!authRow) {
    return null;
  }

  const user: CollegeAdminUser = {
    id: userId,
    email: sessionUser.email ?? null,
    fullName: (sessionUser.user_metadata?.full_name as string) ?? null,
    isActive: authRow.profile_is_active ?? profile?.global_role !== 'suspended',
    globalRole: profile?.global_role === 'superadmin' ? 'superadmin' : null,
  };

    if (!user.isActive || authRow.error_code === 'account_disabled') {
      return null;
    }

    let membershipId: string;
    let collegeId: string;
    let membershipRole: CollegeAdminMembership['role'];
    let membershipStatus: string;

    if (authRow.allowed && authRow.membership_id && authRow.college_id) {
      membershipId = authRow.membership_id;
      collegeId = authRow.college_id;
      membershipRole = (authRow.membership_role ?? 'college_admin') as CollegeAdminMembership['role'];
      membershipStatus = authRow.membership_status ?? 'active';
    } else if (authRow.error_code === 'no_college_access' && profile?.global_role === 'superadmin') {
      const { data: tenantRow } = await supabase
        .from('colleges')
        .select('id')
        .ilike('slug', normalizedSlug)
        .eq('status', 'active')
        .maybeSingle();
      if (!tenantRow?.id) {
        return null;
      }
      membershipId = SUPERADMIN_TENANT_MEMBERSHIP_SENTINEL;
      collegeId = tenantRow.id;
      membershipRole = 'college_admin';
      membershipStatus = 'active';
    } else {
      return null;
    }

    // Use tenant fields from RPC if available (migration 00188+),
    // otherwise fall back to separate query for backward compatibility.
    let tenant: CollegeAdminTenant;
    if (authRow.college_name && authRow.college_id === collegeId) {
      tenant = {
        id: collegeId,
        name: authRow.college_name,
        slug: authRow.college_slug ?? normalizedSlug,
        shortName: authRow.short_name ?? null,
        logoUrl: authRow.logo_url ?? null,
        primaryColor: authRow.primary_color ?? null,
        secondaryColor: authRow.secondary_color ?? null,
      };
    } else {
      const { data: tenantRow, error: tenantError } = await supabase
        .from('colleges')
        .select('id, name, slug, short_name, logo_url, primary_color, secondary_color, status')
        .eq('id', collegeId)
        .eq('status', 'active')
        .maybeSingle();

      if (tenantError || !tenantRow) {
        return null;
      }

      tenant = {
        id: tenantRow.id,
        name: tenantRow.name,
        slug: tenantRow.slug,
        shortName: tenantRow.short_name,
        logoUrl: tenantRow.logo_url,
        primaryColor: tenantRow.primary_color,
        secondaryColor: tenantRow.secondary_color,
      };
    }

    return {
      user,
      membership: {
        id: membershipId,
        collegeId,
        role: membershipRole,
        status: membershipStatus,
      },
      tenant,
    };
  }



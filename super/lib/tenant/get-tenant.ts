import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth/session';
import type { StudentsRow } from '@/types/database';

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  globalRole: 'superadmin' | null;
  isActive: boolean;
}

export interface CurrentMembership {
  id: string;
  collegeId: string;
  role: 'college_admin' | 'student' | 'faculty_spoc';
  status: string;
}

export interface CurrentTenant {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

/**
 * Get current user and profile. Returns null if not authenticated.
 *
 * RLS BYPASS: Yes — uses createAdminClient() for profile lookup.
 * WHY: The session cookie may not have fully propagated in Supabase's auth
 * system when called immediately after login. The RLS-protected user-context
 * client would return no profile row in that window. The admin client
 * bypasses RLS to guarantee the profile is readable.
 * GUARD: getSession() validates the Supabase auth token server-side.
 * TENANT SCOPE: Filters by session.user.id (single-user lookup).
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const { session } = await getSession();
  if (!session?.user) return null;
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, email, global_role, is_active')
    .eq('id', session.user.id)
    .single();
  if (!profile) {
    // Profile row missing — return minimal user with no elevated role
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      fullName: session.user.user_metadata?.full_name ?? null,
      globalRole: null,
      isActive: true,
    };
  }
  return {
    id: profile.id,
    email: profile.email ?? session.user.email ?? null,
    fullName: profile.full_name ?? session.user.user_metadata?.full_name ?? null,
    globalRole: profile.global_role,
    isActive: profile.is_active,
  };
});

/** Get current user's active membership for a college (by college_id). */
async function getMembershipByCollegeId(collegeId: string): Promise<CurrentMembership | null> {
  const { session } = await getSession();
  if (!session?.user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('college_memberships')
    .select('id, college_id, role, status')
    .eq('user_id', session.user.id)
    .eq('college_id', collegeId)
    .eq('status', 'active')
    .single();
  if (!data) return null;
  return {
    id: data.id,
    collegeId: data.college_id,
    role: data.role,
    status: data.status,
  };
}

/** Get college by slug. Use for tenant resolution from URL. */
async function getTenantBySlug(slug: string): Promise<CurrentTenant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('colleges')
    .select('id, name, slug, short_name, logo_url, primary_color, secondary_color')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    shortName: data.short_name,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
  };
}

/** Get current user's active membership for a college by slug. */
 
async function _getMembershipBySlug(collegeSlug: string): Promise<CurrentMembership | null> {
  const tenant = await getTenantBySlug(collegeSlug);
  if (!tenant) return null;
  return getMembershipByCollegeId(tenant.id);
}

/** Get current user's student record for a college (by college_id). */
 
async function _getStudentByCollegeId(collegeId: string): Promise<StudentsRow | null> {
  const { session } = await getSession();
  if (!session?.user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('students')
    .select('id, user_id, college_id, student_code, cohort_id, program_id, year_or_semester, github_url, linkedin_url, resume_url, placement_ready_status, created_at, updated_at, custom_college_name')
    .eq('user_id', session.user.id)
    .eq('college_id', collegeId)
    .maybeSingle();
  return data;
}

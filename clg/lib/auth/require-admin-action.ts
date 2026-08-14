'use server';

import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { after } from 'next/server';
import { headers } from 'next/headers';

export type CollegeAdminActionUser = {
  userId: string;
  collegeId: string;
  collegeSlug: string;
  role: 'college_admin' | 'faculty_spoc' | 'mentor';
};

/**
 * Require CollegeAdmin authentication in server actions.
 * 
 * Validates:
 * - User is authenticated
 * - User has a valid admin membership (college_admin, faculty_spoc, or mentor)
 * - Membership is active or invited
 * - College is active
 * 
 * Returns the authenticated user with college context or null if unauthorized.
 * For page protection, use requireCollegeAdmin() from guards.ts instead.
 *
 * TENANT SCOPING: When expectedCollegeId is provided, it MUST be a UUID
 * (not a slug). The function queries college_memberships.college_id which
 * is a UUID column. Passing a slug will silently fail the filter.
 */
export async function requireCollegeAdminForAction(
  expectedCollegeId?: string
): Promise<CollegeAdminActionUser | null> {
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  const collegeId = headerStore.get('x-college-id');
  const collegeSlug = headerStore.get('x-college-slug');
  const collegeRole = headerStore.get('x-college-role');

  if (
    userId &&
    collegeId &&
    collegeSlug &&
    collegeRole &&
    ['college_admin', 'faculty_spoc', 'mentor'].includes(collegeRole)
  ) {
    if (expectedCollegeId && collegeId !== expectedCollegeId) {
      return null;
    }
    return {
      userId,
      collegeId,
      collegeSlug,
      role: collegeRole as CollegeAdminActionUser['role'],
    };
  }

  const { session } = await getSession();
  if (!session?.user) return null;

  const supabase = await createClient();
  const sessionUserId = session.user.id;

  const membershipQuery = supabase
    .from('college_memberships')
    .select('college_id, role')
    .eq('user_id', sessionUserId)
    .in('role', ['college_admin', 'faculty_spoc', 'mentor'])
    .in('status', ['active', 'invited'])
    .limit(1);

  if (expectedCollegeId) {
    membershipQuery.eq('college_id', expectedCollegeId);
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_active')
      .eq('id', sessionUserId)
      .maybeSingle(),
    membershipQuery.maybeSingle(),
  ]);

  if (profile?.is_active === false) {
    after(() => console.warn('[auth/action] requireCollegeAdminForAction: inactive user attempt:', sessionUserId));
    return null;
  }
  if (!membership?.college_id) return null;

  const { data: college } = await supabase
    .from('colleges')
    .select('slug, status')
    .eq('id', membership.college_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!college?.slug) return null;

  return {
    userId: sessionUserId,
    collegeId: membership.college_id,
    collegeSlug: college.slug,
    role: membership.role as CollegeAdminActionUser['role'],
  };
}

/**
 * Alias for requireCollegeAdminForAction.
 */
export const requireAuth = requireCollegeAdminForAction;

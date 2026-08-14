import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

import type { CurrentTenant, CurrentUser, CurrentMembership, CurrentStudentRecord } from '@/lib/auth/types';
export type { CurrentTenant, CurrentUser, CurrentMembership, CurrentStudentRecord };


/** Get college by slug for tenant resolution. Case-insensitive. Cached per request. */
export const getTenantBySlug = cache(async (slug: string): Promise<CurrentTenant | null> => {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('colleges')
    .select('id, name, slug, short_name, logo_url, primary_color, secondary_color')
    .ilike('slug', normalizedSlug)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[tenant] _getTenantBySlug', { slug: normalizedSlug, code: error.code, message: error.message });
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    shortName: data.short_name,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
  };
});

import { headers } from 'next/headers';

/** Get current user and profile. Returns null if not authenticated. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const headerStore = await headers();
    const userId = headerStore.get('x-user-id');
    if (userId) {
      const userEmail = headerStore.get('x-user-email');
      const userFullName = headerStore.get('x-user-fullname');
      return {
        id: userId,
        email: userEmail ?? null,
        fullName: userFullName ?? null,
        isActive: true,
      };
    }
  } catch {
    // headers() can throw in non-request contexts
  }
  return null;
});

/** Get current user's active membership for a college (by college_id). */
export const getMembershipByCollegeId = cache(async (collegeId: string): Promise<CurrentMembership | null> => {
  try {
    const headerStore = await headers();
    const userId = headerStore.get('x-user-id');
    const xCollegeId = headerStore.get('x-college-id');
    const membershipId = headerStore.get('x-membership-id');
    const collegeRole = headerStore.get('x-college-role');
    if (userId && xCollegeId === collegeId && membershipId) {
      return {
        id: membershipId,
        collegeId: xCollegeId,
        role: (collegeRole as CurrentMembership['role']) || 'student',
        status: 'active',
      };
    }
  } catch {}
  return null;
});

/** Get current user's student record for a college (by college_id). */
export const getStudentByCollegeId = cache(async (collegeId: string): Promise<CurrentStudentRecord | null> => {
  try {
    const headerStore = await headers();
    const userId = headerStore.get('x-user-id');
    const _xCollegeId = headerStore.get('x-college-id');
    const studentId = headerStore.get('x-student-id');

    if (userId) {
      const supabase = await createClient();
      let query = supabase
        .from('students')
        .select('id, student_code, year_or_semester, github_url, linkedin_url, resume_url, placement_ready_status, created_at, bio')
        .eq('user_id', userId);

      if (collegeId) {
        query = query.eq('college_id', collegeId);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          student_code: data.student_code ?? null,
          year_or_semester: data.year_or_semester ?? null,
          github_url: data.github_url ?? null,
          linkedin_url: data.linkedin_url ?? null,
          resume_url: data.resume_url ?? null,
          placement_ready_status: data.placement_ready_status ?? null,
          created_at: data.created_at ?? new Date().toISOString(),
          bio: data.bio ?? null,
        };
      }

      // Fallback: try matching by user_id alone if college_id didn't yield a row
      const { data: userStudent } = await supabase
        .from('students')
        .select('id, student_code, year_or_semester, github_url, linkedin_url, resume_url, placement_ready_status, created_at, bio')
        .eq('user_id', userId)
        .maybeSingle();

      if (userStudent) {
        return {
          id: userStudent.id,
          student_code: userStudent.student_code ?? null,
          year_or_semester: userStudent.year_or_semester ?? null,
          github_url: userStudent.github_url ?? null,
          linkedin_url: userStudent.linkedin_url ?? null,
          resume_url: userStudent.resume_url ?? null,
          placement_ready_status: userStudent.placement_ready_status ?? null,
          created_at: userStudent.created_at ?? new Date().toISOString(),
          bio: userStudent.bio ?? null,
        };
      }

      if (studentId) {
        return {
          id: studentId,
          student_code: null,
          year_or_semester: null,
          github_url: null,
          linkedin_url: null,
          resume_url: null,
          placement_ready_status: null,
          created_at: new Date().toISOString(),
          bio: null,
        };
      }
    }
  } catch (err) {
    console.error('[getStudentByCollegeId] error:', err);
  }

  return null;
});

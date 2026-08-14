import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { cacheLife, cacheTag } from 'next/cache';

export interface StudentResolverRow {
  user_id: string;
  membership_id: string | null;
  college_id: string | null;
  student_id: string | null;
  college_slug: string | null;
  membership_status: string | null;
  profile_is_active: boolean | null;
  allowed: boolean;
  error_code: string | null;
  college_name: string | null;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  profile_email: string | null;
  profile_full_name: string | null;
}

class NotAllowedError extends Error {
  constructor() {
    super('Not allowed');
  }
}

// Direct DB lookup bypassing persistent cache
export async function resolveStudentAuthContextDb(
  userId: string,
  collegeSlug: string
): Promise<StudentResolverRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .rpc('resolve_student_auth_context', {
      p_user_id: userId,
      p_slug: collegeSlug,
    })
    .single();

  if (error) {
    return null;
  }
  return data as unknown as StudentResolverRow | null;
}

// Persistently cached for ~300 seconds (allowed = true only)
async function resolveAllowedStudentAuthContextCached(
  userId: string,
  collegeSlug: string
): Promise<StudentResolverRow | null> {
  'use cache';
  cacheLife('fiveMinutes');
  cacheTag(`student-auth-${userId}-${collegeSlug}`, `student-profile-${userId}`);

  const data = await resolveStudentAuthContextDb(userId, collegeSlug);
  if (!data || !data.allowed) {
    throw new NotAllowedError();
  }
  return data;
}

// Persistently cached for 60 seconds (allowed = false or missing)
async function resolveDeniedStudentAuthContextCached(
  userId: string,
  collegeSlug: string
): Promise<StudentResolverRow | null> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag(`student-auth-${userId}-${collegeSlug}`, `student-profile-${userId}`);

  const data = await resolveStudentAuthContextDb(userId, collegeSlug);
  return data;
}

export async function resolveStudentAuthContextCached(
  userId: string,
  collegeSlug: string
): Promise<StudentResolverRow | null> {
  try {
    return await resolveAllowedStudentAuthContextCached(userId, collegeSlug);
  } catch {
    return await resolveDeniedStudentAuthContextCached(userId, collegeSlug);
  }
}

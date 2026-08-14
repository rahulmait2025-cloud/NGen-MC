import 'server-only';
import { cache } from 'react';
import { getOptionalStudentRuntime } from '@/lib/student-runtime/runtime';
import type { StudentContext } from './require-student';
import { createClient } from '@/lib/supabase/server';

/**
 * Resolves student context optionally (returns null if unauthenticated, has no active membership,
 * or belongs to a different tenant/collegeSlug).
 * Never redirects, never activates invited memberships, and never provisions a new student record.
 */
export const getOptionalStudentContext = cache(async function getOptionalStudentContext(
  collegeSlug: string
): Promise<StudentContext | null> {
  const runtime = await getOptionalStudentRuntime(collegeSlug, { freshness: 'cached', fallbackOnIncomplete: true });
  
  if (!runtime) {
    return null;
  }

  // Return an active student context only when the current user has valid access (active membership) for that tenant.
  // Never activate an invited membership.
  if (runtime.student.membershipStatus !== 'active') {
    return null;
  }

  let avatarUrl: string | null = null;
  try {
    const supabase = await createClient();
    const [profileRes, authUserRes] = await Promise.all([
      supabase.from('profiles').select('avatar_url').eq('id', runtime.identity.userId).maybeSingle(),
      supabase.auth.getUser(),
    ]);

    const googleAvatarUrl =
      (authUserRes?.data?.user?.user_metadata?.avatar_url as string | undefined) ||
      (authUserRes?.data?.user?.user_metadata?.picture as string | undefined) ||
      null;

    avatarUrl = profileRes?.data?.avatar_url || googleAvatarUrl || null;
  } catch {
    // Ignore error fetching avatar
  }

  return {
    tenant: {
      id: runtime.tenant.collegeId || '',
      name: runtime.tenant.claimSlug || collegeSlug,
      slug: runtime.tenant.claimSlug || collegeSlug,
      shortName: runtime.tenant.claimSlug || collegeSlug,
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
    },
    user: {
      id: runtime.identity.userId,
      email: runtime.identity.email,
      fullName: runtime.identity.fullName,
      avatarUrl,
      isActive: true,
    },
    membership: {
      id: runtime.student.membershipId || '',
      collegeId: runtime.tenant.collegeId || '',
      role: 'student',
      status: 'active',
    },
    studentId: runtime.student.studentId,
    isGlobal: runtime.tenant.isGlobal,
  };
});

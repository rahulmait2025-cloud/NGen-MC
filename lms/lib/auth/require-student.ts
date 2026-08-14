import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { requireStudentRuntime } from '@/lib/student-runtime/runtime';
import { StudentRuntimeError } from '@/lib/student-runtime/errors';
import type { CurrentTenant, CurrentMembership, CurrentUser } from '@/lib/tenant/get-tenant';

import { createClient } from '@/lib/supabase/server';

export interface StudentContext {
  tenant: CurrentTenant;
  user: CurrentUser;
  membership: CurrentMembership;
  studentId: string;
  isGlobal: boolean;
}

/**
 * Use in Server Components under /c/[collegeSlug]/student/* (except login).
 * Wraps requireStudentRuntime for backward compatibility.
 * Cached per-request.
 */
export const requireStudent = cache(async function requireStudent(collegeSlug: string): Promise<StudentContext> {
  let runtime;
  try {
    runtime = await requireStudentRuntime(collegeSlug, { freshness: 'cached' });
  } catch (err) {
    if (err instanceof StudentRuntimeError) {
      if (err.status === 401) {
        redirect('/login');
      }
      if (err.status === 403) {
        redirect('/unauthorized');
      }
    }
    throw err;
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
      status: runtime.student.membershipStatus || 'active',
    },
    studentId: runtime.student.studentId,
    isGlobal: runtime.tenant.isGlobal,
  };
});

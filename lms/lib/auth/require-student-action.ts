import 'server-only';
import { cache } from 'react';
import { requireStudentRuntimeForAction } from '@/lib/student-runtime/runtime';
import type { StudentAuthContext } from '@/lib/auth/context';

export type { StudentAuthContext } from '@/lib/auth/context';

/**
 * Require Student authentication in server actions or route handlers.
 * Delegates to the unified Student Runtime.
 */
export const requireStudentAction = cache(async function requireStudentAction(
  collegeSlug: string
): Promise<StudentAuthContext | null> {
  try {
    const runtime = await requireStudentRuntimeForAction(collegeSlug, { freshness: 'cached' });

    return {
      user: {
        id: runtime.identity.userId,
        email: runtime.identity.email || '',
        fullName: runtime.identity.fullName || 'Student User',
        isActive: true,
      },
      membership: {
        id: runtime.student.membershipId || '',
        collegeId: runtime.tenant.collegeId || '',
        role: 'student',
        status: runtime.student.membershipStatus || 'active',
      },
      studentId: runtime.student.studentId,
      tenant: {
        id: runtime.tenant.collegeId || '',
        name: collegeSlug,
        slug: collegeSlug,
        shortName: collegeSlug,
        logoUrl: null,
        primaryColor: null,
        secondaryColor: null,
      },
      isGlobal: runtime.tenant.isGlobal,
      collegeId: runtime.tenant.isGlobal ? null : runtime.tenant.collegeId,
    };
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Authentication failed');
  }
});

export const requireAuth = requireStudentAction;

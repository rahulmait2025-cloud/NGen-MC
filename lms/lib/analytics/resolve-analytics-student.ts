import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getVerifiedIdentity } from '@/lib/student-runtime/identity';
import { getOptionalStudentRuntime } from '@/lib/student-runtime/runtime';

export interface AnalyticsStudentContext {
  studentId: string;
  collegeId: string | null;
  isGlobal: boolean;
}

const DIRECT_LEARNER_SLUGS = new Set(['direct-learners', 'direct-learner']);

/**
 * Resolve the student row for analytics APIs using tenant slug when available.
 * Avoids wrong or empty results when a user has multiple student records.
 */
export async function resolveAnalyticsStudent(
  collegeSlug?: string | null,
): Promise<AnalyticsStudentContext | null> {
  if (collegeSlug?.trim()) {
    const runtime = await getOptionalStudentRuntime(collegeSlug.trim(), { fallbackOnIncomplete: true });
    if (runtime) {
      return {
        studentId: runtime.student.studentId,
        collegeId: runtime.tenant.collegeId || null,
        isGlobal: runtime.tenant.isGlobal,
      };
    }
  }

  const identity = await getVerifiedIdentity();
  if (!identity) return null;

  const admin = createAdminClient();

  const { data: students, error } = await admin
    .from('students')
    .select('id, college_id')
    .eq('user_id', identity.userId)
    .order('created_at', { ascending: true })
    .limit(1);

  const student = students?.[0];
  if (error || !student) return null;

  let isGlobal = true;
  if (student.college_id) {
    const { data: college } = await admin
      .from('colleges')
      .select('slug')
      .eq('id', student.college_id)
      .maybeSingle();
    if (college && !DIRECT_LEARNER_SLUGS.has(college.slug.toLowerCase())) {
      isGlobal = false;
    }
  }

  return {
    studentId: student.id,
    collegeId: student.college_id,
    isGlobal,
  };
}


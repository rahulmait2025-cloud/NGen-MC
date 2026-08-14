import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getCollegeAssignedCourseIds } from '@/lib/college-admin/analytics/college-scope';

export class CollegeInstitutionService {
  static async getOverview(collegeId: string) {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();

    const { count: totalStudents, error: studentsError } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('college_id', collegeId);

    if (studentsError) {
      throw new Error(`[college-analytics] students count: ${studentsError.message}`);
    }

    const courseIds = await getCollegeAssignedCourseIds(collegeId);

    return {
      entitledStudents: totalStudents ?? 0,
      assignedContent: courseIds.length,
    };
  }
}

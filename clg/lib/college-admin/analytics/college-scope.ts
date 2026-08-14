import 'server-only';

import { cache } from 'react';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAssignmentActive } from '@/lib/services/access-helpers';

function isMissingRelationError(message: string): boolean {
  return (
    message.includes('Could not find the table') ||
    message.includes('does not exist') ||
    message.includes('PGRST205')
  );
}

export const getCollegeStudentIds = cache(async function getCollegeStudentIds(collegeId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('college_id', collegeId)
    // TODO: .limit(5000) silently truncates for large colleges (>5000 students).
    // Replace with cursor-based pagination or an RPC call once student counts grow.
    .limit(5000);

  if (error) {
    throw new Error(`[college-analytics] students: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id);
});

export const getCollegeAssignedCourseIds = cache(async function getCollegeAssignedCourseIds(collegeId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('content_assignments')
    .select('assigned_entity_id, assigned_entity_type, status, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('assigned_entity_type', 'master_course')
    .eq('status', 'active');

  if (error) {
    throw new Error(`[college-analytics] content_assignments: ${error.message}`);
  }

  return [
    ...new Set(
      (data ?? []).reduce((acc, row) => {
        if (isAssignmentActive({
          status: row.status,
          start_date: row.start_date,
          end_date: row.end_date,
        })) {
          acc.push(row.assigned_entity_id);
        }
        return acc;
      }, [] as string[]),
    ),
  ];
});

export { isMissingRelationError };

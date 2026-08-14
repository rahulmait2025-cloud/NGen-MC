import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { StudentProgressService } from '@/lib/lms/analytics/services/progress';
import type { EntitledPillarGroup } from '@/lib/services/student-courses';
import { buildContinueLearningCard } from './_components/landing-data-mappers';
import type { ContinueLearningCard } from './_components/landing-data-types';

export async function loadContinueLearningForStudent(
  collegeSlug: string,
  studentId: string,
  entitledGroups: EntitledPillarGroup[],
): Promise<ContinueLearningCard | null> {
  const target = await StudentProgressService.getContinueLearningTarget(studentId);
  if (!target?.item_id) return null;

  const sb = createAdminClient();

  // Single query with join instead of 2 sequential queries (item → course title)
  const { data: item, error: itemError } = await sb
    .from('master_course_items')
    .select('id, title, master_course_id, master_courses!inner(id, title)')
    .eq('id', target.item_id)
    .maybeSingle();

  if (itemError || !item?.master_course_id) return null;

  const courseTitle = (item.master_courses as { title?: string } | null)?.title || 'Your course';

  return buildContinueLearningCard(
    collegeSlug,
    {
      item_id: target.item_id,
      last_position_seconds: target.last_position_seconds,
      updated_at: target.updated_at,
    },
    { title: item.title as string | null, master_course_id: item.master_course_id as string },
    entitledGroups,
    courseTitle,
  );
}

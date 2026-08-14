import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveCourseLaunchTarget } from '@/lib/student/learning/resolve-course-launch-target';

export interface FreeCourseItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount?: number;
  playlistId: string;
  isEnrolled?: boolean;
  learnHref?: string;
  detailsHref?: string;
}

export interface FreeCoursesData {
  courses: FreeCourseItem[];
}

/** Loads real student-visible free courses from database master_courses. */
export async function loadFreeCoursesData(
  collegeSlug: string,
  studentId: string | null = null,
  isGlobal: boolean = false,
  collegeId: string | null = null
): Promise<FreeCoursesData> {
  const admin = createAdminClient();

  // 1. Get all published free courses with visibility filters
  let coursesQuery = admin
    .from('master_courses')
    .select(`
      id,
      title,
      description,
      short_description,
      publish_status,
      metadata,
      visible_to_global_students,
      visible_to_college_students,
      master_course_modules (
        id,
        master_course_items (
          id
        )
      )
    `)
    .eq('course_kind', 'free_course')
    .eq('publish_status', 'published');

  if (isGlobal) {
    coursesQuery = coursesQuery.eq('visible_to_global_students', true);
  } else {
    coursesQuery = coursesQuery.eq('visible_to_college_students', true);
  }

  const [coursesResult, entitlementsResult] = await Promise.all([
    coursesQuery,
    studentId
      ? admin
          .from('student_entitlements')
          .select('master_course_id')
          .eq('student_id', studentId)
          .eq('status', 'active')
      : Promise.resolve({ data: null, error: null })
  ]);

  if (coursesResult.error) {
    console.error("Failed to load DB free courses:", coursesResult.error);
    return { courses: [] };
  }

  const entitledCourseIds = new Set(
    (entitlementsResult.data ?? []).map((e) => e.master_course_id)
  );

  const courses: FreeCourseItem[] = await Promise.all(
    (coursesResult.data ?? []).map(async (row) => {
      const meta = (row.metadata as Record<string, unknown>) ?? {};
      const thumbnail = (meta.thumbnail_url as string) || (meta.youtube_playlist_thumbnail_url as string) || '';

      const modules = row.master_course_modules ?? [];
      const lessons = modules.flatMap((m: { master_course_items?: unknown[] }) => m.master_course_items ?? []);
      const videoCount = lessons.length;
      const isEnrolled = entitledCourseIds.has(row.id);

      let learnHref: string | undefined;
      if (isEnrolled && studentId) {
        const launch = await resolveCourseLaunchTarget({
          collegeSlug,
          courseKey: row.id,
          studentId,
          isGlobal,
          collegeId,
        });
        if (launch.status === 'ready' || launch.status === 'no_lessons') {
          learnHref = launch.href;
        }
      }

      return {
        id: row.id,
        title: row.title,
        description: row.short_description || row.description || '',
        thumbnail,
        videoCount,
        playlistId: row.id,
        isEnrolled,
        learnHref,
        detailsHref: `/c/${encodeURIComponent(collegeSlug)}/student/pillars/free-courses/courses/${encodeURIComponent(row.id)}`,
      };
    }),
  );

  return { courses };
}

import { listStudentEntitledCoursesGroupedByPillar } from '@/lib/services/student-courses';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { EnrolledCourses } from './enrolled-courses';

/**
 * Async section: fetches enrolled courses and renders the enrolled courses list.
 * Streams in via Suspense after the static profile shell is visible.
 */
export async function EnrolledCoursesSection({ collegeSlug }: { collegeSlug: string }) {
  const entitledGroupsResult = await listStudentEntitledCoursesGroupedByPillar(collegeSlug).catch(() => []);

  const enrolledCourses = Array.isArray(entitledGroupsResult)
    ? entitledGroupsResult.flatMap((group) =>
        group.courses.map((course) => ({
          id: course.variant_id ? `variant:${course.variant_id}` : course.id,
          title: course.variant_title ?? course.title,
          pillarTitle: group.pillar.title,
          progressPercentage: course.progress_percentage ?? 0,
          learnHref: buildLearnHref(collegeSlug, course.id, { variantId: course.variant_id }),
        })),
      )
    : [];

  return (
    <EnrolledCourses courses={enrolledCourses} collegeSlug={collegeSlug} />
  );
}

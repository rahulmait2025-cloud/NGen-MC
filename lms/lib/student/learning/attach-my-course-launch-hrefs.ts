import 'server-only';

import type { MyCourseRow } from '@/lib/student/my-courses-types';
import { batchQueryFirstLessons } from '@/lib/student/learning/first-playable-lesson';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';

function isYoutubeRow(course: MyCourseRow): course is Extract<MyCourseRow, { is_youtube: true }> {
  return 'is_youtube' in course && course.is_youtube === true;
}

/**
 * Resolve canonical player entry URLs for My Courses cards (server-side).
 * Prefers first-lesson URLs; falls back to root learn for empty courses.
 *
 * Optimized: batch-fetches first lessons in a single DB query instead of
 * per-course `resolveCourseLaunchTarget` (which ran 6-8 queries each).
 */
export async function attachMyCourseLaunchHrefs(
  collegeSlug: string,
  _studentId: string,
  _isGlobal: boolean,
  _collegeId: string | null,
  courses: MyCourseRow[],
): Promise<MyCourseRow[]> {
  const nonYoutubeCourses = courses.filter((c) => !isYoutubeRow(c));

  // Single batch query for all non-youtube courses
  const firstLessons = await batchQueryFirstLessons(
    nonYoutubeCourses.map((c) => ({
      masterCourseId: c.id,
      variantId: 'variant_id' in c ? (c.variant_id ?? null) : null,
    })),
  );

  return courses.map((course) => {
    if (isYoutubeRow(course)) {
      return {
        ...course,
        learnHref: `/c/${collegeSlug}/student/courses/youtube/${course.playlist_id}`,
      };
    }

    const variantId = 'variant_id' in course ? (course.variant_id ?? null) : null;
    const courseSlug = course.slug ?? course.id;
    const firstLesson = firstLessons.get(course.id);

    if (firstLesson) {
      return {
        ...course,
        learnHref: buildLearnHref(collegeSlug, courseSlug, {
          variantId: variantId ?? undefined,
          itemId: firstLesson.id,
          itemSlug: firstLesson.slug,
        }),
      };
    }

    // No lessons found — fall back to root learn URL
    return {
      ...course,
      learnHref: buildLearnHref(collegeSlug, courseSlug, {
        variantId: variantId ?? undefined,
      }),
    };
  });
}

import 'server-only';

import { resolveCourseByKey, resolveCourseByKeyWithPaidContext } from '@/lib/resolvers';
import { validatePlayerCourseAccess } from '@/lib/services/player-access';
import { getStudentCourseDetail } from '@/lib/services/student-courses';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { isUuid } from '@/lib/utils/slug';
import {
  EMPTY_COURSE_MESSAGE,
  pickFirstCurriculumItem,
  queryFirstPlayableLesson,
} from '@/lib/student/learning/first-playable-lesson';

export type CourseLaunchTargetInput = {
  collegeSlug: string;
  courseKey: string;
  studentId: string;
  isGlobal: boolean;
  collegeId: string | null;
  variantId?: string | null;
  /** When true, resolve paid landing slugs and variant context. */
  usePaidContext?: boolean;
};

export type CourseLaunchTarget =
  | {
      status: 'ready';
      href: string;
      masterCourseId: string;
      courseSlug: string | null;
      firstItemId: string;
      firstItemSlug: string | null;
    }
  | {
      status: 'no_lessons';
      href: string;
      masterCourseId: string;
      courseSlug: string | null;
      message: string;
    }
  | {
      status: 'denied';
      reason: string;
      redirectHref?: string | null;
    }
  | { status: 'not_found' };

function buildLaunchHref(
  collegeSlug: string,
  courseSlug: string,
  variantId: string | null | undefined,
  lesson: { id: string; slug: string | null },
): string {
  return buildLearnHref(collegeSlug, courseSlug, {
    variantId: variantId ?? undefined,
    itemId: lesson.id,
    itemSlug: lesson.slug,
  });
}

/**
 * Canonical server-side resolver for student course player entry URLs.
 * Verifies access with the same rules as the course player, then targets the first lesson when available.
 */
export async function resolveCourseLaunchTarget(
  input: CourseLaunchTargetInput,
): Promise<CourseLaunchTarget> {
  const variantId = input.variantId?.trim() || null;
  const resolveOpts = {
    studentId: input.studentId,
    preferCourseId: isUuid(input.courseKey) ? input.courseKey : undefined,
  };
  const resolved = input.usePaidContext
    ? await resolveCourseByKeyWithPaidContext(input.courseKey, { ...resolveOpts, explicitVariantId: variantId })
    : await resolveCourseByKey(input.courseKey, resolveOpts);

  if (!resolved) {
    return { status: 'not_found' };
  }

  const access = await validatePlayerCourseAccess(
    input.studentId,
    resolved.id,
    { isGlobal: input.isGlobal, collegeId: input.collegeId },
    { collegeSlug: input.collegeSlug, variantId },
  );

  if (!access.allowed) {
    return {
      status: 'denied',
      reason: access.denyReason ?? 'access_denied',
      redirectHref: access.redirectHref,
    };
  }

  const courseSlug = access.source.courseSlug ?? resolved.slug ?? resolved.id;

  const firstLesson = await queryFirstPlayableLesson(resolved.id, variantId, input.collegeId);
  if (firstLesson) {
    return {
      status: 'ready',
      href: buildLaunchHref(input.collegeSlug, courseSlug, variantId, firstLesson),
      masterCourseId: resolved.id,
      courseSlug,
      firstItemId: firstLesson.id,
      firstItemSlug: firstLesson.slug,
    };
  }

  const courseDetail = await getStudentCourseDetail(input.collegeSlug, resolved.id, { variantId });
  const firstFromTree = courseDetail ? pickFirstCurriculumItem(courseDetail) : null;

  if (!firstFromTree) {
    return {
      status: 'no_lessons',
      href: buildLearnHref(input.collegeSlug, courseSlug, { variantId: variantId ?? undefined }),
      masterCourseId: resolved.id,
      courseSlug,
      message: EMPTY_COURSE_MESSAGE,
    };
  }

  return {
    status: 'ready',
    href: buildLaunchHref(input.collegeSlug, courseSlug, variantId, firstFromTree),
    masterCourseId: resolved.id,
    courseSlug,
    firstItemId: firstFromTree.id,
    firstItemSlug: firstFromTree.slug,
  };
}

export { EMPTY_COURSE_MESSAGE, pickFirstCurriculumItem, queryFirstPlayableLesson };

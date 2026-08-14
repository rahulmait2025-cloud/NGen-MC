import 'server-only';

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveCourseByKey, resolveCourseByKeyWithPaidContext } from '@/lib/resolvers';
import { validatePlayerCourseAccess } from '@/lib/services/player-access';
import { getStudentCourseDetail } from '@/lib/services/student-courses';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { isUuid } from '@/lib/utils/slug';
import {
  EMPTY_COURSE_MESSAGE,
  queryFirstPlayableLesson,
} from '@/lib/student/learning/first-playable-lesson';
import type { CourseForStudent } from '@/types/student-runtime';

export type LearnCourseMatch =
  | { matchedBy: 'id'; masterCourseId: string; courseSlug: string | null; variantId: string | null }
  | { matchedBy: 'slug'; masterCourseId: string; courseSlug: string | null; variantId: string | null }
  | { matchedBy: 'variant_id'; masterCourseId: string; courseSlug: string | null; variantId: string }
  | { matchedBy: 'variant_slug'; masterCourseId: string; courseSlug: string | null; variantId: string }
  | { matchedBy: 'paid_landing_slug'; masterCourseId: string; courseSlug: string | null; variantId: string | null };

export type LearningEntryInput = {
  collegeSlug: string;
  rawCourseParam: string;
  studentId: string;
  isGlobal: boolean;
  collegeId: string | null;
  variantId?: string | null;
};

export type LearningEntryResult =
  | {
      status: 'redirect';
      href: string;
      course: CourseForStudent;
      match: LearnCourseMatch;
      firstLessonId: string;
      firstLessonSlug: string | null;
      accessSource: string | null;
    }
  | {
      status: 'empty';
      course: CourseForStudent;
      match: LearnCourseMatch;
      message: string;
      accessSource: string | null;
      noLessonReason: string;
    }
  | {
      status: 'denied';
      reason: string;
      redirectHref?: string | null;
      match: LearnCourseMatch | null;
    }
  | {
      status: 'missing';
      reason: string;
      match: null;
    };

type ResolvedLearnCourse = {
  masterCourseId: string;
  courseSlug: string | null;
  variantId: string | null;
  matchedBy: LearnCourseMatch['matchedBy'];
};

const LEARN_ENTRY_DEBUG = process.env.LEARN_ENTRY_DEBUG === '1';

function logLearnEntryDebug(payload: Record<string, unknown>): void {
  if (!LEARN_ENTRY_DEBUG) return;
  console.info('[resolveLearningEntry]', payload);
}

async function resolveLearnCourseParam(
  rawCourseParam: string,
  explicitVariantId: string | null | undefined,
  studentId: string,
): Promise<ResolvedLearnCourse | null> {
  const trimmed = rawCourseParam.trim();
  if (!trimmed) return null;

  const variantId = explicitVariantId?.trim() || null;
  const resolveOpts = { studentId, preferCourseId: isUuid(trimmed) ? trimmed : undefined };

  if (variantId) {
    const sb = createAdminClient();
    const variantQuery = sb
      .from('course_variants')
      .select('id, slug, master_course_id')
      .eq('publish_status', 'published');

    const { data: variant } = isUuid(variantId)
      ? await variantQuery.eq('id', variantId).maybeSingle()
      : await variantQuery.eq('slug', variantId).maybeSingle();

    if (variant?.master_course_id) {
      const master = await resolveCourseByKey(variant.master_course_id as string, resolveOpts);
      if (master) {
        return {
          masterCourseId: master.id,
          courseSlug: master.slug,
          variantId: variant.id as string,
          matchedBy: isUuid(variantId) ? 'variant_id' : 'variant_slug',
        };
      }
    }
  }

  const direct = await resolveCourseByKey(trimmed, resolveOpts);
  if (direct) {
    return {
      masterCourseId: direct.id,
      courseSlug: direct.slug,
      variantId,
      matchedBy: isUuid(trimmed) ? 'id' : 'slug',
    };
  }

  const paidContext = await resolveCourseByKeyWithPaidContext(trimmed, {
    explicitVariantId: variantId,
    studentId,
  });
  if (paidContext) {
    return {
      masterCourseId: paidContext.id,
      courseSlug: paidContext.slug,
      variantId,
      matchedBy: isUuid(trimmed) ? 'id' : 'paid_landing_slug',
    };
  }

  return null;
}

async function loadMinimalCourseShell(masterCourseId: string): Promise<CourseForStudent | null> {
  const sb = createAdminClient();
  const { data: row } = await sb
    .from('master_courses')
    .select('id, created_at, updated_at, code, title, description, short_description, slug, pillar_id, bootcamp_id, is_free, pricing_model, selling_price, currency, publish_status, visible_to_college_students, visible_to_global_students, metadata, course_kind')
    .eq('id', masterCourseId)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (!row) return null;

  return {
    ...row,
    modules: [],
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {},
  } as unknown as CourseForStudent;
}

async function loadCourseShellForPlayer(
  collegeSlug: string,
  masterCourseId: string,
  variantId: string | null,
): Promise<CourseForStudent | null> {
  const detail = await getStudentCourseDetail(collegeSlug, masterCourseId, { variantId });
  if (detail) return detail;
  return loadMinimalCourseShell(masterCourseId);
}

function toMatch(resolved: ResolvedLearnCourse): LearnCourseMatch {
  return {
    matchedBy: resolved.matchedBy,
    masterCourseId: resolved.masterCourseId,
    courseSlug: resolved.courseSlug,
    variantId: resolved.variantId,
  } as LearnCourseMatch;
}

/**
 * Universal resolver for /learn/[courseParam] entry.
 * Never throws notFound — returns typed status for the route to handle.
 */
export const resolveLearningEntry = cache(async function resolveLearningEntry(
  input: LearningEntryInput,
): Promise<LearningEntryResult> {
  const variantId = input.variantId?.trim() || null;
  const resolved = await resolveLearnCourseParam(input.rawCourseParam, variantId, input.studentId);

  if (!resolved) {
    logLearnEntryDebug({
      rawCourseParam: input.rawCourseParam,
      matchedCourseId: null,
      matchedCourseSlug: null,
      matchedBy: null,
      userId: input.studentId,
      collegeSlug: input.collegeSlug,
      finalDecision: 'missing',
      reason: 'course_not_resolved',
    });
    return { status: 'missing', reason: 'course_not_resolved', match: null };
  }

  const access = await validatePlayerCourseAccess(
    input.studentId,
    resolved.masterCourseId,
    { isGlobal: input.isGlobal, collegeId: input.collegeId },
    { collegeSlug: input.collegeSlug, variantId: resolved.variantId ?? variantId },
  );

  const canonicalSlug = access.source.courseSlug ?? resolved.courseSlug ?? resolved.masterCourseId;
  const match = toMatch({ ...resolved, courseSlug: canonicalSlug });

  if (!access.allowed) {
    logLearnEntryDebug({
      rawCourseParam: input.rawCourseParam,
      matchedCourseId: resolved.masterCourseId,
      matchedCourseSlug: canonicalSlug,
      matchedBy: resolved.matchedBy,
      userId: input.studentId,
      collegeSlug: input.collegeSlug,
      accessSource: null,
      hasAccess: false,
      finalDecision: 'denied',
      reason: access.denyReason,
    });
    return {
      status: 'denied',
      reason: access.denyReason ?? 'access_denied',
      redirectHref: access.redirectHref,
      match,
    };
  }

  const accessSource = access.entitlementId
    ? 'student_entitlements'
    : access.accessLevel === 'full'
      ? 'full_course_access'
      : 'partial_content_access';

  const firstLesson = await queryFirstPlayableLesson(
    resolved.masterCourseId,
    resolved.variantId ?? variantId,
    input.collegeId,
  );

  const course = await loadCourseShellForPlayer(
    input.collegeSlug,
    resolved.masterCourseId,
    resolved.variantId ?? variantId,
  );

  if (!course) {
    logLearnEntryDebug({
      rawCourseParam: input.rawCourseParam,
      matchedCourseId: resolved.masterCourseId,
      matchedCourseSlug: canonicalSlug,
      matchedBy: resolved.matchedBy,
      userId: input.studentId,
      collegeSlug: input.collegeSlug,
      accessSource,
      hasAccess: true,
      firstLessonId: firstLesson?.id ?? null,
      firstLessonSlug: firstLesson?.slug ?? null,
      noLessonReason: 'published_course_row_missing',
      finalDecision: 'missing',
    });
    return { status: 'missing', reason: 'published_course_row_missing', match: null };
  }

  if (firstLesson) {
    const href = buildLearnHref(input.collegeSlug, canonicalSlug, {
      variantId: resolved.variantId ?? variantId ?? undefined,
      itemId: firstLesson.id,
      itemSlug: firstLesson.slug,
    });
    logLearnEntryDebug({
      rawCourseParam: input.rawCourseParam,
      matchedCourseId: resolved.masterCourseId,
      matchedCourseSlug: canonicalSlug,
      matchedBy: resolved.matchedBy,
      userId: input.studentId,
      collegeSlug: input.collegeSlug,
      accessSource,
      hasAccess: true,
      firstLessonId: firstLesson.id,
      firstLessonSlug: firstLesson.slug,
      finalDecision: 'redirect',
      href,
    });
    return {
      status: 'redirect',
      href,
      course,
      match,
      firstLessonId: firstLesson.id,
      firstLessonSlug: firstLesson.slug,
      accessSource,
    };
  }

  logLearnEntryDebug({
    rawCourseParam: input.rawCourseParam,
    matchedCourseId: resolved.masterCourseId,
    matchedCourseSlug: canonicalSlug,
    matchedBy: resolved.matchedBy,
    userId: input.studentId,
    collegeSlug: input.collegeSlug,
    accessSource,
    hasAccess: true,
    firstLessonId: null,
    firstLessonSlug: null,
    noLessonReason: 'no_published_visible_lessons',
    finalDecision: 'empty',
  });

  return {
    status: 'empty',
    course,
    match,
    message: EMPTY_COURSE_MESSAGE,
    accessSource,
    noLessonReason: 'no_published_visible_lessons',
  };
});

export { EMPTY_COURSE_MESSAGE };

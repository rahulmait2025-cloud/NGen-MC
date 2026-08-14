import 'server-only';

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStudentCourseDetail, getStudentLearningContext } from '@/lib/services/student-courses';
import { validatePlayerCourseAccess } from '@/lib/services/course-access-manager';
import { getLessonNote, listLessonBookmarks } from '@/lib/services/student-engagement';
import { listLessonResources } from '@/lib/services/student-resources';
import { normUuid } from '@/lib/utils';
import { isUuid } from '@/lib/utils/slug';
import { resolveCourseByKey, resolveItemByKey } from '@/lib/resolvers';
import type { CourseForStudent, CurriculumItem } from '@/types/student-runtime';
import type {
  CourseResourceSummary,
  LessonResourcesRow,
  StudentLessonBookmarksRow,
  StudentLessonNotesRow,
} from '@/types/database';

export interface PlayerPayloadResult {
  allowed: boolean;
  denyReason: string | null;
  redirectHref: string | null;
  variantId: string | null;
  course: CourseForStudent | null;
  activeItem: CurriculumItem | null;
  resources: LessonResourcesRow[];
  note: StudentLessonNotesRow | null;
  bookmarks: StudentLessonBookmarksRow[];
  courseResourceMeta: CourseResourceSummary[];
}

function findActiveItem(
  course: CourseForStudent,
  itemId: string,
): CurriculumItem | null {
  const want = normUuid(itemId);
  for (const mod of course.modules) {
    for (const item of mod.items) {
      if (normUuid(item.id) === want) {
        return item;
      }
    }
  }
  return null;
}

async function buildPlayerPayloadFallback(
  collegeSlug: string,
  courseId: string,
  itemId: string | null,
  variantId: string | null,
): Promise<PlayerPayloadResult> {
  const ctx = await getStudentLearningContext(collegeSlug);
  const access = await validatePlayerCourseAccess(
    ctx.studentId,
    courseId,
    { isGlobal: ctx.isGlobal, collegeId: ctx.collegeId },
    { collegeSlug, variantId, lessonId: itemId },
  );

  if (!access.allowed) {
    return {
      allowed: false,
      denyReason: access.denyReason,
      redirectHref: access.redirectHref,
      variantId,
      course: null,
      activeItem: null,
      resources: [],
      note: null,
      bookmarks: [],
      courseResourceMeta: [],
    };
  }

  const course = await getStudentCourseDetail(collegeSlug, courseId, { variantId });
  if (!course) {
    return {
      allowed: false,
      denyReason: 'course_unavailable',
      redirectHref: access.redirectHref,
      variantId,
      course: null,
      activeItem: null,
      resources: [],
      note: null,
      bookmarks: [],
      courseResourceMeta: [],
    };
  }

  const activeItem = itemId ? findActiveItem(course, itemId) : null;
  let resources: LessonResourcesRow[] = [];
  let note: StudentLessonNotesRow | null = null;
  let bookmarks: StudentLessonBookmarksRow[] = [];

  if (itemId && activeItem) {
    [resources, note, bookmarks] = await Promise.all([
      listLessonResources(ctx.studentId, courseId, itemId, ctx.isGlobal, ctx.collegeId),
      getLessonNote(ctx.studentId, courseId, itemId, ctx.isGlobal, ctx.collegeId),
      listLessonBookmarks(ctx.studentId, courseId, itemId, ctx.isGlobal, ctx.collegeId),
    ]);
  }

  return {
    allowed: true,
    denyReason: null,
    redirectHref: null,
    variantId,
    course,
    activeItem,
    resources,
    note,
    bookmarks,
    courseResourceMeta: [],
  };
}

/**
 * Consolidated course player payload. Uses the DB RPC when available; falls back to
 * validatePlayerCourseAccess + getStudentCourseDetail so free enrollments work when the RPC lags.
 */
export const getStudentCoursePlayerPayload = cache(async function getStudentCoursePlayerPayload(
  collegeSlug: string,
  courseId: string,
  itemId: string | null = null,
  variantId: string | null = null,
): Promise<PlayerPayloadResult> {
  const ctx = await getStudentLearningContext(collegeSlug);
  const sb = createAdminClient();

  // 1. Resolve Course UUID
  let resolvedCourseId = courseId;
  if (courseId && !isUuid(courseId)) {
    const resolvedCourse = await resolveCourseByKey(courseId, { studentId: ctx.studentId });
    if (!resolvedCourse) {
      return {
        allowed: false,
        denyReason: 'course_not_found',
        redirectHref: null,
        variantId: null,
        course: null,
        activeItem: null,
        resources: [],
        note: null,
        bookmarks: [],
        courseResourceMeta: [],
      };
    }
    resolvedCourseId = resolvedCourse.id;
  }

  // 2. Resolve Item UUID
  let resolvedItemId: string | null = itemId || null;
  if (itemId && !isUuid(itemId)) {
    const resolvedItem = await resolveItemByKey(resolvedCourseId, itemId);
    resolvedItemId = resolvedItem ? resolvedItem.id : null;
  }

  // 3. Resolve Variant UUID
  let resolvedVariantId: string | null = variantId || null;
  if (variantId && !isUuid(variantId)) {
    const { data: variantData } = await sb
      .from('course_variants')
      .select('id')
      .eq('slug', variantId)
      .maybeSingle();
    resolvedVariantId = variantData ? variantData.id : null;
  }

  const p_student_id = ctx.studentId && isUuid(ctx.studentId) ? ctx.studentId : null;
  const p_college_id = ctx.collegeId && isUuid(ctx.collegeId) ? ctx.collegeId : null;

  if (!p_student_id || !resolvedCourseId || !isUuid(resolvedCourseId)) {
    return {
      allowed: false,
      denyReason: !p_student_id ? 'unauthenticated' : 'course_not_found',
      redirectHref: null,
      variantId: null,
      course: null,
      activeItem: null,
      resources: [],
      note: null,
      bookmarks: [],
      courseResourceMeta: [],
    };
  }

  const { data, error } = await sb.rpc('get_student_course_player_payload', {
    p_student_id,
    p_college_id,
    p_course_id: resolvedCourseId,
    p_item_id: resolvedItemId,
    p_variant_id: resolvedVariantId,
    p_college_slug: collegeSlug,
  });

  if (!error && data && (data as { allowed?: boolean }).allowed) {
    const payload = data as Record<string, unknown>;
    return {
      allowed: true,
      denyReason: (payload.deny_reason as string | null) ?? null,
      redirectHref: (payload.redirect_href as string | null) ?? null,
      variantId: (payload.variant_id as string | null) ?? variantId,
      course: (payload.course as CourseForStudent | null) ?? null,
      activeItem: (payload.active_item as CurriculumItem | null) ?? null,
      resources: (payload.resources as LessonResourcesRow[]) ?? [],
      note: (payload.note as StudentLessonNotesRow | null) ?? null,
      bookmarks: (payload.bookmarks as StudentLessonBookmarksRow[]) ?? [],
      courseResourceMeta: (payload.course_resource_meta as CourseResourceSummary[]) ?? [],
    };
  }

  if (error) {
    console.warn('[player-payload] RPC unavailable, using access fallback:', error.message);
  }

  return buildPlayerPayloadFallback(collegeSlug, courseId, itemId, variantId);
});

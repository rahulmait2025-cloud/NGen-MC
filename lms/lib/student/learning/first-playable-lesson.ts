import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { areCoursesFree, isFreeCourse } from '@/lib/services/entitlement-cache';
import { resolveDiscoverableVariantItemScope } from '@/lib/services/student-discoverable-catalog';
import { normUuid } from '@/lib/utils';
import type { CourseForStudent, CurriculumItem } from '@/types/student-runtime';

type ModuleItemRow = {
  id: string;
  slug: string | null;
  sort_order: number | null;
  publish_status: string | null;
  created_at?: string;
  item_type?: string | null;
  video_source?: string | null;
  youtube_video_id?: string | null;
  video_asset_id?: string | null;
};

type ModuleRow = {
  id: string;
  master_course_id: string;
  sort_order: number | null;
  publish_status: string | null;
  visible_to_students: boolean | null;
  created_at: string | null;
  master_course_items: ModuleItemRow[] | null;
};

type BatchInput = {
  masterCourseId: string;
  variantId?: string | null;
  collegeId?: string | null;
};

export const EMPTY_COURSE_MESSAGE =
  'This course is being prepared. Please check back soon.';

export type FirstLessonRow = {
  id: string;
  slug: string | null;
  item_type?: string | null;
  video_source?: string | null;
  youtube_video_id?: string | null;
  video_asset_id?: string | null;
};

/** Pick the first lesson in module/item sort order from a loaded course tree. */
export function pickFirstCurriculumItem(course: CourseForStudent): CurriculumItem | null {
  const includeUnpublished =
    !!course.is_free
    || course.pricing_model === 'free'
    || (course as { course_kind?: string | null }).course_kind === 'free_course';

  let first: CurriculumItem | null = null;
  let firstSortKey = Number.POSITIVE_INFINITY;

  for (let mi = 0; mi < course.modules.length; mi += 1) {
    const mod = course.modules[mi];
    if (mod.visible_to_students === false) continue;
    const modOrder = mod.sort_order ?? mi;
    for (const item of mod.items) {
      if (!includeUnpublished && item.publish_status !== 'published') continue;
      const sortKey = modOrder * 1_000_000 + (item.sort_order ?? 0);
      if (sortKey < firstSortKey) {
        first = item;
        firstSortKey = sortKey;
      }
    }
  }

  return first;
}

/**
 * Lightweight first-lesson lookup — does not require video_asset_id.
 * Supports YouTube, TPStreams, and non-video lesson types.
 */
export async function queryFirstPlayableLesson(
  masterCourseId: string,
  variantId?: string | null,
  collegeId?: string | null,
): Promise<FirstLessonRow | null> {
  const includeUnpublished = await isFreeCourse(masterCourseId);
  const sb = createAdminClient();

  const { data: modules } = await sb
    .from('master_course_modules')
    .select(
      `id, sort_order, publish_status, visible_to_students, created_at,
       master_course_items(
         id, slug, sort_order, publish_status, created_at, item_type,
         video_source, youtube_video_id, video_asset_id
       )`,
    )
    .eq('master_course_id', masterCourseId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  let allowedIds: Set<string> | null = null;
  const trimmedVariant = variantId?.trim();
  if (trimmedVariant) {
    const scope = await resolveDiscoverableVariantItemScope(
      trimmedVariant,
      masterCourseId,
      collegeId ?? null,
    );
    if (!scope) return null;
    allowedIds = scope.itemIds;
  }

  const sortedModules = (modules ?? []).toSorted((a, b) => {
    const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (diff !== 0) return diff;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });

  let first: (FirstLessonRow & { sortKey: number }) | null = null;

  for (const mod of sortedModules) {
    if (!includeUnpublished && mod.publish_status !== 'published') continue;
    if (mod.visible_to_students === false) continue;

    const items = ((mod.master_course_items ?? []) as Array<{
      id: string;
      slug: string | null;
      sort_order: number | null;
      publish_status: string | null;
      created_at?: string;
      item_type?: string | null;
      video_source?: string | null;
      youtube_video_id?: string | null;
      video_asset_id?: string | null;
    }>).toSorted((a, b) => {
      const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (diff !== 0) return diff;
      return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
    });

    for (const item of items) {
      if (!includeUnpublished && item.publish_status !== 'published') continue;
      if (allowedIds) {
        const itemAllowed = [...allowedIds].some((id) => normUuid(id) === normUuid(item.id));
        if (!itemAllowed) continue;
      }
      const modOrder = mod.sort_order ?? 0;
      const itemOrder = item.sort_order ?? 0;
      const sortKey = modOrder * 1_000_000 + itemOrder;
      if (!first || sortKey < first.sortKey) {
        first = {
          id: item.id,
          slug: item.slug,
          item_type: item.item_type ?? null,
          video_source: item.video_source ?? null,
          youtube_video_id: item.youtube_video_id ?? null,
          video_asset_id: item.video_asset_id ?? null,
          sortKey,
        };
      }
    }
  }

  return first
    ? {
        id: first.id,
        slug: first.slug,
        item_type: first.item_type,
        video_source: first.video_source,
        youtube_video_id: first.youtube_video_id,
        video_asset_id: first.video_asset_id,
      }
    : null;
}

/**
 * Find the first published lesson for each course in a single DB query.
 * Skips per-course `isFreeCourse` checks and `resolveDiscoverableVariantItemScope`
 * — caller is responsible for filtering variant scope if needed.
 * Returns a Map of masterCourseId → FirstLessonRow.
 */
export async function batchQueryFirstLessons(
  inputs: BatchInput[],
): Promise<Map<string, FirstLessonRow | null>> {
  const result = new Map<string, FirstLessonRow | null>();
  if (inputs.length === 0) return result;

  const courseIds = inputs.map((i) => i.masterCourseId);

  // Single query: check which courses are free
  const freeSet = await areCoursesFree(courseIds);

  const sb = createAdminClient();

  // Single query: all modules + items for all courses at once
  const { data: allModules } = await sb
    .from('master_course_modules')
    .select(
      `id, master_course_id, sort_order, publish_status, visible_to_students, created_at,
       master_course_items(
         id, slug, sort_order, publish_status, created_at, item_type,
         video_source, youtube_video_id, video_asset_id
       )`,
    )
    .in('master_course_id', courseIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // Group modules by course
  const modulesByCourse = new Map<string, ModuleRow[]>();
  for (const mod of (allModules ?? []) as ModuleRow[]) {
    const list = modulesByCourse.get(mod.master_course_id) ?? [];
    list.push(mod);
    modulesByCourse.set(mod.master_course_id, list);
  }

  // For each course, find the first published lesson
  for (const input of inputs) {
    const modules = modulesByCourse.get(input.masterCourseId) ?? [];
    const includeUnpublished = freeSet.has(input.masterCourseId);

    let first: (FirstLessonRow & { sortKey: number }) | null = null;

    for (const mod of modules) {
      if (!includeUnpublished && mod.publish_status !== 'published') continue;
      if (mod.visible_to_students === false) continue;

      const items = (mod.master_course_items ?? []).toSorted((a, b) => {
        const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (diff !== 0) return diff;
        return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
      });

      for (const item of items) {
        if (!includeUnpublished && item.publish_status !== 'published') continue;
        const modOrder = mod.sort_order ?? 0;
        const itemOrder = item.sort_order ?? 0;
        const sortKey = modOrder * 1_000_000 + itemOrder;
        if (!first || sortKey < first.sortKey) {
          first = {
            id: item.id,
            slug: item.slug,
            item_type: item.item_type ?? null,
            video_source: item.video_source ?? null,
            youtube_video_id: item.youtube_video_id ?? null,
            video_asset_id: item.video_asset_id ?? null,
            sortKey,
          };
        }
      }
    }

    result.set(
      input.masterCourseId,
      first
        ? {
            id: first.id,
            slug: first.slug,
            item_type: first.item_type,
            video_source: first.video_source,
            youtube_video_id: first.youtube_video_id,
            video_asset_id: first.video_asset_id,
          }
        : null,
    );
  }

  return result;
}

import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveCourseByKey } from '@/lib/resolvers';
import { validatePlayerCourseAccess, type PlayerAccessValidation } from '@/lib/services/course-access-manager';
import { getStudentLearningContext, type StudentLearningContext } from '@/lib/services/student-courses';
import { getItemProgressMap } from '@/lib/services/student-progress';
import { resolveDiscoverableVariantItemScope } from '@/lib/services/student-discoverable-catalog';
import { getCourseResourceSections } from '@/lib/services/course-player-resources';
import { normUuid } from '@/lib/utils';
import { isUuid } from '@/lib/utils/slug';
import { generatePlaybackToken } from '@/lib/security/playback-token';
import { getLessonQuizPayloadForItem } from '@/lib/services/student-lesson-quiz';
import type { CourseForStudent, CurriculumItem, CurriculumModule } from '@/types/student-runtime';
import type { LessonQuizPayload } from '@/types/lesson-quiz';
import type {
  CourseResourceSummary,
  CourseResourceSectionWithItems,
} from '@/types/database';

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

const LINKED_QUIZ_SORT_OFFSET = 0.1;
/** Notes/PDFs linked after a lesson sit between the video and its quiz. */
const LINKED_RESOURCE_SORT_OFFSET = 0.05;

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

export type CoursePlayerShellBundleInput = {
  collegeSlug: string;
  rawCourseParam: string;
  rawItemParam?: string | null;
  variantId?: string | null;
};

export type CoursePlayerShellBundleResult =
  | {
      ok: true;
      ctx: StudentLearningContext;
      access: PlayerAccessValidation;
      course: CourseForStudent;
      activeItem: CurriculumItem | null;
      resources: CourseResourceSummary[];
      courseResourceMeta: CourseResourceSummary[];
      courseResourceSections: CourseResourceSectionWithItems[];
      noteCollectionSlugMap: Record<string, string>;
      navigation: {
        previousItemId: string | null;
        nextItemId: string | null;
        activeIndex: number;
        totalItems: number;
      };
      resolvedCourseId: string;
      resolvedItemId: string | null;
      resolvedVariantId: string | null;
      courseSlug: string | null;
      playbackToken?: string;
      /** Pre-fetched quiz payload for quiz_placeholder items (eliminates client-side waterfall) */
      quizPayload?: LessonQuizPayload | null;
    }
  | {
      ok: false;
      reason:
        | 'course_not_found'
        | 'item_not_found'
        | 'access_denied'
        | 'context_error';
      redirectHref?: string | null;
    };

type CourseRow = {
  id: string;
  created_at: string;
  updated_at: string;
  code: string;
  title: string;
  description: string | null;
  short_description: string | null;
  slug: string | null;
  pillar_id: string | null;
  bootcamp_id: string | null;
  is_free: boolean | null;
  pricing_model: string | null;
  selling_price: number | null;
  currency: string | null;
  publish_status: string | null;
  visible_to_college_students: boolean | null;
  visible_to_global_students: boolean | null;
  metadata: unknown;
  course_kind: string | null;
};

type ModuleRow = {
  id: string;
  master_course_id: string;
  title: string;
  description: string | null;
  slug: string | null;
  sort_order: number | null;
  publish_status: string | null;
  metadata: unknown;
  visible_to_students: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type ItemRow = {
  id: string;
  master_course_id: string;
  module_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  item_type: string | null;
  sort_order: number | null;
  publish_status: string | null;
  video_source: string | null;
  video_asset_id: string | null;
  youtube_video_id: string | null;
  youtube_playlist_id: string | null;
  youtube_thumbnail_url: string | null;
  external_metadata: unknown;
  preview_enabled: boolean;
  metadata: unknown;
  resource_id: string | null;
  quiz_id: string | null;
  duration_seconds: number | null;
  created_at: string | null;
  updated_at: string | null;
};

async function _getRawCourseStructureForBundleUncached(courseId: string, includeUnpublished: boolean) {
  const sb = createAdminClient();
  let courseQuery = sb
    .from('master_courses')
    .select(
      'id, created_at, updated_at, code, title, description, short_description, slug, pillar_id, bootcamp_id, is_free, pricing_model, selling_price, currency, publish_status, visible_to_college_students, visible_to_global_students, metadata, course_kind',
    )
    .eq('id', courseId);
  if (!includeUnpublished) {
    courseQuery = courseQuery.eq('publish_status', 'published');
  }

  let modulesQuery = sb
    .from('master_course_modules')
    .select(
      'id, master_course_id, title, description, slug, sort_order, publish_status, metadata, visible_to_students, created_at, updated_at',
    )
    .eq('master_course_id', courseId);
  if (!includeUnpublished) {
    modulesQuery = modulesQuery.eq('publish_status', 'published');
  }
  modulesQuery = modulesQuery.order('sort_order', { ascending: true }).order('created_at', { ascending: true });

  let itemsQuery = sb
    .from('master_course_items')
    .select(
      'id, master_course_id, module_id, title, slug, description, item_type, sort_order, publish_status, video_source, video_asset_id, youtube_video_id, youtube_playlist_id, youtube_thumbnail_url, external_metadata, preview_enabled:is_preview, metadata, resource_id, quiz_id, duration_seconds, created_at, updated_at',
    )
    .eq('master_course_id', courseId);
  if (!includeUnpublished) {
    itemsQuery = itemsQuery.eq('publish_status', 'published');
  }
  itemsQuery = itemsQuery.order('sort_order', { ascending: true }).order('created_at', { ascending: true });

  const [courseResult, modulesResult, itemsResult, videosResult] = await Promise.all([
    courseQuery.maybeSingle(),
    modulesQuery,
    itemsQuery,
    sb
      .from('video_assets')
      .select('id, sort_order')
      .eq('master_course_id', courseId)
      .eq('sync_status', 'active'),
  ]);

  const videoSortOrder: Record<string, number> = {};
  for (const v of videosResult.data ?? []) {
    videoSortOrder[v.id] = v.sort_order ?? 0;
  }

  return {
    course: courseResult.data as CourseRow | null,
    modules: (modulesResult.data ?? []) as ModuleRow[],
    items: (itemsResult.data ?? []) as ItemRow[],
    videoSortOrder,
  };
}

/**
 * Cheap uncached read of master_courses.updated_at.
 * SuperAdmin bumps this on curriculum changes; including it in the cache key
 * forces a fresh DB structure load without any SuperAdmin→LMS HTTP call.
 */
async function getCourseStructureRevision(courseId: string): Promise<string> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('master_courses')
    .select('updated_at')
    .eq('id', courseId)
    .maybeSingle();
  return data?.updated_at ?? '0';
}

async function _getCachedCourseStructureForBundle(courseId: string) {
  const revision = await getCourseStructureRevision(courseId);
  return unstable_cache(
    async () => _getRawCourseStructureForBundleUncached(courseId, false),
    [`course-player-shell-bundle-${courseId}`, revision],
    {
      revalidate: 604800, // 7 days in seconds (revision key busts on SuperAdmin writes)
      tags: ['course-structure', `course-structure-${courseId}`],
    }
  )();
}

function sortModules(modules: ModuleRow[]): ModuleRow[] {
  return modules.toSorted((a, b) => {
    const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (diff !== 0) return diff;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });
}

function hasMeaningfulVideoSortOrder(videoSortOrder?: Record<string, number>): boolean {
  return new Set(Object.values(videoSortOrder ?? {})).size > 1;
}

function getEffectiveVideoSortOrder(
  item: Pick<ItemRow, 'sort_order' | 'video_asset_id'>,
  videoSortOrder: Record<string, number> | undefined,
  useVideoSortOrder: boolean,
): number {
  const videoOrder = useVideoSortOrder && item.video_asset_id && videoSortOrder
    ? videoSortOrder[item.video_asset_id]
    : undefined;

  return videoOrder ?? (item.sort_order ?? 0);
}

function isCurriculumResourceItem(itemType?: string | null): boolean {
  return itemType === 'markdown' ||
    itemType === 'pdf' ||
    itemType === 'external_link' ||
    itemType === 'resource' ||
    itemType === 'note' ||
    itemType === 'link';
}

function canInferLinkedResourceAnchor(
  itemType: string | null,
  metadata: Record<string, unknown>,
): boolean {
  if (!isCurriculumResourceItem(itemType)) return false;
  return metadata.placement !== 'end' &&
    metadata.placement !== 'start' &&
    metadata.placement !== 'custom';
}

function getVirtualSortOrder(
  item: ItemRow,
  items: ItemRow[],
  videoSortOrder?: Record<string, number>,
  useVideoSortOrder = hasMeaningfulVideoSortOrder(videoSortOrder),
): number {
  if (item.item_type === 'video') {
    return getEffectiveVideoSortOrder(item, videoSortOrder, useVideoSortOrder);
  }

  const metadata = (item.metadata as Record<string, unknown> | null) ?? {};
  const linkedItemId =
    (typeof metadata.linked_video_id === 'string' && metadata.linked_video_id.trim()
      ? metadata.linked_video_id.trim()
      : null) ??
    (typeof metadata.linked_item_id === 'string' && metadata.linked_item_id.trim()
      ? metadata.linked_item_id.trim()
      : null);

  const inferPreviousVideoItem = () => {
    const itemSort = item.sort_order ?? 0;
    return items.reduce<ItemRow | null>((best, candidate) => {
      if (candidate.item_type !== 'video') return best;
      const candidateSort = candidate.sort_order ?? 0;
      if (candidateSort >= itemSort) return best;
      if (!best || candidateSort > (best.sort_order ?? 0)) return candidate;
      return best;
    }, null);
  };

  if (item.item_type === 'quiz_placeholder') {
    if (linkedItemId) {
      const linkedVideoItem = items.find((x) => x.id === linkedItemId);
      if (linkedVideoItem) {
        return (
          getEffectiveVideoSortOrder(linkedVideoItem, videoSortOrder, useVideoSortOrder) +
          LINKED_QUIZ_SORT_OFFSET
        );
      }
    }
    return item.sort_order ?? 0;
  }

  // Curriculum notes / PDFs / links placed after (or before) a lesson must use the
  // same virtual scale as videos+quizzes. Otherwise raw master sort_order drifts
  // past later videos (e.g. "After 1.1" rendering after 1.2).
  const shouldInferAnchor = canInferLinkedResourceAnchor(item.item_type, metadata);
  const linkedItem = linkedItemId
    ? items.find((x) => x.id === linkedItemId)
    : shouldInferAnchor ? inferPreviousVideoItem() : null;

  if (linkedItem && (linkedItemId || shouldInferAnchor)) {
    // Match quizzes: anchor to the linked video's effective order when possible.
    const baseOrder =
      linkedItem.item_type === 'video'
        ? getEffectiveVideoSortOrder(linkedItem, videoSortOrder, useVideoSortOrder)
        : (linkedItem.sort_order ?? 0);
    if (metadata.placement === 'before_item') {
      return baseOrder - LINKED_RESOURCE_SORT_OFFSET;
    }
    return baseOrder + LINKED_RESOURCE_SORT_OFFSET;
  }

  return item.sort_order ?? 0;
}

function sortItems(items: ItemRow[], videoSortOrder?: Record<string, number>): ItemRow[] {
  const useVideoSortOrder = hasMeaningfulVideoSortOrder(videoSortOrder);
  return items.toSorted((a, b) => {
    const orderA = getVirtualSortOrder(a, items, videoSortOrder, useVideoSortOrder);
    const orderB = getVirtualSortOrder(b, items, videoSortOrder, useVideoSortOrder);
    const diff = orderA - orderB;
    if (diff !== 0) return diff;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });
}

function buildNavigation(
  course: CourseForStudent,
  activeItemId: string | null,
): { previousItemId: string | null; nextItemId: string | null; activeIndex: number; totalItems: number } {
  const flatItems = course.modules.flatMap((m) => m.items);
  const totalItems = flatItems.length;
  if (!activeItemId || totalItems === 0) {
    return { previousItemId: null, nextItemId: null, activeIndex: -1, totalItems };
  }
  const idx = flatItems.findIndex((i) => normUuid(i.id) === normUuid(activeItemId));
  if (idx < 0) {
    return { previousItemId: null, nextItemId: null, activeIndex: -1, totalItems };
  }
  return {
    previousItemId: idx > 0 ? flatItems[idx - 1].id : null,
    nextItemId: idx < totalItems - 1 ? flatItems[idx + 1].id : null,
    activeIndex: idx,
    totalItems,
  };
}

/**
 * Single server-side bundle for the course player shell.
 *
 * Resolves course + item + access + structure + progress + engagement
 * in one call. Does NOT include TPStreams playback token (use
 * getLessonRuntimeAction for that).
 *
 * Security: validates entitlement, variant scope, college access,
 * and published/visibility status exactly once.
 */
export const getStudentCoursePlayerShellBundle = cache(
  async function getStudentCoursePlayerShellBundle(
    input: CoursePlayerShellBundleInput,
  ): Promise<CoursePlayerShellBundleResult> {
    if (isDebug) {
      console.info('[request-audit]', {
        area: 'course-player-shell-bundle',
        action: 'start',
        collegeSlug: input.collegeSlug,
        rawCourseParam: input.rawCourseParam,
        rawItemParam: input.rawItemParam ?? null,
        variantId: input.variantId ?? null,
      });
    }

    let ctx: StudentLearningContext;
    try {
      ctx = await getStudentLearningContext(input.collegeSlug);
    } catch {
      if (isDebug) {
        console.info('[request-audit]', { area: 'course-player-shell-bundle', action: 'context_error' });
      }
      return { ok: false, reason: 'context_error' };
    }

    const trimmedCourse = input.rawCourseParam.trim();
    if (!trimmedCourse) {
      return { ok: false, reason: 'course_not_found' };
    }

    let resolvedCourseId: string;
    let resolvedCourseSlug: string | null = null;

    if (isUuid(trimmedCourse)) {
      resolvedCourseId = trimmedCourse;
    } else {
      const resolved = await resolveCourseByKey(trimmedCourse, { studentId: ctx.studentId });
      if (!resolved) {
        return { ok: false, reason: 'course_not_found' };
      }
      resolvedCourseId = resolved.id;
      resolvedCourseSlug = resolved.slug;
    }

    let resolvedItemId: string | null = null;
    const rawItem = input.rawItemParam?.trim() || null;
    if (rawItem) {
      if (isUuid(rawItem)) {
        resolvedItemId = rawItem;
      } else {
        const sb = createAdminClient();
        const itemQuery = sb
          .from('master_course_items')
          .select('id')
          .eq('master_course_id', resolvedCourseId)
          .eq('slug', rawItem)
          .eq('publish_status', 'published');
        const { data: itemRow } = await itemQuery.maybeSingle();
        if (itemRow) {
          resolvedItemId = itemRow.id as string;
        }
      }
    }

    let resolvedVariantId: string | null = input.variantId?.trim() || null;
    if (resolvedVariantId && !isUuid(resolvedVariantId)) {
      const sb = createAdminClient();
      const { data: variantRow } = await sb
        .from('course_variants')
        .select('id')
        .eq('slug', resolvedVariantId)
        .maybeSingle();
      resolvedVariantId = variantRow ? (variantRow.id as string) : null;
    }

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'course-player-shell-bundle',
        action: 'keys_resolved',
        resolvedCourseId: safeId(resolvedCourseId),
        resolvedItemId: safeId(resolvedItemId),
        resolvedVariantId: safeId(resolvedVariantId),
      });
    }

    const access = await validatePlayerCourseAccess(
      ctx.studentId,
      resolvedCourseId,
      { isGlobal: ctx.isGlobal, collegeId: ctx.collegeId },
      { collegeSlug: input.collegeSlug, variantId: resolvedVariantId, lessonId: resolvedItemId },
    );

    if (!access.allowed) {
      if (isDebug) {
        console.info('[request-audit]', { area: 'course-player-shell-bundle', action: 'access_denied', reason: access.denyReason });
      }
      return { ok: false, reason: 'access_denied', redirectHref: access.redirectHref };
    }

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'course-player-shell-bundle',
        action: 'access_resolved',
        accessLevel: access.accessLevel,
        sourceType: access.source.sourceType,
      });
    }

    const cachedStructure = await _getCachedCourseStructureForBundle(resolvedCourseId);
    const courseRow = cachedStructure.course;
    if (!courseRow || courseRow.publish_status !== 'published') {
      return { ok: false, reason: 'course_not_found' };
    }

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'course-player-shell-bundle',
        action: 'structure_loaded',
        moduleCount: cachedStructure.modules.length,
        itemCount: cachedStructure.items.length,
      });
    }

    let catalogVariantScope: { itemIds: Set<string>; title: string } | null = null;
    let contentResolution: { allow_all: boolean; item_ids: Set<string> } | null = null;

    if (resolvedVariantId) {
      catalogVariantScope = await resolveDiscoverableVariantItemScope(
        resolvedVariantId,
        resolvedCourseId,
        ctx.collegeId,
      );
      if (!catalogVariantScope) {
        return { ok: false, reason: 'access_denied' };
      }
      contentResolution = { allow_all: false, item_ids: catalogVariantScope.itemIds };
    } else if (access.accessLevel === 'full') {
      contentResolution = { allow_all: true, item_ids: new Set() };
    } else if (access.allowedItemIds && access.allowedItemIds.size > 0) {
      contentResolution = { allow_all: false, item_ids: access.allowedItemIds };
    } else {
      contentResolution = { allow_all: true, item_ids: new Set() };
    }

    const progressMap = await getItemProgressMap(ctx.studentId, resolvedCourseId);

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'course-player-shell-bundle',
        action: 'progress_loaded',
        progressEntries: progressMap.size,
      });
    }

    const isFree =
      courseRow.course_kind === 'free_course' || courseRow.pricing_model === 'free';

    const allModules = isFree
      ? cachedStructure.modules
      : cachedStructure.modules.filter((m) => m.publish_status === 'published');

    const allItems = isFree
      ? cachedStructure.items
      : cachedStructure.items.filter((i) => i.publish_status === 'published');

    const sortedModules = sortModules(allModules);
    const visibleModuleIds = new Set(sortedModules.map((m) => normUuid(m.id)));

    const allowAllItems =
      !!contentResolution?.allow_all ||
      (access.accessLevel === 'full' && !catalogVariantScope);

    const allowedItemIdsNorm = contentResolution?.item_ids
      ? new Set([...contentResolution.item_ids].map((id) => normUuid(id)))
      : null;

    const sortedItems = sortItems(allItems, cachedStructure.videoSortOrder);

    const vsort = cachedStructure.videoSortOrder;
    const useVideoSortOrder = hasMeaningfulVideoSortOrder(vsort);
    const curriculumItems: CurriculumItem[] = sortedItems
      .filter((item) => {
        if (!visibleModuleIds.has(normUuid(item.module_id))) return false;
        if (!allowAllItems && !(allowedItemIdsNorm?.has(normUuid(item.id)) ?? false)) return false;
        // Hide unconfigured quiz placeholders (quiz deleted / never linked)
        if (item.item_type === 'quiz_placeholder' && !item.quiz_id) return false;
        return true;
      })
      .map((item) => {
        const rawProgress = progressMap.get(item.id) || null;
        // Prefer the linked video's sort_order so the student curriculum matches
        // the admin Module Video Library order.
        const virtualSortOrder = getVirtualSortOrder(item, allItems, vsort, useVideoSortOrder);
        return {
          id: item.id,
          module_id: item.module_id,
          master_course_id: resolvedCourseId,
          title: item.title,
          slug: item.slug,
          description: item.description,
          item_type: (item.item_type ?? 'video') as CurriculumItem['item_type'],
          sort_order: virtualSortOrder,
          publish_status: item.publish_status ?? 'published',
          video_source: item.video_source as CurriculumItem['video_source'],
          video_asset_id: item.video_asset_id,
          youtube_video_id: item.youtube_video_id,
          youtube_playlist_id: item.youtube_playlist_id,
          youtube_thumbnail_url: item.youtube_thumbnail_url,
          external_metadata: (item.external_metadata as Record<string, unknown>) ?? undefined,
          preview_enabled: item.preview_enabled,
          metadata: (item.metadata as Record<string, unknown>) ?? {},
          duration_seconds: item.duration_seconds,
          resource_id: item.resource_id,
          quiz_id: item.quiz_id,
          created_at: item.created_at ?? undefined,
          updated_at: item.updated_at ?? undefined,
          progress: rawProgress
            ? {
                id: '',
                student_id: ctx.studentId,
                item_id: item.id,
                entitlement_id: null,
                watched_seconds: rawProgress.watchedSeconds,
                total_seconds: rawProgress.totalSeconds,
                last_position_seconds: rawProgress.lastPositionSeconds,
                completed: rawProgress.completed,
                completed_at: null,
              }
            : null,
        } as CurriculumItem;
      });

    const curriculumModules: CurriculumModule[] = sortedModules.reduce(
      (acc, mod) => {
        const moduleItems = curriculumItems.filter((i) => i.module_id === mod.id);
        if (moduleItems.length > 0) {
          acc.push({
            id: mod.id,
            master_course_id: resolvedCourseId,
            title: mod.title,
            description: mod.description,
            sort_order: mod.sort_order ?? 0,
            publish_status: mod.publish_status ?? 'published',
            visible_to_students: mod.visible_to_students ?? true,
            items: moduleItems,
            created_at: mod.created_at ?? undefined,
            updated_at: mod.updated_at ?? undefined,
          });
        }
        return acc;
      },
      [] as CurriculumModule[],
    );

    const courseTitle = catalogVariantScope?.title ?? courseRow.title;

    const course: CourseForStudent = {
      id: courseRow.id,
      title: courseTitle,
      code: courseRow.code,
      slug: courseRow.slug,
      description: courseRow.description,
      short_description: courseRow.short_description,
      pillar: courseRow.pillar_id,
      is_free: isFree,
      pricing_model: courseRow.pricing_model,
      publish_status: courseRow.publish_status ?? 'draft',
      metadata: {
        ...(typeof courseRow.metadata === 'object' && courseRow.metadata !== null
          ? (courseRow.metadata as Record<string, unknown>)
          : {}),
        catalog_variant_id: resolvedVariantId,
        parent_course_title: catalogVariantScope ? courseRow.title : undefined,
      },
      modules: curriculumModules,
    } as unknown as CourseForStudent;

    const activeItem = resolvedItemId
      ? curriculumItems.find((i) => normUuid(i.id) === normUuid(resolvedItemId)) ?? null
      : null;

    if (activeItem && activeItem.item_type === 'markdown' && activeItem.resource_id) {
      try {
        const { getCachedMarkdownResourceContent } = await import('@/app/c/[collegeSlug]/student/(authenticated)/learn/course-resources-actions');
        const mdRes = await getCachedMarkdownResourceContent(activeItem.resource_id);
        if (mdRes && mdRes.publish_status === 'published' && mdRes.visible_to_students) {
          activeItem.markdownContent = mdRes.content;
        }
      } catch (err) {
        console.error('[course-player-shell-bundle] Failed to prefetch markdown content:', err);
      }
    }

    const navigation = buildNavigation(course, resolvedItemId);

    let resources: CourseResourceSummary[] = [];

    if (resolvedItemId && activeItem) {
      const sb = createAdminClient();
      let resourceQuery = sb
        .from('course_resources')
        .select('id, resource_type, title, description')
        .eq('master_course_id', resolvedCourseId)
        .eq('parent_item_id', resolvedItemId)
        .eq('resource_scope', 'lesson_attachment')
        .eq('visible_to_students', true)
        .order('sort_order', { ascending: true });

      resourceQuery = resourceQuery.eq('publish_status', 'published');

      const { data: resourceRows } = await resourceQuery;

      resources = (resourceRows ?? []).map((r) => ({
        id: r.id as string,
        resource_type: r.resource_type as CourseResourceSummary['resource_type'],
        title: r.title as string,
        description: r.description as string | null,
      }));
    }

    // Fetch course-level resource sections (for the Resources tab)
    const courseResourceSections = await getCourseResourceSections(resolvedCourseId);

    // Build note collection slug map for resources tab linking
    const noteCollectionIds = courseResourceSections
      .flatMap((s) => s.items)
      .filter((i) => i.kind === 'note_collection' && i.note_collection_id)
      .map((i) => i.note_collection_id!);
    const uniqueNoteCollectionIds = [...new Set(noteCollectionIds)];

    const noteCollectionSlugMap: Record<string, string> = {};
    if (uniqueNoteCollectionIds.length > 0) {
      const sb = createAdminClient();
      let ncQuery = sb
        .from('note_collections')
        .select('id, slug')
        .in('id', uniqueNoteCollectionIds)
        .is('deleted_at', null);

      ncQuery = ncQuery.eq('publish_status', 'published');

      const { data: noteCollections } = await ncQuery;

      for (const nc of noteCollections ?? []) {
        noteCollectionSlugMap[nc.id] = nc.slug;
      }
    }

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'course-player-shell-bundle',
        action: 'success',
        hasActiveItem: !!activeItem,
        resourceCount: resources.length,
        courseResourceSectionCount: courseResourceSections.length,
      });
    }

    let activeTpAssetId: string | undefined = undefined;
    if (activeItem?.video_asset_id) {
      const sb = createAdminClient();
      const { data: vAsset } = await sb
        .from('video_assets')
        .select('tp_asset_id')
        .eq('id', activeItem.video_asset_id)
        .maybeSingle();
      if (vAsset?.tp_asset_id) {
        activeTpAssetId = vAsset.tp_asset_id;
      }
    }

    const validationToken = resolvedItemId
      ? generatePlaybackToken({
          studentId: ctx.studentId,
          courseId: resolvedCourseId,
          moduleId: activeItem?.module_id ?? undefined,
          lessonId: resolvedItemId,
          videoAssetId: activeItem?.video_asset_id ?? undefined,
          tpAssetId: activeTpAssetId,
        })
      : undefined;

    // Prefetch quiz payload for quiz_placeholder items — eliminates client-side waterfall
    let quizPayload: LessonQuizPayload | null | undefined = undefined;
    if (
      activeItem?.item_type === 'quiz_placeholder' &&
      activeItem.quiz_id &&
      resolvedItemId
    ) {
      try {
        quizPayload = await getLessonQuizPayloadForItem({
          studentId: ctx.studentId,
          collegeId: ctx.collegeId,
          isGlobal: ctx.isGlobal,
          courseId: resolvedCourseId,
          itemId: resolvedItemId,
          skipAccessValidation: true, // access already validated above
        });
      } catch (err) {
        // Quiz not accessible or not published — leave quizPayload undefined
        console.warn('[course-player-shell-bundle] Failed to prefetch quiz payload:', err);
      }
    }

return {
      ok: true,
      ctx,
      access,
      course,
      activeItem,
      resources,
      courseResourceMeta: resources,
      courseResourceSections,
      noteCollectionSlugMap,
      navigation,
      resolvedCourseId,
      resolvedItemId,
      resolvedVariantId,
      courseSlug: resolvedCourseSlug,
      playbackToken: validationToken,
      quizPayload,
    };
  },
);

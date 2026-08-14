import 'server-only';
import { cache } from 'react';
import { cacheLife, cacheTag, unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

async function fetchAllPublishedPillars() {
  'use cache';
  cacheLife('minutes');
  cacheTag('pillars');
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('master_course_pillars')
    .select('id, code, title, description, short_description, slug, sort_order, publish_status, visible_to_college_admins, visible_to_college_students, visible_to_global_students, tp_folder_status, tp_folder_uuid, tp_folder_title, tp_last_synced_at, tp_last_error, metadata, created_by, created_at, updated_at')
    .eq('publish_status', 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(100); // #7 Safety cap to prevent unbounded pillar list growth
  
  if (error) throw error;
  return data ?? [];
}
import { normUuid } from '@/lib/utils';
import { requireStudent } from '@/lib/auth/require-student';
import { batchCourseProgress } from '@/lib/services/batch-course-progress';
import { getItemProgressMap } from '@/lib/services/student-progress';
import {
  resolveCollegeAssignedCourseIds,
  validatePlayerCourseAccess,
  getExpiringCoursesWithinDays,
} from '@/lib/services/course-access-manager';
import { resolveDiscoverableVariantItemScope } from '@/lib/services/student-discoverable-catalog';
import {
  LEGACY_BOOTCAMP_PILLAR_ID,
  LEGACY_BOOTCAMP_PILLAR_SLUG,
} from '@/lib/services/paid-course-catalog';
import type { 
  MasterCoursePillarsRow, 
  MasterCoursesRow, 
} from '@/types/database';
import type { CourseForStudent, CurriculumModule, CurriculumItem } from '@/types/student-runtime';

const LINKED_QUIZ_SORT_OFFSET = 0.1;
const LINKED_RESOURCE_SORT_OFFSET = 0.05;

// ─── Cached course structure queries ─────────────────────────────────────────
// These are the heaviest DB operations in getStudentCourseDetail and don't
// change per-lesson. Caching them avoids redundant queries when navigating
// between lessons in the same course.

/**
 * Cached: Fetch course row + modules + items for a course.
 * TTL: 5 minutes. Keyed by courseId.
 * These queries are independent of the active lesson and student — only the
 * entitlement check and progress map are per-student/lesson.
 */
async function _getRawCourseStructureUncached(courseId: string, includeUnpublished: boolean) {
  const sb = createAdminClient();
  let courseQuery = sb
    .from('master_courses')
    .select('id, created_at, updated_at, code, title, description, short_description, slug, pillar_id, bootcamp_id, is_free, pricing_model, selling_price, currency, publish_status, visible_to_college_students, visible_to_global_students, metadata, course_kind')
    .eq('id', courseId);
  if (!includeUnpublished) {
    courseQuery = courseQuery.eq('publish_status', 'published');
  }

  let modulesQuery = sb
    .from('master_course_modules')
    .select('id, master_course_id, title, description, slug, sort_order, publish_status, metadata, visible_to_students, created_at, updated_at')
    .eq('master_course_id', courseId);
  if (!includeUnpublished) {
    modulesQuery = modulesQuery.eq('publish_status', 'published');
  }
  modulesQuery = modulesQuery.order('sort_order', { ascending: true }).order('created_at', { ascending: true });

  let itemsQuery = sb
    .from('master_course_items')
    .select('id, master_course_id, module_id, title, slug, description, item_type, sort_order, publish_status, video_source, video_asset_id, youtube_video_id, youtube_playlist_id, youtube_thumbnail_url, external_metadata, preview_enabled:is_preview, metadata, resource_id, quiz_id, duration_seconds, created_at, updated_at')
    .eq('master_course_id', courseId);
  if (!includeUnpublished) {
    itemsQuery = itemsQuery.eq('publish_status', 'published');
  }
  itemsQuery = itemsQuery.order('sort_order', { ascending: true }).order('created_at', { ascending: true });

  const [courseResult, modulesResult, itemsResult, videosResult] = await Promise.all([
    courseQuery.maybeSingle(),
    modulesQuery,
    itemsQuery,
    sb.from('video_assets')
      .select('id, sort_order')
      .eq('master_course_id', courseId)
      .eq('sync_status', 'active'),
  ]);

  // Build a map of video_asset_id → sort_order so items with linked videos
  // can be sorted by the video's sort_order (which the admin sees in the
  // Module Video Library) rather than the item's own sort_order.
  const videoSortOrder: Record<string, number> = {};
  for (const v of videosResult.data ?? []) {
    videoSortOrder[v.id] = v.sort_order ?? 0;
  }

  return {
    course: courseResult.data,
    modules: modulesResult.data,
    items: itemsResult.data,
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

async function _getCachedCourseStructure(courseId: string) {
  const revision = await getCourseStructureRevision(courseId);
  return unstable_cache(
    async () => _getRawCourseStructureUncached(courseId, false),
    ['course-structure-v2', courseId, revision],
    {
      revalidate: 604800, // 7 days in seconds (revision key busts on SuperAdmin writes)
      tags: ['course-structure', `course-structure-${courseId}`],
    }
  )();
}

function hasMeaningfulVideoSortOrder(videoSortOrder?: Record<string, number>): boolean {
  return new Set(Object.values(videoSortOrder ?? {})).size > 1;
}

function getEffectiveVideoSortOrder(
  item: { sort_order?: number | null; video_asset_id?: string | null },
  videoSortOrder: Record<string, number> | undefined,
  useVideoSortOrder: boolean,
): number {
  const videoOrder = useVideoSortOrder && item.video_asset_id && videoSortOrder
    ? videoSortOrder[item.video_asset_id]
    : undefined;

  return videoOrder ?? (item.sort_order ?? 0);
}

type SortableCourseItem = {
  id: string;
  item_type?: string | null;
  sort_order?: number | null;
  video_asset_id?: string | null;
  metadata?: unknown;
};

function getLinkedItemId(metadata: Record<string, unknown>): string | null {
  return (
    (typeof metadata.linked_video_id === 'string' && metadata.linked_video_id.trim()
      ? metadata.linked_video_id.trim()
      : null) ??
    (typeof metadata.linked_item_id === 'string' && metadata.linked_item_id.trim()
      ? metadata.linked_item_id.trim()
      : null)
  );
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
  itemType: string | null | undefined,
  metadata: Record<string, unknown>,
): boolean {
  if (!isCurriculumResourceItem(itemType)) return false;
  return metadata.placement !== 'end' &&
    metadata.placement !== 'start' &&
    metadata.placement !== 'custom';
}

function inferPreviousVideoItem(
  item: SortableCourseItem,
  items: SortableCourseItem[],
): SortableCourseItem | null {
  const itemSort = item.sort_order ?? 0;
  return items.reduce<SortableCourseItem | null>((best, candidate) => {
    if (candidate.item_type !== 'video') return best;
    const candidateSort = candidate.sort_order ?? 0;
    if (candidateSort >= itemSort) return best;
    if (!best || candidateSort > (best.sort_order ?? 0)) return candidate;
    return best;
  }, null);
}

function getVirtualSortOrder(
  item: SortableCourseItem,
  items: SortableCourseItem[],
  videoSortOrder: Record<string, number> | undefined,
  useVideoSortOrder: boolean,
): number {
  if (item.item_type === 'video') {
    return getEffectiveVideoSortOrder(item, videoSortOrder, useVideoSortOrder);
  }

  const metadata = (item.metadata as Record<string, unknown> | null) ?? {};
  const linkedItemId = getLinkedItemId(metadata);

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

  const shouldInferAnchor = canInferLinkedResourceAnchor(item.item_type, metadata);
  const linkedItem = linkedItemId
    ? items.find((x) => x.id === linkedItemId)
    : shouldInferAnchor ? inferPreviousVideoItem(item, items) : null;

  if (linkedItem && (linkedItemId || shouldInferAnchor)) {
    const baseOrder =
      linkedItem.item_type === 'video'
        ? getEffectiveVideoSortOrder(linkedItem, videoSortOrder, useVideoSortOrder)
        : (linkedItem.sort_order ?? 0);

    return metadata.placement === 'before_item'
      ? baseOrder - LINKED_RESOURCE_SORT_OFFSET
      : baseOrder + LINKED_RESOURCE_SORT_OFFSET;
  }

  return item.sort_order ?? 0;
}

/**
 * Shared cached helper for student dashboard and my-courses pages.
 * Pre-fetches expiring courses data to avoid redundant DB queries when
 * both pages are visited in the same session.
 *
 * Split TTL: expiring data uses short cache (30s), stable roster data uses long cache (5min).
 */
async function _getCachedExpiringCourses(studentId: string) {
  'use cache';
  cacheLife('seconds');
  cacheTag(`student-expiring-${studentId}`);
  // Use a 30-second cache for expiring course data since it's time-sensitive
  return getExpiringCoursesWithinDays(studentId, 14);
}

async function _getCachedRosterData(studentId: string, _collegeId: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag(`student-dashboard-${studentId}`);
  // Stable roster data — safe to cache for 5 minutes
  return {};
}

export async function getStudentDashboardSections(studentId: string, collegeId: string) {
  const [expiring] = await Promise.all([
    _getCachedExpiringCourses(studentId),
    _getCachedRosterData(studentId, collegeId),
  ]);

  return { expiring };
}

export interface StudentLearningContext {
  studentId: string;
  userId: string;
  collegeId: string | null;
  isGlobal: boolean;
  tenantSlug: string;
}

export interface EntitledCourseListItem extends MasterCoursesRow {
  module_count: number;
  video_count: number;
  progress_percentage: number;
  progress_completed_items?: number;
  progress_total_items?: number;
  progress_completed_video_items?: number;
  progress_total_video_items?: number;
  access_label?: string | null;
  source_labels?: string[];
  bundle_titles?: string[];
  access_level?: 'full' | 'partial';
  variant_id?: string | null;
  variant_title?: string | null;
  thumbnail_url?: string | null;
  learnHref?: string;
}

export interface EntitledPillarGroup {
  pillar: MasterCoursePillarsRow;
  courses: EntitledCourseListItem[];
}

/**
 * Resolve learning context for the current student. Wrapped in React cache()
 * to deduplicate auth resolution across multiple layout/page calls per server request.
 */
export const getStudentLearningContext = cache(
  async function getStudentLearningContext(
    collegeSlugOrContext: string | StudentLearningContext,
  ): Promise<StudentLearningContext> {
    if (typeof collegeSlugOrContext !== 'string') {
      return collegeSlugOrContext;
    }
    const context = await requireStudent(collegeSlugOrContext);

    return {
      studentId: context.studentId,
      userId: context.user.id,
      collegeId: context.isGlobal ? null : context.tenant.id,
      isGlobal: context.isGlobal,
      tenantSlug: context.tenant.slug,
    };
  },
);

export type VisiblePillarForStudent = Pick<
  MasterCoursePillarsRow,
  'id' | 'title' | 'description' | 'short_description' | 'slug' | 'metadata'
>;

/**
 * Cached inner helper for visible pillars.
 * Accepts safe params (collegeId, isGlobal) — no auth, cookies, or headers inside.
 * Uses admin client and unstable_cache for cross-request caching.
 */
async function getVisiblePillarsCached(collegeId: string | null, isGlobal: boolean): Promise<MasterCoursePillarsRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('visible-pillars', 'college-assigned-courses');
  const sb = createAdminClient();

  // Parallelize independent fetches: pillars and assigned course IDs
  const [allPillars, assignedCourseIds] = await Promise.all([
    fetchAllPublishedPillars(),
    isGlobal ? Promise.resolve([]) : resolveCollegeAssignedCourseIds(collegeId ?? ''),
  ]);

  let visiblePillars = [...allPillars];

  if (isGlobal) {
    // For direct learners, show all published pillars (discoverability)
    visiblePillars = allPillars;
  } else if (collegeId) {
    // For college students, include if visible_to_college_students OR if they have assigned courses
    const { data: coursesInPillars } = await sb
      .from('master_courses')
      .select('pillar_id')
      .in('id', assignedCourseIds.length > 0 ? assignedCourseIds : ['00000000-0000-0000-0000-000000000000']);

    const assignedPillarIds = new Set((coursesInPillars ?? []).map((c) => c.pillar_id));
    visiblePillars = allPillars.filter(
      (p) => p.visible_to_college_students || assignedPillarIds.has(p.id),
    );
  }

  return visiblePillars;
}

/**
 * Pillar navigation and catalog must satisfy **both**:
 * - `publish_status === 'published'`
 * - Student audience visibility: `visible_to_global_students` (global LMS) **or**
 *   `visible_to_college_students` (tenant college LMS).
 *
 * Publishing alone without turning on the matching audience flag hides the pillar
 * from the student sidebar/listings even though admins may see it as "published".
 *
 * PERFORMANCE: Auth resolved outside cache; inner helper uses unstable_cache.
 */
export const listVisiblePillarsForStudent = cache(async function listVisiblePillarsForStudent(
  collegeSlugOrContext: string | StudentLearningContext,
): Promise<MasterCoursePillarsRow[]> {
  const ctx = await getStudentLearningContext(collegeSlugOrContext);

  const pillars = await getVisiblePillarsCached(ctx.collegeId, ctx.isGlobal);

  if (!pillars || pillars.length === 0) return [];

  return pillars;
});

export const listVisiblePillarsForAudience = cache(async function listVisiblePillarsForAudience(
  collegeId: string | null,
  isGlobal: boolean,
): Promise<MasterCoursePillarsRow[]> {
  const pillars = await getVisiblePillarsCached(collegeId, isGlobal);

  if (!pillars || pillars.length === 0) return [];

  return pillars;
});

/**
 * Load one pillar slug for pillar landing pages - same eligibility as the sidebar (`listVisiblePillarsForStudent`).
 * Returns metadata even when no discoverable courses exist yet (empty catalog state).
 */
export async function getVisiblePillarBySlugForStudent(
  collegeSlug: string,
  pillarSlug: string,
): Promise<VisiblePillarForStudent | null> {
  await getStudentLearningContext(collegeSlug);
  const sb = createAdminClient();

  const q = sb
    .from('master_course_pillars')
    .select('id, title, description, short_description, slug, metadata')
    .eq('slug', pillarSlug)
    .eq('publish_status', 'published');

  const { data: row } = await q.maybeSingle();
  
  // RESILIENCE: If not found by slug, it's a true 404. 
  // Otherwise, we return it regardless of visibility flags to allow landing page discovery.
  return row as VisiblePillarForStudent ?? null;
}

/**
 * List all courses the current student is entitled to, grouped by Pillar.
 */
/**
 * Resolve a bundle into the master_course_ids it covers, with access labels.
 * Used by listStudentEntitledCoursesGroupedByPillar to display course cards.
 *
 * Handles:
 * - bundle_resolved_items fast path
 * - Inline fallback for old bundles
 * - Nested bundles (item_type='bundle') with cycle protection
 * - bundle_item_selected_items overrides
 * - De-duplication by course ID
 *
 * PERFORMANCE: Batches all DB queries upfront instead of N+1 pattern.
 * Expected: 30+ queries → 4-5 queries maximum.
 */
export async function resolveBundleCourseIds(
  bundleId: string,
  visitedBundleIds?: Set<string>,
): Promise<Map<string, 'full' | 'partial'>> {
  const sb = createAdminClient();
  const visited = visitedBundleIds ?? new Set<string>();
  if (visited.has(bundleId)) return new Map();
  visited.add(bundleId);

  const courseMap = new Map<string, 'full' | 'partial'>();

  // Fast path: use bundle_resolved_items to get course IDs
  const { data: resolvedRows } = await sb
    .from('bundle_resolved_items')
    .select('parent_master_course_id')
    .eq('bundle_id', bundleId);

  if (resolvedRows && resolvedRows.length > 0) {
    for (const row of resolvedRows) {
      const mcId = row.parent_master_course_id as string;
      if (!courseMap.has(mcId)) courseMap.set(mcId, 'partial');
    }
    return courseMap;
  }

  // Fallback: inline resolution from bundle_items
  const { data: bundleItems } = await sb
    .from('bundle_items')
    .select('id, item_type, reference_id')
    .eq('bundle_id', bundleId);

  if (!bundleItems || bundleItems.length === 0) return courseMap;

  // Collect IDs for batch queries
  const bundleItemIds = bundleItems.map((bi) => bi.id);
  const variantIds: string[] = [];
  const itemIds: string[] = [];
  const nestedBundleIds: string[] = [];

  for (const bi of bundleItems) {
    const itemType = bi.item_type as string;
    const refId = bi.reference_id as string;
    if (itemType === 'variant') {
      variantIds.push(refId);
    } else if (itemType === 'master_course_item') {
      itemIds.push(refId);
    } else if (itemType === 'bundle') {
      nestedBundleIds.push(refId);
    }
  }

  // Batch fetch all needed data upfront (4 queries max instead of N+1)
  const [
    overrideRows,
    variantRows,
    itemRows,
  ] = await Promise.all([
    // Get all override item IDs for the bundle
    bundleItemIds.length > 0
      ? sb.from('bundle_item_selected_items')
          .select('bundle_item_id, master_course_item_id')
          .in('bundle_item_id', bundleItemIds)
      : Promise.resolve({ data: [] }),
    // Get all variants
    variantIds.length > 0
      ? sb.from('course_variants')
          .select('id, master_course_id')
          .in('id', variantIds)
      : Promise.resolve({ data: [] }),
    // Get all master course items
    itemIds.length > 0
      ? sb.from('master_course_items')
          .select('id, master_course_id')
          .in('id', itemIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Build lookup maps from batch results
  const hasOverrides = new Set<string>();
  const overrideItemToMasterCourse = new Map<string, string>();
  const variantToMasterCourse = new Map<string, string>();
  const itemToMasterCourse = new Map<string, string>();

  for (const row of overrideRows?.data ?? []) {
    hasOverrides.add(row.bundle_item_id as string);
    overrideItemToMasterCourse.set(row.bundle_item_id as string, row.master_course_item_id as string);
  }

  for (const row of variantRows?.data ?? []) {
    variantToMasterCourse.set(row.id as string, row.master_course_id as string);
  }

  for (const row of itemRows?.data ?? []) {
    itemToMasterCourse.set(row.id as string, row.master_course_id as string);
  }

  // Process bundle items using pre-fetched data (no additional queries)
  const resolvedItems: Array<{ mcId: string; accessType: 'full' | 'partial' }> = [];

  for (const bi of bundleItems) {
    const biId = bi.id as string;
    const itemType = bi.item_type as string;
    const refId = bi.reference_id as string;

    if (itemType === 'master_course') {
      resolvedItems.push({ mcId: refId, accessType: 'full' });
    } else if (itemType === 'variant') {
      const mcId = variantToMasterCourse.get(refId);
      if (mcId) {
        resolvedItems.push({ mcId, accessType: 'partial' });
      }
    } else if (itemType === 'master_course_item') {
      if (hasOverrides.has(biId)) {
        // For overridden items, we need the actual selected items' master_course_id
        // Get the override master_course_item_id first
        const overrideItemId = overrideItemToMasterCourse.get(biId);
        if (overrideItemId) {
          const mcId = itemToMasterCourse.get(overrideItemId);
          if (mcId) {
            resolvedItems.push({ mcId, accessType: 'partial' });
          }
        }
      } else {
        const mcId = itemToMasterCourse.get(refId);
        if (mcId) {
          resolvedItems.push({ mcId, accessType: 'partial' });
        }
      }
    } else if (itemType === 'bundle') {
      const nestedMap = await resolveBundleCourseIds(refId, new Set(visited));
      for (const [mcId, accessType] of nestedMap) {
        resolvedItems.push({ mcId, accessType });
      }
    }
  }

  for (const { mcId, accessType } of resolvedItems) {
    const existing = courseMap.get(mcId);
    if (!existing || (existing === 'partial' && accessType === 'full')) {
      courseMap.set(mcId, accessType);
    }
  }

  return courseMap;
}

export async function listStudentEntitledCoursesGroupedByPillar(
  collegeSlugOrContext: string | StudentLearningContext,
  options?: { excludeBundleOnlyCourses?: boolean },
): Promise<EntitledPillarGroup[]> {
  const ctx = await getStudentLearningContext(collegeSlugOrContext);
  return listStudentEntitledCoursesGroupedByPillarInner(
    ctx.studentId,
    ctx.collegeId,
    ctx.isGlobal,
    !!options?.excludeBundleOnlyCourses
  );
}

async function listStudentEntitledCoursesGroupedByPillarInner(
  studentId: string,
  collegeId: string | null,
  isGlobal: boolean,
  excludeBundleOnlyCourses: boolean,
): Promise<EntitledPillarGroup[]> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag('entitlements', 'progress');

  const sb = createAdminClient();

  const { data: rawCourses, error: rpcError } = await sb.rpc('get_student_entitled_courses', {
    p_student_id: studentId,
    p_college_id: collegeId,
    p_is_global: isGlobal,
    p_exclude_bundle_only: excludeBundleOnlyCourses,
  });

  if (rpcError) {
    console.error('[listStudentEntitledCoursesGroupedByPillarInner] rpc error:', rpcError);
    return [];
  }

  if (!rawCourses || rawCourses.length === 0) {
    return [];
  }

  const courseIds = [...new Set((rawCourses as Array<{ id?: string | null }>).flatMap((course) => course.id ? [course.id] : []))];
  const progressMap = await batchCourseProgress(studentId, courseIds);

  const enrichedCourses: EntitledCourseListItem[] = [];
  const bootcampCourses: EntitledCourseListItem[] = [];
  const pillarIds = new Set<string>();

  for (const c of rawCourses) {
    const enriched = {
      ...c,
    } as unknown as EntitledCourseListItem;
    const progress = progressMap.get(enriched.id);
    enriched.progress_percentage = progress?.percentage ?? enriched.progress_percentage ?? 0;
    enriched.progress_completed_items = progress?.completed ?? 0;
    enriched.progress_total_items = progress?.total ?? 0;
    enriched.progress_completed_video_items = progress?.videoCompleted ?? 0;
    enriched.progress_total_video_items = progress?.videoTotal ?? 0;

    const metadata = (enriched.metadata as Record<string, unknown> | null) ?? {};
    enriched.thumbnail_url =
      enriched.thumbnail_url?.trim()
      || (typeof metadata.thumbnail_url === 'string' ? metadata.thumbnail_url.trim() : '')
      || (typeof metadata.youtube_playlist_thumbnail_url === 'string'
        ? metadata.youtube_playlist_thumbnail_url.trim()
        : '')
      || null;

    if (!c.pillar_id) {
      bootcampCourses.push(enriched);
      continue;
    }

    pillarIds.add(c.pillar_id);
    enrichedCourses.push(enriched);
  }

  // 4. Fetch pillars with visibility and publish status filters
  let pillars: MasterCoursePillarsRow[] = [];
  if (pillarIds.size > 0) {
    const pillarQuery = sb
      .from('master_course_pillars')
      .select('id, code, title, description, short_description, slug, sort_order, publish_status, visible_to_college_admins, visible_to_college_students, visible_to_global_students, tp_folder_status, tp_folder_uuid, tp_folder_title, tp_last_synced_at, tp_last_error, metadata, created_by, created_at, updated_at')
      .in('id', Array.from(pillarIds))
      .eq('publish_status', 'published');

    const { data: pillarRows, error: pillarsError } = await pillarQuery
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (pillarsError) return bootcampCourses.length > 0 ? [{
      pillar: {
        id: LEGACY_BOOTCAMP_PILLAR_ID,
        code: 'PAID_BUILDER',
        title: 'Paid Courses',
        description: null,
        short_description: null,
        slug: LEGACY_BOOTCAMP_PILLAR_SLUG,
        publish_status: 'published',
        visible_to_college_students: true,
        visible_to_global_students: true,
        visible_to_college_admins: true,
        sort_order: 9999,
        tp_folder_status: 'pending',
        tp_folder_uuid: null,
        tp_folder_title: null,
        tp_last_synced_at: null,
        tp_last_error: null,
        metadata: {},
        created_by: null,
        created_at: '',
        updated_at: '',
      } as MasterCoursePillarsRow,
      courses: bootcampCourses.sort((a, b) => a.title.localeCompare(b.title)),
    }] : [];
    pillars = pillarRows ?? [];
  }

  // 5. Group by pillar
  const groups: EntitledPillarGroup[] = [];
  for (const pillar of pillars) {
    const pillarCourses = enrichedCourses.filter(c => c.pillar_id === pillar.id);
    if (pillarCourses.length > 0) {
      groups.push({
        pillar,
        courses: pillarCourses.sort((a, b) => a.title.localeCompare(b.title))
      });
    }
  }

  if (bootcampCourses.length > 0) {
    groups.push({
      pillar: {
        id: LEGACY_BOOTCAMP_PILLAR_ID,
        code: 'PAID_BUILDER',
        title: 'Paid Courses',
        description: null,
        short_description: null,
        slug: LEGACY_BOOTCAMP_PILLAR_SLUG,
        publish_status: 'published',
        visible_to_college_students: true,
        visible_to_global_students: true,
        visible_to_college_admins: true,
        sort_order: 9999,
        tp_folder_status: 'pending',
        tp_folder_uuid: null,
        tp_folder_title: null,
        tp_last_synced_at: null,
        tp_last_error: null,
        metadata: {},
        created_by: null,
        created_at: '',
        updated_at: '',
      } as MasterCoursePillarsRow,
      courses: bootcampCourses.sort((a, b) => a.title.localeCompare(b.title)),
    });
  }

  return groups;
}

/**
 * Get full details for a student course, including curriculum and progress.
 * Request-memoized to avoid duplicate layout + page queries in the same render.
 */
export const getStudentCourseDetail = cache(async function getStudentCourseDetail(
  collegeSlug: string,
  courseId: string,
  options?: { variantId?: string | null; lessonId?: string | null },
): Promise<CourseForStudent | null> {
  const ctx = await getStudentLearningContext(collegeSlug);
  const sb = createAdminClient();
  const variantId = options?.variantId?.trim() || null;
  const lessonId = options?.lessonId?.trim() || null;

  // Parallelize independent access validation and course structure fetch
  const [playerAccess, cachedStructure] = await Promise.all([
    validatePlayerCourseAccess(
      ctx.studentId,
      courseId,
      { isGlobal: ctx.isGlobal, collegeId: ctx.collegeId },
      { collegeSlug, variantId, lessonId },
    ),
    _getCachedCourseStructure(courseId),
  ]);

  if (!playerAccess.allowed) {
    if (process.env.PLAYER_ACCESS_DEBUG === '1') {
      console.info('[getStudentCourseDetail] access denied', {
        courseId,
        variantId,
        lessonId,
        denyReason: playerAccess.denyReason,
        redirectHref: playerAccess.redirectHref,
        sourceType: playerAccess.source.sourceType,
        sourceId: playerAccess.source.sourceId,
      });
    }
    return null;
  }
  let course = cachedStructure.course;
  if (!course) {
    const { getCachedMasterCourse } = await import('@/lib/services/course-cache');
    course = await getCachedMasterCourse(courseId);
  }
  if (!course || course.publish_status !== 'published') return null;

  const isFree = course.course_kind === 'free_course';

  const modules = isFree
    ? (cachedStructure.modules ?? [])
    : cachedStructure.modules?.filter((m) => m.publish_status === 'published') ?? [];
  const itemsResData = isFree
    ? (cachedStructure.items ?? [])
    : cachedStructure.items?.filter((i) => i.publish_status === 'published') ?? [];

  let contentResolution = null as null | { allow_all: boolean; item_ids: Set<string> };
  let catalogVariantScope: { itemIds: Set<string>; title: string } | null = null;

  if (variantId) {
    catalogVariantScope = await resolveDiscoverableVariantItemScope(
      variantId,
      courseId,
      ctx.collegeId,
    );
    if (!catalogVariantScope) return null;
    contentResolution = { allow_all: false, item_ids: catalogVariantScope.itemIds };
  } else if (playerAccess.accessLevel === 'full') {
    contentResolution = { allow_all: true, item_ids: new Set() };
  } else if (playerAccess.allowedItemIds && playerAccess.allowedItemIds.size > 0) {
    contentResolution = { allow_all: false, item_ids: playerAccess.allowedItemIds };
  } else {
    contentResolution = { allow_all: true, item_ids: new Set() };
  }

  const parentQuery = course.pillar_id
    ? sb.from('master_course_pillars')
        .select('id')
        .eq('id', course.pillar_id)
        .eq('publish_status', 'published')
        .maybeSingle()
    : course.bootcamp_id
      ? sb.from('bootcamps')
          .select('id, lifecycle_status')
          .eq('id', course.bootcamp_id)
          .eq('publish_status', 'published')
          .eq('lifecycle_status', 'active')
          .maybeSingle()
      : Promise.resolve({ data: null });

  // Progress map is NOT cached — it changes during playback and unstable_cache
  // cannot serialize Maps (converts to plain object, breaking .get() calls).
  const [parentResult, progressMap] = await Promise.all([
    parentQuery,
    getItemProgressMap(ctx.studentId, courseId),
  ]);

  // Player access already validated hierarchy — do not block entitled playback on pillar row lookup.
  void parentResult;

  // 5. Build hierarchy
  const sortedModules = (modules || []).toSorted((a, b) => {
    const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (diff !== 0) return diff;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });

  const visibleModuleIds = new Set(sortedModules.map((module) => normUuid(module.id)));

  const allowedItemIds = contentResolution?.item_ids ?? null;
  const allowedItemIdsNorm = allowedItemIds
    ? new Set([...allowedItemIds].map((id) => normUuid(id)))
    : null;
  const allowAllItems =
    !!contentResolution?.allow_all ||
    (playerAccess.accessLevel === 'full' && !catalogVariantScope);

  const vsort = cachedStructure.videoSortOrder;
  const useVideoSortOrder = hasMeaningfulVideoSortOrder(vsort);
  const rawItems = (itemsResData || []).reduce((acc, item) => {
    if (!visibleModuleIds.has(normUuid(item.module_id))) return acc;
    if (!allowAllItems && !(allowedItemIdsNorm ? allowedItemIdsNorm.has(normUuid(item.id)) : false)) return acc;
    // Hide unconfigured quiz placeholders (quiz deleted / never linked)
    if (item.item_type === 'quiz_placeholder' && !item.quiz_id) return acc;
    const rawProgress = progressMap.get(item.id) || null;
    const finalSortOrder = getVirtualSortOrder(
      item,
      (itemsResData || []) as SortableCourseItem[],
      vsort,
      useVideoSortOrder,
    );

    acc.push({
      ...item,
      sort_order: finalSortOrder,
      progress: rawProgress ? {
        id: '',
        student_id: ctx.studentId,
        item_id: item.id,
        entitlement_id: null,
        watched_seconds: rawProgress.watchedSeconds,
        total_seconds: rawProgress.totalSeconds,
        last_position_seconds: rawProgress.lastPositionSeconds,
        completed: rawProgress.completed,
        completed_at: null,
      } : null
    });
    return acc;
  }, [] as CurriculumItem[]);

  const items = rawItems.toSorted((a, b) => {
    const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (diff !== 0) return diff;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });

  const enrichedModules = sortedModules.reduce((acc, mod) => {
    const moduleItems = items.filter(i => i.module_id === mod.id);
    if (moduleItems.length > 0) {
      acc.push({
        ...mod,
        items: moduleItems
      });
    }
    return acc;
  }, [] as CurriculumModule[]);

  const courseTitle = catalogVariantScope?.title ?? course.title;

  return {
    ...course,
    title: courseTitle,
    modules: enrichedModules,
    metadata: {
      ...(typeof course.metadata === 'object' && course.metadata !== null ? course.metadata : {}),
      catalog_variant_id: variantId,
      parent_course_title: catalogVariantScope ? course.title : undefined,
    },
  } as unknown as CourseForStudent;
});

/**
 * Load course data for the player shell. Returns full detail when available;
 * otherwise a minimal published course shell when the student has access.
 */
export async function loadCoursePlayerShellCourse(
  collegeSlug: string,
  courseId: string,
  options?: { variantId?: string | null },
): Promise<CourseForStudent | null> {
  const detail = await getStudentCourseDetail(collegeSlug, courseId, options);
  if (detail) return detail;

  const ctx = await getStudentLearningContext(collegeSlug);
  const access = await validatePlayerCourseAccess(
    ctx.studentId,
    courseId,
    { isGlobal: ctx.isGlobal, collegeId: ctx.collegeId },
    { collegeSlug, variantId: options?.variantId },
  );
  if (!access.allowed) return null;

  const { getCachedMasterCourse } = await import('@/lib/services/course-cache');
  const row = await getCachedMasterCourse(courseId);

  if (!row) return null;

  return {
    ...row,
    modules: [],
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {},
  } as unknown as CourseForStudent;
}


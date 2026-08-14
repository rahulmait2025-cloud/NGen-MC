import 'server-only';

import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { LEGACY_BOOTCAMP_PILLAR_SLUG } from '@/lib/services/paid-course-catalog';
import type { BundleItemType, BundleResolvedItemSourceType } from '@/types/database';

export interface BundleCourseEntry {
  sequence: number;
  courseId: string;
  title: string;
  shortDescription: string | null;
  pillarSlug: string | null;
  variantId: string | null;
  accessScope: 'full' | 'partial';
  moduleCount: number;
  lessonCount: number;
  itemIds: Set<string>;
}

export interface BundleCurriculumLesson {
  id: string;
  title: string;
  itemType: string;
  durationSeconds: number | null;
  locked: boolean;
}

export interface BundleCurriculumModule {
  id: string;
  title: string;
  lessons: BundleCurriculumLesson[];
}

export interface BundleCurriculumCourse {
  sequence: number;
  courseId: string;
  title: string;
  modules: BundleCurriculumModule[];
}

interface BundleItemRow {
  id: string;
  item_type: BundleItemType;
  reference_id: string;
  sort_order: number;
}

interface ResolvedRow {
  parent_master_course_id: string;
  master_course_item_id: string;
  source_type: BundleResolvedItemSourceType;
  source_id: string;
  source_variant_id: string | null;
  display_title: string | null;
  sort_order: number;
}

const STAGE_LABELS = ['FOUNDATIONS', 'CORE', 'PRACTICE', 'OUTPUT', 'PREPARATION', 'REVIEW'];

export function bundleCourseStageLabel(index: number): string | null {
  return STAGE_LABELS[Math.min(index, STAGE_LABELS.length - 1)] ?? null;
}

function resolveCourseDisplayTitle(
  course: {
    title?: string | null;
    code?: string | null;
  },
  paidLandingTitle?: string | null,
): string {
  const landingTitle = typeof paidLandingTitle === 'string' ? paidLandingTitle.trim() : '';
  if (landingTitle) return landingTitle;

  const title = typeof course.title === 'string' ? course.title.trim() : '';
  if (title) return title;
  const code = typeof course.code === 'string' ? course.code.trim() : '';
  if (code) return code;
  return 'Course';
}

async function loadResolvedRows(bundleId: string): Promise<ResolvedRow[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('bundle_resolved_items')
    .select(
      'parent_master_course_id, master_course_item_id, source_type, source_id, source_variant_id, display_title, sort_order',
    )
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true });

  return (data ?? []) as ResolvedRow[];
}

async function resolveFromBundleItems(bundleId: string): Promise<ResolvedRow[]> {
  const sb = createAdminClient();

  const { data: bundleItems } = await sb
    .from('bundle_items')
    .select('id, item_type, reference_id, sort_order')
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true });

  if (!bundleItems?.length) return [];

  const items = bundleItems as BundleItemRow[];
  const bundleItemIds = items.map((i) => i.id);

  const { data: overrideRows } = await sb
    .from('bundle_item_selected_items')
    .select('bundle_item_id, master_course_item_id, sort_order')
    .in('bundle_item_id', bundleItemIds)
    .order('sort_order', { ascending: true });

  const overrideMap = new Map<string, string[]>();
  for (const row of overrideRows ?? []) {
    const bid = row.bundle_item_id as string;
    if (!overrideMap.has(bid)) overrideMap.set(bid, []);
    overrideMap.get(bid)!.push(row.master_course_item_id as string);
  }

  const resolved: ResolvedRow[] = [];
  let sortOrder = 0;
  const visitedBundles = new Set<string>();

  // Sequential: bundle walk mutates shared `resolved` array and `visitedBundles` set — must stay sequential
  async function walkBundleItems(
    currentBundleId: string,
    baseSort: number,
  ): Promise<void> {
    if (visitedBundles.has(currentBundleId)) return;
    visitedBundles.add(currentBundleId);

    const { data: nestedItems } = await sb
      .from('bundle_items')
      .select('id, item_type, reference_id, sort_order')
      .eq('bundle_id', currentBundleId)
      .order('sort_order', { ascending: true });

    for (const bi of (nestedItems ?? []) as BundleItemRow[]) {
      const itemSort = baseSort + bi.sort_order;
      const overrides = overrideMap.get(bi.id);

      if (bi.item_type === 'master_course') {
        const { data: mcItems } = await sb
          .from('master_course_items')
          .select('id')
          .eq('master_course_id', bi.reference_id)
          .eq('publish_status', 'published')
          .order('sort_order', { ascending: true });

        for (const item of mcItems ?? []) {
          resolved.push({
            parent_master_course_id: bi.reference_id,
            master_course_item_id: item.id as string,
            source_type: 'master_course',
            source_id: bi.reference_id,
            source_variant_id: null,
            display_title: null,
            sort_order: itemSort * 1000 + sortOrder++,
          });
        }
      } else if (bi.item_type === 'variant') {
        const { data: variantItems } = await sb
          .from('course_variant_items')
          .select('master_course_item_id, master_course_items!inner(id, master_course_id, publish_status)')
          .eq('course_variant_id', bi.reference_id)
          .eq('master_course_items.publish_status', 'published');

        const { data: variant } = await sb
          .from('course_variants')
          .select('id, title, master_course_id')
          .eq('id', bi.reference_id)
          .maybeSingle();

        for (const row of variantItems ?? []) {
          const joined = row.master_course_items as
            | { id: string; master_course_id: string }
            | { id: string; master_course_id: string }[]
            | null;
          const item = Array.isArray(joined) ? joined[0] : joined;
          if (!item) continue;

          resolved.push({
            parent_master_course_id: item.master_course_id,
            master_course_item_id: row.master_course_item_id as string,
            source_type: 'variant',
            source_id: bi.reference_id,
            source_variant_id: variant?.id as string | null,
            display_title: (variant?.title as string) ?? null,
            sort_order: itemSort * 1000 + sortOrder++,
          });
        }
      } else if (bi.item_type === 'master_course_item') {
        const { data: item } = await sb
          .from('master_course_items')
          .select('id, master_course_id')
          .eq('id', bi.reference_id)
          .eq('publish_status', 'published')
          .maybeSingle();

        if (!item) continue;

        const selectedIds =
          overrides && overrides.length > 0 ? overrides : [bi.reference_id];

        for (const itemId of selectedIds) {
          resolved.push({
            parent_master_course_id: item.master_course_id as string,
            master_course_item_id: itemId,
            source_type: 'master_course_item',
            source_id: bi.reference_id,
            source_variant_id: null,
            display_title: null,
            sort_order: itemSort * 1000 + sortOrder++,
          });
        }
      } else if (bi.item_type === 'bundle') {
        await walkBundleItems(bi.reference_id, itemSort * 1000);
      }
    }
  }

  await walkBundleItems(bundleId, 0);
  resolved.sort((a, b) => a.sort_order - b.sort_order);
  return resolved;
}

/**
 * Ordered unique courses included in a bundle with scoped item sets.
 */
interface SerializedBundleCourseEntry {
  sequence: number;
  courseId: string;
  title: string;
  shortDescription: string | null;
  pillarSlug: string | null;
  variantId: string | null;
  accessScope: 'full' | 'partial';
  moduleCount: number;
  lessonCount: number;
  itemIds: string[];
}

async function resolveBundleCourseEntriesCached(bundleId: string): Promise<SerializedBundleCourseEntry[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('bundle-course-entries', 'bundles');
  let resolvedRows = await loadResolvedRows(bundleId);
  if (resolvedRows.length === 0) {
    resolvedRows = await resolveFromBundleItems(bundleId);
  }
  if (resolvedRows.length === 0) return [];

    const sb = createAdminClient();
    const courseOrder: string[] = [];
    const courseOrderSet = new Set<string>();
    const courseMeta = new Map<
      string,
      {
        variantId: string | null;
        displayTitle: string | null;
        sourceType: BundleResolvedItemSourceType;
        accessScope: 'full' | 'partial';
        itemIds: Set<string>;
      }
    >();

    const fullCourseSourceIds = new Set<string>();

    const { data: bundleItems } = await sb
      .from('bundle_items')
      .select('item_type, reference_id')
      .eq('bundle_id', bundleId);

    for (const bi of bundleItems ?? []) {
      if ((bi.item_type as string) === 'master_course') {
        fullCourseSourceIds.add(bi.reference_id as string);
      }
    }

    for (const row of resolvedRows) {
      const courseId = row.parent_master_course_id;
      if (!courseOrderSet.has(courseId)) {
        courseOrderSet.add(courseId);
        courseOrder.push(courseId);
      }

      if (!courseMeta.has(courseId)) {
        const isFull =
          row.source_type === 'master_course' && fullCourseSourceIds.has(row.source_id);
        courseMeta.set(courseId, {
          variantId: row.source_variant_id,
          displayTitle: row.display_title,
          sourceType: row.source_type,
          accessScope: isFull ? 'full' : 'partial',
          itemIds: new Set(),
        });
      }

      const meta = courseMeta.get(courseId)!;
      meta.itemIds.add(row.master_course_item_id);
      if (row.source_variant_id && !meta.variantId) {
        meta.variantId = row.source_variant_id;
      }
      if (row.display_title && !meta.displayTitle) {
        meta.displayTitle = row.display_title;
      }
    }

    const courseIds = courseOrder;
    const [coursesRes, pillarsRes, itemsRes, paidLandingRes] = await Promise.all([
      sb
        .from('master_courses')
        .select('id, title, short_description, slug, pillar_id, bootcamp_id, catalog_type, code')
        .in('id', courseIds)
        .eq('publish_status', 'published'),
      sb.from('master_course_pillars').select('id, slug'),
      sb
        .from('master_course_items')
        .select('id, master_course_id, module_id, item_type, publish_status, quiz_id')
        .in('master_course_id', courseIds)
        .eq('publish_status', 'published'),
      sb
        .from('paid_course_landing_metadata')
        .select('source_id, title')
        .eq('source_type', 'master_course')
        .in('source_id', courseIds),
    ]);

    const paidLandingTitleByCourseId = new Map<string, string>();
    for (const row of paidLandingRes.data ?? []) {
      const title = (row.title as string | null)?.trim();
      if (title) paidLandingTitleByCourseId.set(row.source_id as string, title);
    }

    const courseMap = new Map((coursesRes.data ?? []).map((c) => [c.id as string, c]));
    const pillarSlugMap = new Map((pillarsRes.data ?? []).map((p) => [p.id as string, p.slug as string]));

    const itemsByCourse = new Map<string, typeof itemsRes.data>();
    for (const item of itemsRes.data ?? []) {
      const cid = item.master_course_id as string;
      if (!itemsByCourse.has(cid)) itemsByCourse.set(cid, []);
      itemsByCourse.get(cid)!.push(item);
    }

    const entries: SerializedBundleCourseEntry[] = [];

    courseOrder.forEach((courseId, index) => {
      const course = courseMap.get(courseId);
      if (!course) return;

      const meta = courseMeta.get(courseId);
      if (!meta) return;

      const scopedItems = (itemsByCourse.get(courseId) ?? []).filter((item) =>
        meta.accessScope === 'full' ? true : meta.itemIds.has(item.id as string),
      );

      const moduleIds = new Set<string>();
      let lessonCount = 0;
      for (const item of scopedItems) {
        moduleIds.add(item.module_id as string);
        if (item.item_type === 'video' || item.item_type === 'markdown') {
          lessonCount++;
        }
      }

      const pillarSlug = course.bootcamp_id || course.catalog_type === 'bootcamp'
        ? LEGACY_BOOTCAMP_PILLAR_SLUG
        : course.pillar_id
          ? pillarSlugMap.get(course.pillar_id as string) ?? null
          : null;

      entries.push({
        sequence: index + 1,
        courseId,
        title: resolveCourseDisplayTitle(course, paidLandingTitleByCourseId.get(courseId)),
        shortDescription: (course.short_description as string | null) ?? null,
        pillarSlug,
        variantId: meta.variantId,
        accessScope: meta.accessScope,
        moduleCount: moduleIds.size,
        lessonCount,
        itemIds: Array.from(meta.itemIds),
      });
    });

    return entries;
  }

/**
 * Ordered unique courses included in a bundle with scoped item sets.
 */
export async function resolveBundleCourseEntries(bundleId: string): Promise<BundleCourseEntry[]> {
  const cached = await resolveBundleCourseEntriesCached(bundleId);
  return cached.map((entry) => ({
    ...entry,
    itemIds: new Set(entry.itemIds),
  }));
}

/**
 * Course-wise curriculum grouped by module for bundle detail page.
 */
export async function resolveBundleCurriculum(
  bundleId: string,
  entitled: boolean,
): Promise<BundleCurriculumCourse[]> {
  const entries = await resolveBundleCourseEntries(bundleId);
  if (entries.length === 0) return [];

  const sb = createAdminClient();
  const courseIds = entries.map((e) => e.courseId);
  const allItemIds = new Set<string>();
  for (const entry of entries) {
    for (const id of entry.itemIds) allItemIds.add(id);
  }

  const [modulesRes, itemsRes] = await Promise.all([
    sb
      .from('master_course_modules')
      .select('id, master_course_id, title, sort_order')
      .in('master_course_id', courseIds)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
    sb
      .from('master_course_items')
      .select('id, master_course_id, module_id, title, item_type, sort_order, metadata, quiz_id')
      .in('master_course_id', courseIds)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
  ]);

  const modulesByCourse = new Map<string, NonNullable<typeof modulesRes.data>>();
  for (const mod of modulesRes.data ?? []) {
    const cid = mod.master_course_id as string;
    if (!modulesByCourse.has(cid)) modulesByCourse.set(cid, []);
    modulesByCourse.get(cid)!.push(mod);
  }

  const itemsByModule = new Map<string, NonNullable<typeof itemsRes.data>>();
  const entryByCourseId = new Map<string, BundleCourseEntry>();
  for (const entry of entries) {
    entryByCourseId.set(entry.courseId, entry);
  }
  for (const item of itemsRes.data ?? []) {
    const entry = entryByCourseId.get(item.master_course_id as string);
    if (!entry) continue;
    if (entry.accessScope !== 'full' && !entry.itemIds.has(item.id as string)) continue;

    const mid = item.module_id as string;
    if (!itemsByModule.has(mid)) itemsByModule.set(mid, []);
    itemsByModule.get(mid)!.push(item);
  }

  return entries.reduce((acc, entry) => {
    const modules = (modulesByCourse.get(entry.courseId) ?? []).reduce((modAcc, mod) => {
      const lessons = (itemsByModule.get(mod.id as string) ?? []).map((item) => {
        const itemMeta = item.metadata as Record<string, unknown> | null;
        const durationFromMeta =
          typeof itemMeta?.duration_seconds === 'number'
            ? itemMeta.duration_seconds
            : typeof itemMeta?.duration_minutes === 'number'
              ? itemMeta.duration_minutes * 60
              : null;
        return {
          id: item.id as string,
          title: item.title as string,
          itemType: item.item_type as string,
          durationSeconds: durationFromMeta,
          locked: !entitled,
        };
      });

      if (lessons.length > 0) {
        modAcc.push({
          id: mod.id as string,
          title: mod.title as string,
          lessons,
        });
      }
      return modAcc;
    }, [] as Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; itemType: string; durationSeconds: number | null; locked: boolean }> }>);

    if (modules.length > 0) {
      acc.push({
        sequence: entry.sequence,
        courseId: entry.courseId,
        title: entry.title,
        modules,
      });
    }
    return acc;
  }, [] as Array<{ sequence: number; courseId: string; title: string; modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; itemType: string; durationSeconds: number | null; locked: boolean }> }> }>);
}

/**
 * Batch-resolve course entries for multiple bundles in parallel.
 * Reduces N+1 DB queries when resolving entries for many bundles at once.
 */
export async function resolveBundleCourseEntriesBatch(
  bundleIds: string[],
): Promise<Map<string, BundleCourseEntry[]>> {
  if (bundleIds.length === 0) return new Map();

  const uniqueIds = [...new Set(bundleIds)];
  const results = await Promise.all(
    uniqueIds.map(async (id) => ({
      id,
      entries: await resolveBundleCourseEntries(id),
    })),
  );

  const map = new Map<string, BundleCourseEntry[]>();
  for (const { id, entries } of results) {
    map.set(id, entries);
  }
  return map;
}

async function _countBundleConnectedCourses(bundleId: string): Promise<number> {
  const entries = await resolveBundleCourseEntries(bundleId);
  return entries.length;
}

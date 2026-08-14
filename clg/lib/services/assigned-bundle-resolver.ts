import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  BundleItemType,
  BundleResolvedItemSourceType,
  CourseBundlesRow,
  MasterCourseItemsRow,
  MasterCourseModulesRow,
} from '@/types/database';

export type CatalogSourceType = BundleResolvedItemSourceType;

export interface ResolvedCatalogItem {
  parentMasterCourseId: string;
  masterCourseItemId: string;
  sourceType: CatalogSourceType;
  sourceId: string;
  sourceVariantId?: string | null;
  sourceBundleId?: string | null;
  displayTitle?: string | null;
  sortOrder: number;
}

export interface AssignedBundleStats {
  module_count: number;
  video_count: number;
  lesson_count: number;
  total_duration_seconds: number;
}

export interface AssignedBundleLessonRow {
  id: string;
  title: string;
  item_type: string;
  module_id: string | null;
  module_title: string | null;
  duration_seconds: number | null;
  sort_order: number;
}

export interface AssignedBundleModuleGroup {
  module_id: string;
  module_title: string;
  lessons: AssignedBundleLessonRow[];
}

export type AssignedBundleDetailComponent =
  | {
      kind: 'master_course';
      courseId: string;
      title: string;
      modules: AssignedBundleModuleGroup[];
      invalid?: boolean;
    }
  | {
      kind: 'variant';
      variantId: string;
      title: string;
      parentCourseTitle: string;
      modules: AssignedBundleModuleGroup[];
      invalid?: boolean;
    }
  | {
      kind: 'master_course_item';
      courseId: string;
      parentCourseTitle: string;
      lessons: AssignedBundleLessonRow[];
      invalid?: boolean;
    }
  | {
      kind: 'nested_bundle';
      bundleId: string;
      title: string;
      lesson_count: number;
      module_count: number;
      video_count: number;
      components: AssignedBundleDetailComponent[];
      invalid?: boolean;
    };

export interface AssignedBundleDetailData {
  bundle: CourseBundlesRow;
  assignment: {
    id: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
  } | null;
  summary: AssignedBundleStats & {
    component_count: number;
    nested_bundle_detected: boolean;
    invalid_reference_count: number;
  };
  components: AssignedBundleDetailComponent[];
  warnings: string[];
}

interface ResolveBundleOptions {
  visitedBundleIds?: Set<string>;
  invalidReferenceCount?: { count: number };
}

function dedupeResolved(items: ResolvedCatalogItem[]): ResolvedCatalogItem[] {
  const seen = new Set<string>();
  const deduped: ResolvedCatalogItem[] = [];
  for (const item of items) {
    if (!seen.has(item.masterCourseItemId)) {
      seen.add(item.masterCourseItemId);
      deduped.push(item);
    }
  }
  return deduped.map((item, idx) => ({ ...item, sortOrder: idx }));
}

async function loadPersistedResolvedItems(bundleId: string): Promise<ResolvedCatalogItem[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('bundle_resolved_items')
    .select(
      'parent_master_course_id, master_course_item_id, source_type, source_id, source_variant_id, source_bundle_id, display_title, sort_order',
    )
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map((row, idx) => ({
    parentMasterCourseId: row.parent_master_course_id as string,
    masterCourseItemId: row.master_course_item_id as string,
    sourceType: row.source_type as CatalogSourceType,
    sourceId: row.source_id as string,
    sourceVariantId: (row.source_variant_id as string) ?? null,
    sourceBundleId: (row.source_bundle_id as string) ?? null,
    displayTitle: (row.display_title as string) ?? null,
    sortOrder: (row.sort_order as number) ?? idx,
  }));
}

async function resolveBundleDraftItems(
  bundleId: string,
  options?: ResolveBundleOptions,
): Promise<ResolvedCatalogItem[]> {
  const sb = createAdminClient();
  const visited = options?.visitedBundleIds ?? new Set<string>();
  const invalidCounter = options?.invalidReferenceCount;

  if (visited.has(bundleId)) {
    return [];
  }
  visited.add(bundleId);

  const { data: bundleItems, error: itemsErr } = await sb
    .from('bundle_items')
    .select('id, item_type, reference_id, sort_order')
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true });

  if (itemsErr) {
    throw new Error(`Failed to load bundle items: ${itemsErr.message}`);
  }

  if (!bundleItems || bundleItems.length === 0) {
    return [];
  }

  const bundleItemIds = bundleItems.map((bi) => bi.id as string);
  const { data: overrideRows } = await sb
    .from('bundle_item_selected_items')
    .select('bundle_item_id, master_course_item_id, sort_order')
    .in('bundle_item_id', bundleItemIds)
    .order('sort_order', { ascending: true });

  const overrideMap = new Map<string, string[]>();
  for (const row of overrideRows ?? []) {
    const bid = row.bundle_item_id as string;
    if (!overrideMap.has(bid)) {
      overrideMap.set(bid, []);
    }
    overrideMap.get(bid)!.push(row.master_course_item_id as string);
  }

  const masterCourseIds = bundleItems.reduce((acc, bi) => {
    if (bi.item_type === 'master_course') acc.push(bi.reference_id as string);
    return acc;
  }, [] as string[]);

  const masterCourseItemsMap = new Map<string, ResolvedCatalogItem[]>();
  if (masterCourseIds.length > 0) {
    const { data: mcItems } = await sb
      .from('master_course_items')
      .select('id, master_course_id, title, sort_order')
      .in('master_course_id', masterCourseIds)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true });

    for (const item of mcItems ?? []) {
      const mcId = item.master_course_id as string;
      if (!masterCourseItemsMap.has(mcId)) {
        masterCourseItemsMap.set(mcId, []);
      }
      masterCourseItemsMap.get(mcId)!.push({
        parentMasterCourseId: mcId,
        masterCourseItemId: item.id as string,
        sourceType: 'master_course',
        sourceId: mcId,
        sourceVariantId: null,
        sourceBundleId: null,
        displayTitle: (item.title as string) ?? null,
        sortOrder: (item.sort_order as number) ?? 0,
      });
    }
  }

  const variantIds = bundleItems.reduce((acc, bi) => {
    if (bi.item_type === 'variant') acc.push(bi.reference_id as string);
    return acc;
  }, [] as string[]);

  const variantItemsMap = new Map<string, ResolvedCatalogItem[]>();
  if (variantIds.length > 0) {
    const { data: variants } = await sb
      .from('course_variants')
      .select('id, master_course_id')
      .in('id', variantIds);

    const variantCourseMap = new Map<string, string>();
    for (const v of variants ?? []) {
      variantCourseMap.set(v.id as string, v.master_course_id as string);
    }

    const { data: viRows } = await sb
      .from('course_variant_items')
      .select('course_variant_id, master_course_item_id, sort_order')
      .in('course_variant_id', variantIds)
      .order('sort_order', { ascending: true });

    for (const row of viRows ?? []) {
      const vid = row.course_variant_id as string;
      const mcId = variantCourseMap.get(vid) ?? '';
      if (!variantItemsMap.has(vid)) {
        variantItemsMap.set(vid, []);
      }
      variantItemsMap.get(vid)!.push({
        parentMasterCourseId: mcId,
        masterCourseItemId: row.master_course_item_id as string,
        sourceType: 'variant',
        sourceId: vid,
        sourceVariantId: vid,
        sourceBundleId: null,
        displayTitle: null,
        sortOrder: (row.sort_order as number) ?? 0,
      });
    }
  }

  const resolvedPerItem = await Promise.all(
    bundleItems.map(async (bi) => {
      const biId = bi.id as string;
      const itemType = bi.item_type as BundleItemType;
      const refId = bi.reference_id as string;
      const overrides = overrideMap.get(biId);

      let sourceItems: ResolvedCatalogItem[] = [];

      if (itemType === 'master_course') {
        sourceItems = masterCourseItemsMap.get(refId) ?? [];
        if (sourceItems.length === 0 && invalidCounter) {
          invalidCounter.count += 1;
        }
      } else if (itemType === 'variant') {
        sourceItems = variantItemsMap.get(refId) ?? [];
        if (sourceItems.length === 0 && invalidCounter) {
          invalidCounter.count += 1;
        }
      } else if (itemType === 'master_course_item') {
        const { data: singleItem } = await sb
          .from('master_course_items')
          .select('id, master_course_id, title, sort_order, publish_status')
          .eq('id', refId)
          .maybeSingle();

        if (singleItem && singleItem.publish_status === 'published') {
          sourceItems = [
            {
              parentMasterCourseId: singleItem.master_course_id as string,
              masterCourseItemId: singleItem.id as string,
              sourceType: 'master_course_item',
              sourceId: refId,
              sourceVariantId: null,
              sourceBundleId: null,
              displayTitle: (singleItem.title as string) ?? null,
              sortOrder: (singleItem.sort_order as number) ?? 0,
            },
          ];
        } else if (invalidCounter) {
          invalidCounter.count += 1;
        }
      } else if (itemType === 'bundle') {
        const persisted = await loadPersistedResolvedItems(refId);
        if (persisted.length > 0) {
          sourceItems = persisted.map((item) => ({
            ...item,
            sourceBundleId: item.sourceBundleId ?? refId,
          }));
        } else {
          const childItems = await resolveBundleDraftItems(refId, {
            visitedBundleIds: visited,
            invalidReferenceCount: invalidCounter,
          });
          sourceItems = childItems.map((item) => ({
            ...item,
            sourceBundleId: refId,
          }));
        }
        if (sourceItems.length === 0 && invalidCounter) {
          const { data: childBundle } = await sb
            .from('course_bundles')
            .select('id')
            .eq('id', refId)
            .maybeSingle();
          if (!childBundle) {
            invalidCounter.count += 1;
          }
        }
      }

      if (overrides && overrides.length > 0) {
        const overrideSet = new Set(overrides);
        const filtered = sourceItems.filter((item) => overrideSet.has(item.masterCourseItemId));
        const orderMap = new Map<string, number>();
        overrides.forEach((id, idx) => orderMap.set(id, idx));
        filtered.sort(
          (a, b) =>
            (orderMap.get(a.masterCourseItemId) ?? 0) - (orderMap.get(b.masterCourseItemId) ?? 0),
        );
        return filtered;
      }
      return sourceItems;
    }),
  );

  const allResolved: ResolvedCatalogItem[] = resolvedPerItem.flat();

  return dedupeResolved(allResolved);
}

async function resolveAssignedBundleLectures(
  bundleId: string,
): Promise<{ items: ResolvedCatalogItem[]; usedPersisted: boolean; nestedBundleDetected: boolean }> {
  const persisted = await loadPersistedResolvedItems(bundleId);
  if (persisted.length > 0) {
    const nestedBundleDetected = persisted.some((r) => r.sourceType === 'bundle');
    return {
      items: dedupeResolved(persisted),
      usedPersisted: true,
      nestedBundleDetected,
    };
  }

  const invalidCounter = { count: 0 };
  const items = await resolveBundleDraftItems(bundleId, { invalidReferenceCount: invalidCounter });
  const nestedBundleDetected = items.some((r) => r.sourceBundleId != null);
  return { items, usedPersisted: false, nestedBundleDetected };
}

async function computeStatsFromItemIds(itemIds: string[]): Promise<AssignedBundleStats> {
  if (itemIds.length === 0) {
    return { module_count: 0, video_count: 0, lesson_count: 0, total_duration_seconds: 0 };
  }

  const sb = createAdminClient();
  const { data: items } = await sb
    .from('master_course_items')
    .select('id, module_id, item_type, duration_seconds, video_asset_id')
    .in('id', itemIds)
    .eq('publish_status', 'published');

  const published = items ?? [];
  const moduleIds = new Set<string>();
  let videoCount = 0;
  let totalDuration = 0;

  const videoAssetIds: string[] = [];
  for (const item of published) {
    if (item.module_id) {
      moduleIds.add(item.module_id as string);
    }
    if (item.item_type === 'video') {
      videoCount += 1;
    }
    if (item.duration_seconds) {
      totalDuration += item.duration_seconds as number;
    } else if (item.video_asset_id) {
      videoAssetIds.push(item.video_asset_id as string);
    }
  }

  if (videoAssetIds.length > 0) {
    const { data: videos } = await sb
      .from('video_assets')
      .select('id, duration_seconds')
      .in('id', videoAssetIds);

    for (const video of videos ?? []) {
      if (video.duration_seconds) {
        totalDuration += video.duration_seconds as number;
      }
    }
  }

  return {
    module_count: moduleIds.size,
    video_count: videoCount,
    lesson_count: published.length,
    total_duration_seconds: totalDuration,
  };
}

export async function getAssignedBundleStats(
  bundleIds: string[],
): Promise<Map<string, AssignedBundleStats>> {
  const stats = new Map<string, AssignedBundleStats>();
  if (bundleIds.length === 0) {
    return stats;
  }

  await Promise.all(
    bundleIds.map(async (bundleId) => {
      try {
        const { items } = await resolveAssignedBundleLectures(bundleId);
        const itemIds = items.map((i) => i.masterCourseItemId);
        const computed = await computeStatsFromItemIds(itemIds);
        stats.set(bundleId, computed);
      } catch {
        stats.set(bundleId, {
          module_count: 0,
          video_count: 0,
          lesson_count: 0,
          total_duration_seconds: 0,
        });
      }
    }),
  );

  return stats;
}

function groupLessonsByModule(
  lessons: AssignedBundleLessonRow[],
  modulesById: Map<string, MasterCourseModulesRow>,
): AssignedBundleModuleGroup[] {
  const byModule = new Map<string, AssignedBundleLessonRow[]>();
  const moduleOrder: string[] = [];

  for (const lesson of lessons) {
    const modId = lesson.module_id ?? '__ungrouped__';
    if (!byModule.has(modId)) {
      byModule.set(modId, []);
      moduleOrder.push(modId);
    }
    byModule.get(modId)!.push(lesson);
  }

  return moduleOrder.map((modId) => {
    const mod = modId !== '__ungrouped__' ? modulesById.get(modId) : null;
    return {
      module_id: modId,
      module_title: mod?.title ?? 'Other content',
      lessons: (byModule.get(modId) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    };
  });
}

async function buildLessonRows(itemIds: string[]): Promise<{
  lessonsById: Map<string, AssignedBundleLessonRow>;
  modulesById: Map<string, MasterCourseModulesRow>;
}> {
  const lessonsById = new Map<string, AssignedBundleLessonRow>();
  const modulesById = new Map<string, MasterCourseModulesRow>();

  if (itemIds.length === 0) {
    return { lessonsById, modulesById };
  }

  const sb = createAdminClient();
  const { data: items } = await sb
    .from('master_course_items')
    .select('id, title, item_type, module_id, duration_seconds, sort_order, master_course_id')
    .in('id', itemIds)
    .eq('publish_status', 'published');

  const moduleIds = [
    ...new Set((items ?? []).flatMap((i) => i.module_id ? [i.module_id as string] : [])),
  ];

  if (moduleIds.length > 0) {
    const { data: modules } = await sb
      .from('master_course_modules')
      .select('*')
      .in('id', moduleIds)
      .eq('publish_status', 'published');

    for (const mod of modules ?? []) {
      modulesById.set(mod.id as string, mod as MasterCourseModulesRow);
    }
  }

  for (const item of (items ?? []) as MasterCourseItemsRow[]) {
    const mod = item.module_id ? modulesById.get(item.module_id as string) : null;
    lessonsById.set(item.id, {
      id: item.id,
      title: item.title,
      item_type: item.item_type,
      module_id: item.module_id,
      module_title: mod?.title ?? null,
      duration_seconds: item.duration_seconds,
      sort_order: item.sort_order,
    });
  }

  return { lessonsById, modulesById };
}

async function buildDetailComponents(
  bundleId: string,
  resolved: ResolvedCatalogItem[],
  invalidReferenceCount: number,
): Promise<AssignedBundleDetailComponent[]> {
  const sb = createAdminClient();
  const { data: bundleItems } = await sb
    .from('bundle_items')
    .select('id, item_type, reference_id, sort_order')
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true });

  if (!bundleItems || bundleItems.length === 0) {
    return [];
  }

  const resolvedBySource = new Map<string, ResolvedCatalogItem[]>();
  for (const item of resolved) {
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!resolvedBySource.has(key)) {
      resolvedBySource.set(key, []);
    }
    resolvedBySource.get(key)!.push(item);
  }

  const { lessonsById, modulesById } = await buildLessonRows(
    resolved.map((r) => r.masterCourseItemId),
  );

  const componentResults = await Promise.all(
    bundleItems.map(async (bi) => {
      const itemType = bi.item_type as BundleItemType;
      const refId = bi.reference_id as string;
      const sourceKey = `${itemType}:${refId}`;
      const sourceResolved = resolvedBySource.get(sourceKey) ?? [];

      if (itemType === 'master_course') {
        const { data: course } = await sb
          .from('master_courses')
          .select('id, title')
          .eq('id', refId)
          .maybeSingle();

        const lessons = sourceResolved
          .map((r) => lessonsById.get(r.masterCourseItemId))
          .filter((l): l is AssignedBundleLessonRow => Boolean(l));

        return {
          kind: 'master_course' as const,
          courseId: refId,
          title: course?.title ?? 'Unknown course',
          modules: groupLessonsByModule(lessons, modulesById),
          invalid: !course || lessons.length === 0,
        };
      } else if (itemType === 'variant') {
        const { data: variant } = await sb
          .from('course_variants')
          .select('id, title, master_course_id, master_courses ( title )')
          .eq('id', refId)
          .maybeSingle();

        let parentTitle = 'Unknown course';
        const mcJoin = variant?.master_courses as { title?: string } | { title?: string }[] | null | undefined;
        if (Array.isArray(mcJoin) && mcJoin[0]?.title) {
          parentTitle = mcJoin[0].title;
        } else if (mcJoin && !Array.isArray(mcJoin) && mcJoin.title) {
          parentTitle = mcJoin.title;
        }

        const lessons = sourceResolved
          .map((r) => lessonsById.get(r.masterCourseItemId))
          .filter((l): l is AssignedBundleLessonRow => Boolean(l));

        return {
          kind: 'variant' as const,
          variantId: refId,
          title: variant?.title ?? 'Unknown variant',
          parentCourseTitle: parentTitle ?? 'Unknown course',
          modules: groupLessonsByModule(lessons, modulesById),
          invalid: !variant || lessons.length === 0,
        };
      } else if (itemType === 'master_course_item') {
        const first = sourceResolved[0];
        const { data: parentCourse } = first
          ? await sb
              .from('master_courses')
              .select('id, title')
              .eq('id', first.parentMasterCourseId)
              .maybeSingle()
          : { data: null };

        const lessons = sourceResolved
          .map((r) => lessonsById.get(r.masterCourseItemId))
          .filter((l): l is AssignedBundleLessonRow => Boolean(l));

        return {
          kind: 'master_course_item' as const,
          courseId: first?.parentMasterCourseId ?? '',
          parentCourseTitle: parentCourse?.title ?? 'Unknown course',
          lessons,
          invalid: lessons.length === 0,
        };
      } else if (itemType === 'bundle') {
        const { data: nested } = await sb
          .from('course_bundles')
          .select('id, title')
          .eq('id', refId)
          .maybeSingle();

        const nestedResolved = sourceResolved.length > 0
          ? sourceResolved
          : (await resolveAssignedBundleLectures(refId)).items;

        const nestedStats = await computeStatsFromItemIds(
          nestedResolved.map((r) => r.masterCourseItemId),
        );

        let childComponents: AssignedBundleDetailComponent[] = [];
        try {
          childComponents = await buildDetailComponents(refId, nestedResolved, 0);
        } catch {
          childComponents = [];
        }

        return {
          kind: 'nested_bundle' as const,
          bundleId: refId,
          title: nested?.title ?? 'Unknown bundle',
          lesson_count: nestedStats.lesson_count,
          module_count: nestedStats.module_count,
          video_count: nestedStats.video_count,
          components: childComponents,
          invalid: !nested,
        };
      }

      return null;
    }),
  );

  const components = componentResults.filter((c): c is NonNullable<typeof c> => c !== null);

  if (invalidReferenceCount > 0 && components.every((c) => !c.invalid)) {
    // surface at least one warning via invalid flags on empty components
    for (const c of components) {
      if (
        (c.kind === 'master_course' || c.kind === 'variant' || c.kind === 'master_course_item') &&
        ((c.kind === 'master_course' && c.modules.every((m) => m.lessons.length === 0)) ||
          (c.kind === 'variant' && c.modules.every((m) => m.lessons.length === 0)) ||
          (c.kind === 'master_course_item' && c.lessons.length === 0))
      ) {
        c.invalid = true;
      }
    }
  }

  return components;
}

export async function getAssignedBundleDetail(
  bundleId: string,
): Promise<Omit<AssignedBundleDetailData, 'assignment'> | null> {
  const sb = createAdminClient();

  const { data: bundle, error } = await sb
    .from('course_bundles')
    .select('id, title, code, slug, description, publish_status, lifecycle_status, created_at, updated_at')
    .eq('id', bundleId)
    .maybeSingle();

  if (error || !bundle) {
    return null;
  }

  const invalidCounter = { count: 0 };
  let resolved: ResolvedCatalogItem[];
  let nestedBundleDetected: boolean;

  const persisted = await loadPersistedResolvedItems(bundleId);
  if (persisted.length > 0) {
    resolved = dedupeResolved(persisted);
    nestedBundleDetected = resolved.some((r) => r.sourceType === 'bundle' || r.sourceBundleId != null);
  } else {
    resolved = await resolveBundleDraftItems(bundleId, { invalidReferenceCount: invalidCounter });
    nestedBundleDetected = resolved.some((r) => r.sourceBundleId != null);
  }

  const itemIds = resolved.map((r) => r.masterCourseItemId);
  const [summaryStats, components] = await Promise.all([
    computeStatsFromItemIds(itemIds),
    buildDetailComponents(bundleId, resolved, invalidCounter.count),
  ]);

  const warnings: string[] = [];
  if (invalidCounter.count > 0) {
    warnings.push(
      `${invalidCounter.count} bundle component reference(s) could not be resolved or have no published content.`,
    );
  }
  for (const c of components) {
    if (c.invalid) {
      warnings.push(`Component "${'title' in c ? c.title : bundle.title}" has missing or unpublished content.`);
    }
  }

  const { data: bundleItems } = await sb
    .from('bundle_items')
    .select('id')
    .eq('bundle_id', bundleId);

  return {
    bundle: bundle as CourseBundlesRow,
    summary: {
      ...summaryStats,
      component_count: bundleItems?.length ?? 0,
      nested_bundle_detected: nestedBundleDetected,
      invalid_reference_count: invalidCounter.count,
    },
    components,
    warnings: [...new Set(warnings)],
  };
}

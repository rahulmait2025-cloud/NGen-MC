import 'server-only';

/**
 * Catalog Effective Access Service (Phase 1).
 *
 * Shared resolver utilities for lecture-level bundle/variant/master_course resolution.
 * Provides the foundation for flattening bundle contents into master_course_item access.
 *
 * SAFETY:
 *   - Does NOT modify existing LMS student access runtime (Phase 3).
 *   - Does NOT modify payment flow.
 *   - Does NOT create TPStreams duplicates.
 *   - read-only for existing entitlement tables.
 *
 * Functions:
 *   - resolveMasterCourseItems    — published items from a master course
 *   - resolveVariantItems         — selected items from a variant
 *   - resolveBundleDraftItems     — flattened bundle items with overrides + recursion
 *   - rebuildBundleResolvedItems  — persist resolved items to bundle_resolved_items
 *   - rebuildAllBundleResolvedItems — batch rebuild all bundles
 *   - getStudentEffectiveAccessibleItemIds — foundation utility (not wired to LMS runtime)
 *   - canStudentAccessMasterCourseItem     — boolean wrapper (not wired to LMS runtime)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { isAssignmentActive } from '@/lib/services/access-helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CatalogSourceType =
  | 'master_course'
  | 'variant'
  | 'master_course_item'
  | 'bundle';

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

// ─── 1. resolveMasterCourseItems ──────────────────────────────────────────────

/**
 * Resolve all published items from a master course.
 * Returns one ResolvedCatalogItem per master_course_item.
 */
async function _resolveMasterCourseItems(
  masterCourseId: string,
): Promise<ResolvedCatalogItem[]> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('master_course_items')
    .select('id, title, sort_order')
    .eq('master_course_id', masterCourseId)
    .eq('publish_status', 'published')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to resolve master course items: ${error.message}`);

  return (data ?? []).map((item, idx) => ({
    parentMasterCourseId: masterCourseId,
    masterCourseItemId: item.id as string,
    sourceType: 'master_course' as CatalogSourceType,
    sourceId: masterCourseId,
    sourceVariantId: null,
    sourceBundleId: null,
    displayTitle: (item.title as string) ?? null,
    sortOrder: (item.sort_order as number) ?? idx,
  }));
}

// ─── 2. resolveVariantItems ───────────────────────────────────────────────────

/**
 * Resolve variant items to their master_course_item references.
 * Returns only the items selected in course_variant_items (not all parent course items).
 */
async function resolveVariantItems(
  variantId: string,
): Promise<ResolvedCatalogItem[]> {
  const sb = createAdminClient();

  // Get variant to find parent master_course_id
  const { data: variant, error: varErr } = await sb
    .from('course_variants')
    .select('id, master_course_id')
    .eq('id', variantId)
    .single();

  if (varErr || !variant) throw new Error(`Variant not found: ${variantId}`);

  const { data, error } = await sb
    .from('course_variant_items')
    .select('master_course_item_id, sort_order')
    .eq('course_variant_id', variantId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to resolve variant items: ${error.message}`);

  return (data ?? []).map((item, idx) => ({
    parentMasterCourseId: variant.master_course_id as string,
    masterCourseItemId: item.master_course_item_id as string,
    sourceType: 'variant' as CatalogSourceType,
    sourceId: variantId,
    sourceVariantId: variantId,
    sourceBundleId: null,
    displayTitle: null,
    sortOrder: (item.sort_order as number) ?? idx,
  }));
}

// ─── 3. resolveBundleDraftItems ───────────────────────────────────────────────

interface ResolveBundleOptions {
  visitedBundleIds?: Set<string>;
}

/**
 * Resolve bundle_items into a flat list of ResolvedCatalogItems.
 *
 * Resolution rules:
 *   - master_course -> all published items from that master course
 *   - variant -> course_variant_items.master_course_item_id only
 *   - master_course_item -> that one item
 *   - bundle -> prefer bundle_resolved_items; else recursively resolve child bundle_items
 *
 * Selected item overrides:
 *   - If bundle_item_selected_items has rows for a bundle_item_id, include only those.
 *   - If no override rows exist, include the full resolved source.
 *
 * De-duplicates by master_course_item_id (keeps first occurrence).
 */
export async function resolveBundleDraftItems(
  bundleId: string,
  options?: ResolveBundleOptions,
): Promise<ResolvedCatalogItem[]> {
  const sb = createAdminClient();
  const visited = options?.visitedBundleIds ?? new Set<string>();

  if (visited.has(bundleId)) return [];
  visited.add(bundleId);

  // Load bundle to find parent master_course context
  const { data: bundle, error: bundleErr } = await sb
    .from('course_bundles')
    .select('id')
    .eq('id', bundleId)
    .single();

  if (bundleErr || !bundle) throw new Error(`Bundle not found: ${bundleId}`);

  // Load bundle_items
  const { data: bundleItems, error: itemsErr } = await sb
    .from('bundle_items')
    .select('id, item_type, reference_id, sort_order')
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true });

  if (itemsErr) throw new Error(`Failed to load bundle items: ${itemsErr.message}`);

  if (!bundleItems || bundleItems.length === 0) return [];

  // Load all selected item overrides for this bundle in one query
  const bundleItemIds = bundleItems.map((bi) => bi.id as string);
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

  // Batch-resolve master_course references
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
      if (!masterCourseItemsMap.has(mcId)) masterCourseItemsMap.set(mcId, []);
      masterCourseItemsMap.get(mcId)!.push({
        parentMasterCourseId: mcId,
        masterCourseItemId: item.id as string,
        sourceType: 'master_course',
        sourceId: mcId,
        sourceVariantId: null,
        sourceBundleId: null,
        displayTitle: null,
        sortOrder: (item.sort_order as number) ?? 0,
      });
    }
  }

  // Batch-resolve variant references
  const variantIds = bundleItems.reduce((acc, bi) => {
    if (bi.item_type === 'variant') acc.push(bi.reference_id as string);
    return acc;
  }, [] as string[]);

  const variantItemsMap = new Map<string, ResolvedCatalogItem[]>();
  if (variantIds.length > 0) {
    // Get variant -> master_course_id mapping
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
      if (!variantItemsMap.has(vid)) variantItemsMap.set(vid, []);
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

  // Resolve each bundle_item
  const resolvedPerItem = await Promise.all(
    bundleItems.map(async (bi) => {
      const biId = bi.id as string;
      const itemType = bi.item_type as CatalogSourceType;
      const refId = bi.reference_id as string;
      const overrides = overrideMap.get(biId);

      let sourceItems: ResolvedCatalogItem[] = [];

      if (itemType === 'master_course') {
        sourceItems = masterCourseItemsMap.get(refId) ?? [];
      } else if (itemType === 'variant') {
        sourceItems = variantItemsMap.get(refId) ?? [];
      } else if (itemType === 'master_course_item') {
        const { data: singleItem } = await sb
          .from('master_course_items')
          .select('id, master_course_id, title, sort_order')
          .eq('id', refId)
          .single();

        if (singleItem) {
          sourceItems = [{
            parentMasterCourseId: singleItem.master_course_id as string,
            masterCourseItemId: singleItem.id as string,
            sourceType: 'master_course_item',
            sourceId: refId,
            sourceVariantId: null,
            sourceBundleId: null,
            displayTitle: (singleItem.title as string) ?? null,
            sortOrder: (singleItem.sort_order as number) ?? 0,
          }];
        }
      } else if (itemType === 'bundle') {
        const { data: resolvedRows } = await sb
          .from('bundle_resolved_items')
          .select('master_course_item_id, parent_master_course_id, source_type, source_id, source_variant_id, source_bundle_id, display_title, sort_order')
          .eq('bundle_id', refId)
          .order('sort_order', { ascending: true });

        if (resolvedRows && resolvedRows.length > 0) {
          sourceItems = resolvedRows.map((row) => ({
            parentMasterCourseId: row.parent_master_course_id as string,
            masterCourseItemId: row.master_course_item_id as string,
            sourceType: (row.source_type as CatalogSourceType) ?? 'bundle',
            sourceId: row.source_id as string,
            sourceVariantId: (row.source_variant_id as string) ?? null,
            sourceBundleId: (row.source_bundle_id as string) ?? refId,
            displayTitle: (row.display_title as string) ?? null,
            sortOrder: (row.sort_order as number) ?? 0,
          }));
        } else {
          const childItems = await resolveBundleDraftItems(refId, { visitedBundleIds: visited });
          sourceItems = childItems.map((item) => ({
            ...item,
            sourceBundleId: refId,
          }));
        }
      }

      if (overrides && overrides.length > 0) {
        const overrideSet = new Set(overrides);
        const filtered = sourceItems.filter((item) => overrideSet.has(item.masterCourseItemId));
        const orderMap = new Map<string, number>();
        overrides.forEach((id, idx) => orderMap.set(id, idx));
        filtered.sort((a, b) => (orderMap.get(a.masterCourseItemId) ?? 0) - (orderMap.get(b.masterCourseItemId) ?? 0));
        return filtered;
      }
      return sourceItems;
    }),
  );

  const allResolved: ResolvedCatalogItem[] = resolvedPerItem.flat();

  // De-duplicate by master_course_item_id (keep first occurrence)
  const seen = new Set<string>();
  const deduped: ResolvedCatalogItem[] = [];
  for (const item of allResolved) {
    if (!seen.has(item.masterCourseItemId)) {
      seen.add(item.masterCourseItemId);
      deduped.push(item);
    }
  }

  // Re-index sort_order
  return deduped.map((item, idx) => ({ ...item, sortOrder: idx }));
}

// ─── 4. rebuildBundleResolvedItems ────────────────────────────────────────────

/**
 * Rebuild the bundle_resolved_items table for a single bundle.
 * Deletes existing rows and inserts newly resolved ones.
 *
 * Returns: { bundleId, resolvedCount, duplicateCount }
 */
export async function rebuildBundleResolvedItems(
  bundleId: string,
): Promise<{ bundleId: string; resolvedCount: number; duplicateCount: number }> {
  const sb = createAdminClient();

  // Resolve all items
  const resolved = await resolveBundleDraftItems(bundleId);

  // Find parent master_course_id for each item
  // We need to look up the master_course_id from the master_course_items table
  const itemIds = resolved.map((r) => r.masterCourseItemId);
  const itemCourseMap = new Map<string, string>();

  if (itemIds.length > 0) {
    const { data: items } = await sb
      .from('master_course_items')
      .select('id, master_course_id')
      .in('id', itemIds);

    for (const item of items ?? []) {
      itemCourseMap.set(item.id as string, item.master_course_id as string);
    }
  }

  // Delete existing resolved items
  const { error: delErr } = await sb
    .from('bundle_resolved_items')
    .delete()
    .eq('bundle_id', bundleId);

  if (delErr) throw new Error(`Failed to delete resolved items: ${delErr.message}`);

  // Insert new resolved items
  let duplicateCount = 0;
  const totalBeforeDedup = resolved.length;

  if (resolved.length > 0) {
    const rows = resolved.map((item) => ({
      bundle_id: bundleId,
      parent_master_course_id: itemCourseMap.get(item.masterCourseItemId) ?? item.parentMasterCourseId,
      master_course_item_id: item.masterCourseItemId,
      source_type: item.sourceType,
      source_id: item.sourceId,
      source_variant_id: item.sourceVariantId ?? null,
      source_bundle_id: item.sourceBundleId ?? null,
      display_title: item.displayTitle ?? null,
      sort_order: item.sortOrder,
    }));

    const { error: insErr } = await sb
      .from('bundle_resolved_items')
      .insert(rows);

    if (insErr) throw new Error(`Failed to insert resolved items: ${insErr.message}`);
  }

  duplicateCount = totalBeforeDedup - resolved.length;

  return {
    bundleId,
    resolvedCount: resolved.length,
    duplicateCount,
  };
}

// ─── 5. rebuildAllBundleResolvedItems ─────────────────────────────────────────

/**
 * Rebuild bundle_resolved_items for ALL bundles.
 * Safe to run multiple times (idempotent).
 *
 * Does NOT change publish_status, lifecycle_status, prices, or visibility.
 */
async function _rebuildAllBundleResolvedItems(): Promise<{
  totalBundles: number;
  successfulRebuilds: number;
  failedRebuilds: number;
  totalResolvedItems: number;
  errors: Array<{ bundleId: string; error: string }>;
}> {
  const sb = createAdminClient();

  const { data: bundles, error } = await sb
    .from('course_bundles')
    .select('id');

  if (error) throw new Error(`Failed to list bundles: ${error.message}`);

  let successfulRebuilds = 0;
  let failedRebuilds = 0;
  let totalResolvedItems = 0;
  const errors: Array<{ bundleId: string; error: string }> = [];

  const rebuildSettled = await Promise.allSettled(
    (bundles ?? []).map(async (bundle) => {
      const bundleId = bundle.id as string;
      const result = await rebuildBundleResolvedItems(bundleId);
      return { bundleId, result };
    }),
  );

  for (const r of rebuildSettled) {
    if (r.status === 'fulfilled') {
      successfulRebuilds++;
      totalResolvedItems += r.value.result.resolvedCount;
    } else {
      failedRebuilds++;
      errors.push({
        bundleId: 'unknown',
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  }

  return {
    totalBundles: (bundles ?? []).length,
    successfulRebuilds,
    failedRebuilds,
    totalResolvedItems,
    errors,
  };
}

// ─── 6. getStudentEffectiveAccessibleItemIds ──────────────────────────────────

/**
 * Foundation utility: resolve all master_course_item_ids a student can access.
 *
 * Combines:
 *   - student_entitlements (traditional B2B/B2C — grants full master_course access)
 *   - student_content_entitlements (flexible — master_course, variant, bundle)
 *   - content_assignments (college-level — master_course, variant, bundle)
 *
 * NOTE: This is a foundation utility. Phase 3 will wire it into LMS runtime.
 * Do NOT import into LMS student-facing pages in Phase 1.
 */
async function getStudentEffectiveAccessibleItemIds(
  studentId: string,
): Promise<Set<string>> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  const accessibleItemIds = new Set<string>();
  const fullAccessCourseIds = new Set<string>();

  // --- student_entitlements (traditional) ---
  const { data: seData } = await sb
    .from('student_entitlements')
    .select('master_course_id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  for (const row of seData ?? []) {
    fullAccessCourseIds.add(row.master_course_id as string);
  }

  // --- student_content_entitlements ---
  const { data: sceData } = await sb
    .from('student_content_entitlements')
    .select('assigned_entity_type, assigned_entity_id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  const sceResults = await Promise.all(
    (sceData ?? []).map(async (row) => {
      const entityType = row.assigned_entity_type as string;
      const entityId = row.assigned_entity_id as string;

      if (entityType === 'master_course') {
        return { fullAccess: [entityId], items: [] };
      } else if (entityType === 'variant') {
        const items = await resolveVariantItems(entityId);
        return { fullAccess: [], items: items.map((item) => item.masterCourseItemId) };
      } else if (entityType === 'bundle') {
        const items = await resolveBundleDraftItems(entityId);
        return { fullAccess: [], items: items.map((item) => item.masterCourseItemId) };
      }
      return { fullAccess: [], items: [] };
    }),
  );

  for (const r of sceResults) {
    for (const id of r.fullAccess) fullAccessCourseIds.add(id);
    for (const id of r.items) accessibleItemIds.add(id);
  }

  // --- content_assignments (college-level) ---
  // Find student's college
  const { data: student } = await sb
    .from('students')
    .select('college_id')
    .eq('id', studentId)
    .single();

  if (student?.college_id) {
    const { data: assignments } = await sb
      .from('content_assignments')
      .select('assigned_entity_type, assigned_entity_id, status, start_date, end_date')
      .eq('assignment_type', 'college')
      .eq('target_id', student.college_id as string)
      .eq('status', 'active');

    const assignmentResults = await Promise.all(
      (assignments ?? []).filter(isAssignmentActive).map(async (assignment) => {
        const entityType = assignment.assigned_entity_type as string;
        const entityId = assignment.assigned_entity_id as string;

        if (entityType === 'master_course') {
          return { fullAccess: [entityId], items: [] };
        } else if (entityType === 'variant') {
          const items = await resolveVariantItems(entityId);
          return { fullAccess: [], items: items.map((item) => item.masterCourseItemId) };
        } else if (entityType === 'bundle') {
          const items = await resolveBundleDraftItems(entityId);
          return { fullAccess: [], items: items.map((item) => item.masterCourseItemId) };
        }
        return { fullAccess: [], items: [] };
      }),
    );

    for (const r of assignmentResults) {
      for (const id of r.fullAccess) fullAccessCourseIds.add(id);
      for (const id of r.items) accessibleItemIds.add(id);
    }
  }

  // Expand fullAccessCourseIds into item IDs
  if (fullAccessCourseIds.size > 0) {
    const { data: courseItems } = await sb
      .from('master_course_items')
      .select('id')
      .in('master_course_id', Array.from(fullAccessCourseIds))
      .eq('publish_status', 'published');

    for (const item of courseItems ?? []) {
      accessibleItemIds.add(item.id as string);
    }
  }

  return accessibleItemIds;
}

// ─── 7. canStudentAccessMasterCourseItem ──────────────────────────────────────

/**
 * Check if a student can access a specific master_course_item.
 * Foundation utility — do NOT wire into LMS runtime in Phase 1.
 */
async function _canStudentAccessMasterCourseItem(
  studentId: string,
  masterCourseItemId: string,
): Promise<boolean> {
  const itemIds = await getStudentEffectiveAccessibleItemIds(studentId);
  return itemIds.has(masterCourseItemId);
}

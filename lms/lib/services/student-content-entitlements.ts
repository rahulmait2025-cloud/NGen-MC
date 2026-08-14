import 'server-only';

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { normUuid } from '@/lib/utils';
import { describeSupabaseError, isSupabaseNetworkError } from '@/lib/supabase/network-error';
import { isAssignmentActive } from '@/lib/services/access-helpers';

export type ContentEntityType = 'master_course' | 'variant' | 'bundle';

export interface StudentContentEntitlementsRow {
  id: string;
  student_id: string;
  assigned_entity_type: ContentEntityType;
  assigned_entity_id: string;
  source_type: string;
  status: string;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Student Content Entitlements Service (LMS).
 *
 * Read-only queries against student_content_entitlements for access resolution.
 * Table exists in the same Supabase project (managed by SuperAdmin migrations).
 *
 * Bundle resolution uses bundle_resolved_items when available (fast path),
 * with fallback to inline bundle_items resolution for old bundles that
 * haven't been backfilled yet.
 */

// ─── Bundle Resolution Helper ────────────────────────────────────────────────

/**
 * Resolve the master_course_item_ids accessible from a bundle.
 *
 * Strategy:
 * 1. Prefer bundle_resolved_items (pre-computed, fast path)
 * 2. Fallback to inline bundle_items resolution (old bundles)
 * 3. Support bundle_item_selected_items overrides
 * 4. Support item_type='bundle' (nested bundles) with cycle protection
 * 5. De-duplicate by master_course_item_id
 * 6. Filter by targetMasterCourseId when provided
 */
async function resolveBundleItemIds(
  bundleId: string,
  targetMasterCourseId?: string,
  visitedBundleIds?: Set<string>,
): Promise<Set<string>> {
  const sb = createAdminClient();
  const visited = visitedBundleIds ?? new Set<string>();

  if (visited.has(bundleId)) return new Set();
  visited.add(bundleId);

  // 1. Try bundle_resolved_items first (fast path for Phase 2+ bundles)
  let resolvedQuery = sb
    .from('bundle_resolved_items')
    .select('master_course_item_id, parent_master_course_id')
    .eq('bundle_id', bundleId);

  if (targetMasterCourseId) {
    resolvedQuery = resolvedQuery.eq('parent_master_course_id', targetMasterCourseId);
  }

  const { data: resolvedRows } = await resolvedQuery;

  if (resolvedRows && resolvedRows.length > 0) {
    const ids = new Set<string>();
    for (const row of resolvedRows) {
      ids.add(row.master_course_item_id as string);
    }
    return ids;
  }

  // 2. Fallback: inline resolution from bundle_items
  const { data: bundleItems } = await sb
    .from('bundle_items')
    .select('id, item_type, reference_id')
    .eq('bundle_id', bundleId);

  if (!bundleItems || bundleItems.length === 0) return new Set();

  // Load selected item overrides
  const bundleItemIds = bundleItems.map((bi) => bi.id);
  const { data: overrideRows } = await sb
    .from('bundle_item_selected_items')
    .select('bundle_item_id, master_course_item_id')
    .in('bundle_item_id', bundleItemIds)
    .order('sort_order', { ascending: true });

  const overrideMap = new Map<string, string[]>();
  for (const row of overrideRows ?? []) {
    const bid = row.bundle_item_id as string;
    if (!overrideMap.has(bid)) overrideMap.set(bid, []);
    overrideMap.get(bid)!.push(row.master_course_item_id as string);
  }

  // Batch-resolve master_course refs
  const masterCourseIds = bundleItems.reduce((acc, bi) => {
    if (bi.item_type === 'master_course') acc.push(bi.reference_id as string);
    return acc;
  }, [] as string[]);

  const masterCourseItemsMap = new Map<string, string[]>();
  if (masterCourseIds.length > 0) {
    let mcQuery = sb
      .from('master_course_items')
      .select('id, master_course_id')
      .in('master_course_id', masterCourseIds)
      .eq('publish_status', 'published');

    if (targetMasterCourseId) {
      mcQuery = mcQuery.eq('master_course_id', targetMasterCourseId);
    }

    const { data: mcItems } = await mcQuery;
    for (const item of mcItems ?? []) {
      const mcId = item.master_course_id as string;
      if (!masterCourseItemsMap.has(mcId)) masterCourseItemsMap.set(mcId, []);
      masterCourseItemsMap.get(mcId)!.push(item.id as string);
    }
  }

  // Batch-resolve variant refs
  const variantIds = bundleItems.reduce((acc, bi) => {
    if (bi.item_type === 'variant') acc.push(bi.reference_id as string);
    return acc;
  }, [] as string[]);

  const variantItemsMap = new Map<string, string[]>();
  if (variantIds.length > 0) {
    let viQuery = sb
      .from('course_variant_items')
      .select('course_variant_id, master_course_item_id, master_course_items!inner(master_course_id, publish_status)')
      .in('course_variant_id', variantIds)
      .eq('master_course_items.publish_status', 'published');

    if (targetMasterCourseId) {
      viQuery = viQuery.eq('master_course_items.master_course_id', targetMasterCourseId);
    }

    const { data: viRows } = await viQuery;
    for (const row of viRows ?? []) {
      const vid = row.course_variant_id as string;
      if (!variantItemsMap.has(vid)) variantItemsMap.set(vid, []);
      variantItemsMap.get(vid)!.push(row.master_course_item_id as string);
    }
  }

  // Resolve each bundle_item
  const allItemIds = new Set<string>();

  const resolvedPerItem = await Promise.all(
    bundleItems.map(async (bi) => {
      const biId = bi.id as string;
      const itemType = bi.item_type as string;
      const refId = bi.reference_id as string;
      const overrides = overrideMap.get(biId);

      let sourceItems: string[] = [];

      if (itemType === 'master_course') {
        sourceItems = masterCourseItemsMap.get(refId) ?? [];
      } else if (itemType === 'variant') {
        sourceItems = variantItemsMap.get(refId) ?? [];
      } else if (itemType === 'master_course_item') {
        if (targetMasterCourseId) {
          const { data: item } = await sb
            .from('master_course_items')
            .select('id')
            .eq('id', refId)
            .eq('master_course_id', targetMasterCourseId)
            .eq('publish_status', 'published')
            .maybeSingle();
          if (item) sourceItems = [refId];
        } else {
          sourceItems = [refId];
        }
      } else if (itemType === 'bundle') {
        const nestedIds = await resolveBundleItemIds(refId, targetMasterCourseId, new Set(visited));
        sourceItems = Array.from(nestedIds);
      }

      if (overrides && overrides.length > 0) {
        const overrideSet = new Set(overrides);
        return sourceItems.filter((id) => overrideSet.has(id));
      }
      return sourceItems;
    }),
  );

  for (const items of resolvedPerItem) {
    for (const id of items) allItemIds.add(id);
  }

  return allItemIds;
}

// ─── Entitlement Queries ─────────────────────────────────────────────────────

import { cacheTag, cacheLife } from 'next/cache';

async function listStudentContentEntitlementsCached(
  studentId: string
): Promise<StudentContentEntitlementsRow[]> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag(`student-content-entitlements-${studentId}`);

  const sb = createAdminClient();
  const nowMs = Math.floor(Date.now() / 30000) * 30000;
  const nowIso = new Date(nowMs).toISOString();

  const { data, error } = await sb
    .from('student_content_entitlements')
    .select('id, student_id, assigned_entity_type, assigned_entity_id, source_type, status, valid_from, valid_until, metadata, created_at, updated_at')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  if (error) {
    if (isSupabaseNetworkError(error)) {
      console.error('[student-content-entitlements] listStudentContentEntitlements network failure', {
        studentId,
        message: describeSupabaseError(error),
      });
      return [];
    }

    throw new Error(`Failed to list student content entitlements: ${describeSupabaseError(error)}`);
  }
  return (data ?? []) as StudentContentEntitlementsRow[];
}

/**
 * Get all active content entitlements for a student.
 */
export const listStudentContentEntitlements = cache(async (
  studentId: string,
): Promise<StudentContentEntitlementsRow[]> => {
  return listStudentContentEntitlementsCached(studentId);
});

/**
 * Check if a student has content-level access (master_course, variant, or bundle)
 * to a specific master_course_item.
 *
 * Returns the content entitlement row if access is granted, null otherwise.
 */
export async function checkContentEntitlementForItem(
  studentId: string,
  itemId: string,
  masterCourseId: string,
): Promise<StudentContentEntitlementsRow | null> {
  const entitlements = await listStudentContentEntitlements(studentId);
  if (entitlements.length === 0) return null;

  const sb = createAdminClient();

  // 1. Check master_course entitlements (full course access)
  for (const entitlement of entitlements) {
    const e = entitlement as StudentContentEntitlementsRow;
    if (e.assigned_entity_type === 'master_course') {
      if (normUuid(e.assigned_entity_id) === normUuid(masterCourseId)) {
        return e;
      }
    }
  }

  // 2. Batch-resolve variant entitlements
  const variantEntitlements = entitlements.filter(
    (e) => e.assigned_entity_type === 'variant',
  );
  if (variantEntitlements.length > 0) {
    const variantIds = variantEntitlements.map((e) => e.assigned_entity_id);
    const { data: allVariantItems } = await sb
      .from('course_variant_items')
      .select('course_variant_id, master_course_item_id')
      .in('course_variant_id', variantIds);

    const variantItemMap = new Map<string, Set<string>>();
    for (const row of allVariantItems ?? []) {
      const vid = row.course_variant_id as string;
      if (!variantItemMap.has(vid)) variantItemMap.set(vid, new Set());
      variantItemMap.get(vid)!.add(row.master_course_item_id as string);
    }

    for (const e of variantEntitlements) {
      const ids = variantItemMap.get(e.assigned_entity_id);
      if (ids?.has(itemId)) return e;
    }
  }

  // 3. Resolve bundle entitlements using resolveBundleItemIds helper
  const bundleEntitlements = entitlements.filter(
    (e) => e.assigned_entity_type === 'bundle',
  );
  if (bundleEntitlements.length > 0) {
    const bundleResults = await Promise.all(
      bundleEntitlements.map(async (e) => {
        const bundleItemIds = await resolveBundleItemIds(e.assigned_entity_id, masterCourseId);
        return { entitlement: e, hasItem: bundleItemIds.has(itemId) };
      }),
    );
    for (const r of bundleResults) {
      if (r.hasItem) return r.entitlement;
    }
  }

  return null;
}

export interface ContentEntitledItemResolution {
  allow_all: boolean;
  item_ids: Set<string>;
}

/**
 * Resolve the master_course_item ids a student is allowed to access for a course
 * based on content entitlements (master_course, variant, bundle).
 */
export async function resolveContentEntitledItemIdsForCourse(
  studentId: string,
  masterCourseId: string,
): Promise<ContentEntitledItemResolution> {
  const sb = createAdminClient();
  const entitlements = await listStudentContentEntitlements(studentId);
  if (entitlements.length === 0) {
    return { allow_all: false, item_ids: new Set() };
  }

  const itemIds = new Set<string>();
  const wantCourse = normUuid(masterCourseId);

  // 1. Check master_course entitlements (full course access)
  const allowAll = entitlements.some(
    (e) =>
      e.assigned_entity_type === 'master_course' &&
      normUuid(e.assigned_entity_id) === wantCourse,
  );

  if (allowAll) {
    return { allow_all: true, item_ids: new Set() };
  }

  // 2. Resolve variant entitlements
  const variantEntitlements = entitlements.filter((e) => e.assigned_entity_type === 'variant');
  if (variantEntitlements.length > 0) {
    const variantIds = variantEntitlements.map((e) => e.assigned_entity_id);
    const { data: variants } = await sb
      .from('course_variants')
      .select('id, master_course_id')
      .in('id', variantIds);

    const relevantVariantIds = (variants ?? []).reduce((acc, variant) => {
      if (normUuid(variant.master_course_id as string) === wantCourse) acc.push(variant.id as string);
      return acc;
    }, [] as string[]);

    if (relevantVariantIds.length > 0) {
      const { data: allVariantItems } = await sb
        .from('course_variant_items')
        .select('course_variant_id, master_course_item_id')
        .in('course_variant_id', relevantVariantIds);
      for (const row of allVariantItems ?? []) {
        itemIds.add(row.master_course_item_id as string);
      }
    }
  }

  // 3. Resolve bundle entitlements using resolveBundleItemIds helper
  const bundleEntitlements = entitlements.filter((e) => e.assigned_entity_type === 'bundle');
  if (bundleEntitlements.length > 0) {
    const bundleResults = await Promise.all(
      bundleEntitlements.map((e) =>
        resolveBundleItemIds(e.assigned_entity_id, masterCourseId),
      ),
    );
    for (const ids of bundleResults) {
      for (const id of ids) itemIds.add(id);
    }
  }

  return { allow_all: false, item_ids: itemIds };
}

/**
 * Resolve the master_course_item ids a college is allowed to access for a course
 * based on college content assignments (master_course, variant, bundle).
 */
async function _resolveCollegeContentResolutionForCourse(
  collegeId: string,
  masterCourseId: string,
): Promise<ContentEntitledItemResolution> {
  const sb = createAdminClient();
  const { data: assignments, error } = await sb
    .from('content_assignments')
    .select('assigned_entity_id, assigned_entity_type, status, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('status', 'active');

  if (error || !assignments || assignments.length === 0) {
    return { allow_all: false, item_ids: new Set() };
  }

  const activeAssignments = assignments.filter(isAssignmentActive);
  if (activeAssignments.length === 0) {
    return { allow_all: false, item_ids: new Set() };
  }

  const itemIds = new Set<string>();
  const wantCourse = normUuid(masterCourseId);

  // 1. Check master_course assignments (full course access)
  const allowAll = activeAssignments.some(
    (a) =>
      a.assigned_entity_type === 'master_course' &&
      normUuid(a.assigned_entity_id as string) === wantCourse,
  );

  if (allowAll) {
    return { allow_all: true, item_ids: new Set() };
  }

  // 2. Resolve variant assignments
  const variantAssignments = activeAssignments.filter((a) => a.assigned_entity_type === 'variant');
  if (variantAssignments.length > 0) {
    const variantIds = variantAssignments.map((a) => a.assigned_entity_id as string);
    const { data: variants } = await sb
      .from('course_variants')
      .select('id, master_course_id')
      .in('id', variantIds);

    const relevantVariantIds = (variants ?? []).reduce((acc, variant) => {
      if (normUuid(variant.master_course_id as string) === wantCourse) acc.push(variant.id as string);
      return acc;
    }, [] as string[]);

    if (relevantVariantIds.length > 0) {
      const { data: allVariantItems } = await sb
        .from('course_variant_items')
        .select('course_variant_id, master_course_item_id')
        .in('course_variant_id', relevantVariantIds);
      for (const row of allVariantItems ?? []) {
        itemIds.add(row.master_course_item_id as string);
      }
    }
  }

  // 3. Resolve bundle assignments using resolveBundleItemIds helper
  const bundleAssignments = activeAssignments.filter((a) => a.assigned_entity_type === 'bundle');
  if (bundleAssignments.length > 0) {
    const bundleResults = await Promise.all(
      bundleAssignments.map((a) =>
        resolveBundleItemIds(a.assigned_entity_id as string, masterCourseId),
      ),
    );
    for (const ids of bundleResults) {
      for (const id of ids) itemIds.add(id);
    }
  }

  return { allow_all: allowAll, item_ids: itemIds };
}

/**
 * Check if the student has any entitlement (in student_entitlements OR
 * student_content_entitlements) that grants access to a master_course_id.
 *
 * Returns true if entitled via either table.
 */
export async function checkAnyEntitlementForCourse(
  studentId: string,
  masterCourseId: string,
): Promise<boolean> {
  const { getCachedStudentEntitlements, getCachedContentEntitlements } = await import('@/lib/services/entitlement-cache');

  const [seData, sceData] = await Promise.all([
    getCachedStudentEntitlements(studentId),
    getCachedContentEntitlements(studentId),
  ]);

  const hasSe = seData.some((e) => e.master_course_id === masterCourseId);
  if (hasSe) return true;

  const hasSce = sceData.some(
    (e) =>
      e.assigned_entity_type === 'master_course' &&
      normUuid(e.assigned_entity_id) === normUuid(masterCourseId),
  );

  return hasSce;
}

/**
 * Grant student_content_entitlements to a new student based on their college's
 * active variant/bundle assignments. This ensures new students get access
 * to assigned content immediately upon joining.
 *
 * Call this when a new student is created/joined to a college.
 */
export async function grantEntitlementsForNewStudentLms(
  studentId: string,
  collegeId: string,
): Promise<{ created: number; existed: number; createdIds: string[] }> {
  const sb = createAdminClient();
  let createdCount = 0;
  let existedCount = 0;
  const createdIds: string[] = [];

  const { data: assignments, error } = await sb
    .from('content_assignments')
    .select('id, assigned_entity_type, assigned_entity_id, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('status', 'active');

  if (error || !assignments || assignments.length === 0) {
    return { created: 0, existed: 0, createdIds: [] };
  }

  const activeAssignments = assignments.filter(isAssignmentActive);

  const toInsert = activeAssignments.filter((a) => a.assigned_entity_type !== 'master_course');

  const insertSettled = await Promise.allSettled(
    toInsert.map((assignment) =>
      sb
        .from('student_content_entitlements')
        .insert({
          student_id: studentId,
          assigned_entity_type: assignment.assigned_entity_type,
          assigned_entity_id: assignment.assigned_entity_id,
          source_type: 'college_assignment',
          status: 'active',
          valid_from: assignment.start_date ?? new Date().toISOString(),
          valid_until: assignment.end_date ?? null,
          metadata: {
            assignment_id: assignment.id,
            college_id: collegeId,
          },
        })
        .select('id')
        .single(),
    ),
  );

  for (const r of insertSettled) {
    if (r.status === 'fulfilled') {
      createdCount++;
      if (r.value.data?.id) {
        createdIds.push(r.value.data.id as string);
      }
    } else {
      const error = r.reason;
      if (
        error instanceof Error &&
        (error.message.includes('already exists') || (error as { code?: string }).code === '23505')
      ) {
        existedCount++;
      } else {
        console.error(`[Assignment] Failed to grant content entitlement for new student: ${error}`);
      }
    }
  }

  return { created: createdCount, existed: existedCount, createdIds };
}

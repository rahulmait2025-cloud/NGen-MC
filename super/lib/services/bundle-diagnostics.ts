import 'server-only';

/**
 * Bundle Diagnostics Service.
 *
 * Read-only health checks for bundle data integrity.
 * Does NOT mutate any data. For admin diagnostic use only.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface BundleHealthReport {
  bundleId: string;
  bundleTitle: string;
  publishStatus: string;
  componentCount: number;
  overrideCount: number;
  resolvedItemCount: number;
  nestedBundleDetected: boolean;
  invalidReferenceCount: number;
}

export interface DiagnosticsReport {
  publishedBundlesWithZeroResolved: Array<{ id: string; title: string }>;
  invalidBundleItemReferences: Array<{ bundleItemId: string; bundleId: string; itemType: string; referenceId: string }>;
  invalidSelectedItems: Array<{ selectedItemId: string; bundleItemId: string; masterCourseItemId: string }>;
  staleActiveEntitlements: Array<{ id: string; studentId: string; assignedEntityType: string; validUntil: string }>;
  entitlementsWithMissingAssignments: Array<{ id: string; studentId: string; assignmentId: string }>;
  bundleHealth: BundleHealthReport[];
  summary: {
    totalBundles: number;
    publishedBundles: number;
    bundlesWithZeroResolved: number;
    totalInvalidReferences: number;
    totalInvalidSelectedItems: number;
    totalStaleEntitlements: number;
    totalOrphanEntitlements: number;
  };
}

/**
 * Run all read-only bundle/entitlement health checks.
 * Does NOT repair or mutate any data.
 */
export async function runBundleDiagnostics(): Promise<DiagnosticsReport> {
  const sb = createAdminClient();

  // 1. Published bundles with 0 resolved items
  const { data: allBundles } = await sb
    .from('course_bundles')
    .select('id, title, publish_status');

  const bundles = allBundles ?? [];
  const publishedBundles = bundles.filter((b) => b.publish_status === 'published');

  const publishedWithZeroResolved: Array<{ id: string; title: string }> = [];
  const bundleHealth: BundleHealthReport[] = [];

  const bundleResults = await Promise.allSettled(
    bundles.map(async (bundle) => {
      const bundleId = bundle.id as string;

      const [{ count: resolvedCount }, { count: componentCount }, { count: overrideCount }] = await Promise.all([
        sb.from('bundle_resolved_items').select('*', { count: 'exact', head: true }).eq('bundle_id', bundleId),
        sb.from('bundle_items').select('*', { count: 'exact', head: true }).eq('bundle_id', bundleId),
        sb.from('bundle_item_selected_items').select('*', { count: 'exact', head: true }).in(
          'bundle_item_id',
          sb.from('bundle_items').select('id').eq('bundle_id', bundleId) as unknown as string[],
        ),
      ]);

      const { data: items } = await sb
        .from('bundle_items')
        .select('item_type')
        .eq('bundle_id', bundleId);
      const hasNestedBundle = (items ?? []).some((i) => i.item_type === 'bundle');

      const { data: bundleItems } = await sb
        .from('bundle_items')
        .select('id, item_type, reference_id')
        .eq('bundle_id', bundleId);

      const refResults = await Promise.all(
        (bundleItems ?? []).map(async (bi) => {
          const refId = bi.reference_id as string;
          const itemType = bi.item_type as string;

          if (itemType === 'master_course') {
            const { count } = await sb.from('master_courses').select('*', { count: 'exact', head: true }).eq('id', refId);
            return (count ?? 0) > 0;
          } else if (itemType === 'variant') {
            const { count } = await sb.from('course_variants').select('*', { count: 'exact', head: true }).eq('id', refId);
            return (count ?? 0) > 0;
          } else if (itemType === 'master_course_item') {
            const { count } = await sb.from('master_course_items').select('*', { count: 'exact', head: true }).eq('id', refId);
            return (count ?? 0) > 0;
          } else if (itemType === 'bundle') {
            const { count } = await sb.from('course_bundles').select('*', { count: 'exact', head: true }).eq('id', refId);
            return (count ?? 0) > 0;
          }
          return false;
        }),
      );

      const invalidCount = refResults.filter((exists) => !exists).length;

      const report: BundleHealthReport = {
        bundleId,
        bundleTitle: bundle.title as string,
        publishStatus: bundle.publish_status as string,
        componentCount: componentCount ?? 0,
        overrideCount: overrideCount ?? 0,
        resolvedItemCount: resolvedCount ?? 0,
        nestedBundleDetected: hasNestedBundle,
        invalidReferenceCount: invalidCount,
      };

      return {
        report,
        isPublishedZero:
          bundle.publish_status === 'published' && (resolvedCount ?? 0) === 0
            ? { id: bundleId, title: bundle.title as string }
            : null,
      };
    }),
  );

  for (const r of bundleResults) {
    if (r.status === 'fulfilled') {
      bundleHealth.push(r.value.report);
      if (r.value.isPublishedZero) {
        publishedWithZeroResolved.push(r.value.isPublishedZero);
      }
    }
  }

  // 2. Invalid bundle_item_selected_items (master_course_item_id missing)
  const { data: allSelectedItems } = await sb
    .from('bundle_item_selected_items')
    .select('id, bundle_item_id, master_course_item_id');

  const invalidSelectedItems: Array<{ selectedItemId: string; bundleItemId: string; masterCourseItemId: string }> = [];
  if (allSelectedItems && allSelectedItems.length > 0) {
    const itemIds = [...new Set(allSelectedItems.map((si) => si.master_course_item_id as string))];
    const { data: existingItems } = await sb
      .from('master_course_items')
      .select('id')
      .in('id', itemIds);
    const existingSet = new Set((existingItems ?? []).map((i) => i.id as string));

    for (const si of allSelectedItems) {
      if (!existingSet.has(si.master_course_item_id as string)) {
        invalidSelectedItems.push({
          selectedItemId: si.id as string,
          bundleItemId: si.bundle_item_id as string,
          masterCourseItemId: si.master_course_item_id as string,
        });
      }
    }
  }

  // 3. Active entitlements with valid_until < now()
  const nowIso = new Date().toISOString();
  const [{ data: staleEntitlements }, { data: entitlementsWithAssignment }] = await Promise.all([
    sb
      .from('student_content_entitlements')
      .select('id, student_id, assigned_entity_type, valid_until')
      .eq('status', 'active')
      .not('valid_until', 'is', null)
      .lt('valid_until', nowIso)
      .limit(100),
    sb
      .from('student_content_entitlements')
      .select('id, student_id, metadata')
      .eq('status', 'active')
      .not('metadata->>assignment_id', 'is', null)
      .limit(100),
  ]);

  const orphanEntitlements: Array<{ id: string; studentId: string; assignmentId: string }> = [];
  if (entitlementsWithAssignment && entitlementsWithAssignment.length > 0) {
    const assignmentIds = [...new Set(
      entitlementsWithAssignment.reduce<string[]>((acc, e) => {
        const id = (e.metadata as Record<string, unknown>)?.assignment_id as string;
        if (id) acc.push(id);
        return acc;
      }, []),
    )];

    if (assignmentIds.length > 0) {
      const { data: existingAssignments } = await sb
        .from('content_assignments')
        .select('id')
        .in('id', assignmentIds);
      const existingSet = new Set((existingAssignments ?? []).map((a) => a.id as string));

      for (const e of entitlementsWithAssignment) {
        const assignmentId = (e.metadata as Record<string, unknown>)?.assignment_id as string;
        if (assignmentId && !existingSet.has(assignmentId)) {
          orphanEntitlements.push({
            id: e.id as string,
            studentId: e.student_id as string,
            assignmentId,
          });
        }
      }
    }
  }

  return {
    publishedBundlesWithZeroResolved: publishedWithZeroResolved,
    invalidBundleItemReferences: [], // Checked per-bundle in health reports
    invalidSelectedItems,
    staleActiveEntitlements: (staleEntitlements ?? []).map((e) => ({
      id: e.id as string,
      studentId: e.student_id as string,
      assignedEntityType: e.assigned_entity_type as string,
      validUntil: e.valid_until as string,
    })),
    entitlementsWithMissingAssignments: orphanEntitlements,
    bundleHealth,
    summary: {
      totalBundles: bundles.length,
      publishedBundles: publishedBundles.length,
      bundlesWithZeroResolved: publishedWithZeroResolved.length,
      totalInvalidReferences: bundleHealth.reduce((sum, b) => sum + b.invalidReferenceCount, 0),
      totalInvalidSelectedItems: invalidSelectedItems.length,
      totalStaleEntitlements: (staleEntitlements ?? []).length,
      totalOrphanEntitlements: orphanEntitlements.length,
    },
  };
}

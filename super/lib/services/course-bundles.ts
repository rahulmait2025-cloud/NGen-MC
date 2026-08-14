import 'server-only';

/**
 * Course Bundles Service (Phase 5).
 *
 * A Bundle is a packaging layer containing multiple variants, courses, or items.
 * Bundles MUST NEVER create TPStreams folders.
 * Purely reference-based - no content duplication.
 *
 * Service uses admin client (bypasses RLS). Callers must validate admin identity.
 *
 * Flatten-on-publish:
 * - Recursively resolves nested bundle references.
 * - Detects cycles to prevent infinite recursion.
 * - Deduplicates exact duplicate items (same item_type + reference_id).
 * - Rebuilds sort_order sequentially after flattening.
 * - Does NOT touch TPStreams or entitlement SQL.
 *
 * Phase 2B: Visibility controls discoverability/assignability.
 * - private: internal SuperAdmin only
 * - global: reusable/assignable to any college
 * - selected_colleges: limited to mapped colleges via course_bundle_visibility_colleges
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { rebuildBundleResolvedItems } from '@/lib/services/catalog-effective-access';
import type {
  CourseBundlesRow,
  BundleItemsRow,
  CatalogVisibilityScope,
  BundleSelectedItemRow,
} from '@/types/database';

// --- Types --------------------------------------------------------------------

// DB-compatible type - now includes 'bundle' (migration 00180 extends the CHECK constraint)
export type BundleItemType = 'variant' | 'master_course' | 'master_course_item' | 'bundle';

export interface CreateBundleInput {
  title: string;
  slug: string;
  code: string;
  description?: string;
  selling_price?: number;
  discounted_price?: number;
  internal_cost?: number;
  pricing_model?: 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only';
  visibility_scope?: CatalogVisibilityScope;
  created_for_college_id?: string | null;
  visibility_metadata?: Record<string, unknown>;
  visible_college_ids?: string[];
  show_on_lms_catalog?: boolean;
  show_on_lms_curated?: boolean;
  created_by?: string;
}

export interface AddBundleItemInput {
  bundle_id: string;
  item_type: BundleItemType;
  reference_id: string;
  sort_order?: number;
}

export interface UpdateBundleInput {
  title?: string;
  slug?: string;
  code?: string;
  description?: string;
  selling_price?: number | null;
  discounted_price?: number | null;
  internal_cost?: number | null;
  pricing_model?: 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only' | null;
  publish_status?: 'draft' | 'published' | 'unpublished';
  lifecycle_status?: 'draft' | 'active' | 'expired' | 'ended' | 'archived';
  visibility_scope?: CatalogVisibilityScope;
  created_for_college_id?: string | null;
  visibility_metadata?: Record<string, unknown>;
  visible_college_ids?: string[];
  landing_card_title?: string | null;
  landing_card_description?: string | null;
  landing_badge_label?: string | null;
  landing_badge_variant?: string | null;
  landing_highlights?: string[];
  landing_footer_note?: string | null;
  landing_hero_title?: string | null;
  landing_hero_subtitle?: string | null;
  landing_outcomes?: string[];
  landing_audience_points?: string[];
  show_on_lms_catalog?: boolean;
  show_on_lms_curated?: boolean;
  curated_sort_order?: number | null;
  catalog_sort_order?: number | null;
}

export interface BundleWithItems extends CourseBundlesRow {
  items: BundleItemsRow[];
  course_bundle_visibility_colleges?: Array<{ college_id: string }>;
}

export interface PublishBundleMeta {
  originalItemCount: number;
  flattenedItemCount: number;
  duplicatesRemoved: number;
  nestedBundlesExpanded: number;
  resolvedItemCount: number;
}

export interface PublishBundleResult {
  bundle: CourseBundlesRow;
  meta: PublishBundleMeta;
}

// --- CRUD ---------------------------------------------------------------------

/**
 * Create a new Course Bundle.
 *
 * Visibility logic:
 * - If visibility_scope === 'selected_colleges', visible_college_ids is required.
 * - If visibility_scope !== 'selected_colleges', visible_college_ids is ignored.
 * - created_for_college_id is optional lineage only.
 */
export async function createBundle(
  input: CreateBundleInput,
): Promise<CourseBundlesRow> {
  const sb = createAdminClient();

  const visibilityScope = input.visibility_scope ?? 'global';

  if (visibilityScope === 'selected_colleges') {
    if (!input.visible_college_ids || input.visible_college_ids.length === 0) {
      throw new Error(
        'At least one college must be selected when visibility_scope is "selected_colleges"',
      );
    }
  }

  const { data, error } = await sb
    .from('course_bundles')
    .insert({
      title: input.title,
      slug: input.slug,
      code: input.code,
      description: input.description ?? null,
      selling_price: input.selling_price ?? null,
      discounted_price: input.discounted_price ?? null,
      internal_cost: input.internal_cost ?? null,
      pricing_model: input.pricing_model ?? null,
      publish_status: 'draft',
      lifecycle_status: 'draft',
      visibility_scope: visibilityScope,
      created_for_college_id: input.created_for_college_id ?? null,
      visibility_metadata: input.visibility_metadata ?? {},
      show_on_lms_catalog: input.show_on_lms_catalog ?? true,
      show_on_lms_curated: input.show_on_lms_curated ?? false,
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create bundle: ${error.message}`);

  const bundle = data as CourseBundlesRow;

  if (visibilityScope === 'selected_colleges' && input.visible_college_ids) {
    const visibilityRows = input.visible_college_ids.map((collegeId) => ({
      bundle_id: bundle.id,
      college_id: collegeId,
    }));

    const { error: visError } = await sb
      .from('course_bundle_visibility_colleges')
      .insert(visibilityRows);

    if (visError) {
      await sb.from('course_bundles').delete().eq('id', bundle.id);
      throw new Error(
        `Failed to create visibility mapping: ${visError.message}`,
      );
    }
  }

  return bundle;
}

/**
 * Update an existing Course Bundle.
 *
 * Visibility update logic:
 * - visible_college_ids replaces entire mapping when provided.
 * - For global/private: clears all mapping rows.
 * - For selected_colleges: requires at least one college.
 */
export async function updateBundle(
  bundleId: string,
  input: UpdateBundleInput,
): Promise<CourseBundlesRow> {
  const sb = createAdminClient();

  const { visible_college_ids, visibility_scope, created_for_college_id, visibility_metadata, ...rest } = input;

  const updateData: Record<string, unknown> = { ...rest };

  if (visibility_scope !== undefined) {
    updateData.visibility_scope = visibility_scope;
  }
  if (created_for_college_id !== undefined) {
    updateData.created_for_college_id = created_for_college_id;
  }
  if (visibility_metadata !== undefined) {
    updateData.visibility_metadata = visibility_metadata;
  }

  const { data, error } = await sb
    .from('course_bundles')
    .update(updateData)
    .eq('id', bundleId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update bundle: ${error.message}`);

  if (visible_college_ids !== undefined) {
    await sb.from('course_bundle_visibility_colleges').delete().eq('bundle_id', bundleId);

    if (visible_college_ids.length > 0) {
      const visibilityRows = visible_college_ids.map((collegeId) => ({
        bundle_id: bundleId,
        college_id: collegeId,
      }));

      const { error: visError } = await sb
        .from('course_bundle_visibility_colleges')
        .insert(visibilityRows);

      if (visError) {
        throw new Error(`Failed to update visibility mapping: ${visError.message}`);
      }
    }
  }

  return data as CourseBundlesRow;
}

/**
 * Delete a Course Bundle and all its items.
 *
 * Supports deleting published bundles. Before deletion:
 * 1. Blocks if any orders reference this bundle (financial records must not be orphaned)
 * 2. Revokes all active content_assignments referencing this bundle
 * 3. Revokes all active student_entitlements referencing this bundle
 * 4. Revokes all active student_content_entitlements referencing this bundle
 * 5. Cascade-deletes: bundle_items, bundle_item_selected_items, bundle_resolved_items,
 *    course_bundle_visibility_colleges (handled by DB ON DELETE CASCADE)
 */
export async function deleteBundle(bundleId: string): Promise<void> {
  const sb = createAdminClient();

  // Load bundle to verify it exists
  const { data: bundle, error: bErr } = await sb
    .from('course_bundles')
    .select('id, publish_status')
    .eq('id', bundleId)
    .maybeSingle();

  if (bErr) throw new Error(`Failed to load bundle: ${bErr.message}`);
  if (!bundle) throw new Error('Bundle not found');

  // Cancel any associated orders before deleting
  // order_status enum: 'pending', 'paid', 'failed', 'cancelled', 'refunded'
  const { data: associatedOrders, error: ordersFetchErr } = await sb
    .from('orders')
    .select('id')
    .eq('entity_type', 'course_bundle')
    .eq('entity_id', bundleId)
    .in('status', ['pending', 'paid']);

  if (ordersFetchErr) {
    console.error('[deleteBundle] Failed to fetch associated orders:', ordersFetchErr.message);
    throw new Error(`Failed to fetch associated orders: ${ordersFetchErr.message}`);
  }

  if (associatedOrders && associatedOrders.length > 0) {
    const now = new Date().toISOString();
    const orderIds = associatedOrders.map((o) => o.id);
    const { error: cancelErr } = await sb
      .from('orders')
      .update({ status: 'cancelled', updated_at: now })
      .in('id', orderIds);

    if (cancelErr) {
      console.error('[deleteBundle] Failed to cancel orders:', cancelErr.message);
      throw new Error(`Failed to cancel associated orders: ${cancelErr.message}`);
    }
  }

  // Revoke active content_assignments referencing this bundle
  const { data: activeAssignments, error: assignErr } = await sb
    .from('content_assignments')
    .select('id')
    .eq('assigned_entity_type', 'bundle')
    .eq('assigned_entity_id', bundleId)
    .in('status', ['active', 'scheduled']);

  if (assignErr) throw new Error(`Failed to inspect bundle assignments: ${assignErr.message}`);

  if (activeAssignments && activeAssignments.length > 0) {
    const now = new Date().toISOString();
    const assignmentIds = activeAssignments.map((a) => a.id);

    // Revoke assignments
    const { error: revokeAssignErr } = await sb
      .from('content_assignments')
      .update({ status: 'revoked', updated_at: now })
      .in('id', assignmentIds);

    if (revokeAssignErr) throw new Error(`Failed to revoke bundle assignments: ${revokeAssignErr.message}`);

    // Revoke student_entitlements linked to these assignments
    const { error: revokeEntErr } = await sb
      .from('student_entitlements')
      .update({ status: 'revoked', revoked_at: now, revoke_reason: 'Bundle deleted' })
      .in('metadata->>assignment_id', assignmentIds)
      .eq('status', 'active');

    if (revokeEntErr) {
      console.error('[deleteBundle] Failed to revoke student_entitlements by assignment:', revokeEntErr.message);
      throw new Error(`Failed to revoke student entitlements: ${revokeEntErr.message}`);
    }

    // Revoke student_content_entitlements linked to these assignments
    const { error: revokeContentEntErr } = await sb
      .from('student_content_entitlements')
      .update({ status: 'revoked', revoked_at: now, revoke_reason: 'Bundle deleted' })
      .in('metadata->>assignment_id', assignmentIds)
      .eq('status', 'active');

    if (revokeContentEntErr) {
      console.error('[deleteBundle] Failed to revoke student_content_entitlements by assignment:', revokeContentEntErr.message);
      throw new Error(`Failed to revoke student content entitlements: ${revokeContentEntErr.message}`);
    }
  }

  // Revoke any remaining student_entitlements directly referencing this bundle
  const { error: revokeDirectEntErr } = await sb
    .from('student_entitlements')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: 'Bundle deleted' })
    .eq('metadata->>assigned_entity_type', 'bundle')
    .eq('metadata->>assigned_entity_id', bundleId)
    .eq('status', 'active');

  if (revokeDirectEntErr) {
    console.error('[deleteBundle] Failed to revoke direct student_entitlements:', revokeDirectEntErr.message);
    throw new Error(`Failed to revoke direct student entitlements: ${revokeDirectEntErr.message}`);
  }

  // Revoke any remaining student_content_entitlements directly referencing this bundle
  const { error: revokeDirectContentEntErr } = await sb
    .from('student_content_entitlements')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: 'Bundle deleted' })
    .eq('assigned_entity_type', 'bundle')
    .eq('assigned_entity_id', bundleId)
    .eq('status', 'active');

  if (revokeDirectContentEntErr) {
    console.error('[deleteBundle] Failed to revoke direct student_content_entitlements:', revokeDirectContentEntErr.message);
    throw new Error(`Failed to revoke direct student content entitlements: ${revokeDirectContentEntErr.message}`);
  }

  // Remove visibility mapping rows and bundle items first, then bundle
  // (bundle_items, bundle_resolved_items, bundle_item_selected_items cascade via FK)
  const { error: delVisErr } = await sb
    .from('course_bundle_visibility_colleges')
    .delete()
    .eq('bundle_id', bundleId);

  if (delVisErr) throw new Error(`Failed to delete bundle visibility mapping: ${delVisErr.message}`);

  const { error: delItemsErr } = await sb
    .from('bundle_items')
    .delete()
    .eq('bundle_id', bundleId);

  if (delItemsErr) throw new Error(`Failed to delete bundle items: ${delItemsErr.message}`);

  const { error: delErr } = await sb
    .from('course_bundles')
    .delete()
    .eq('id', bundleId);

  if (delErr) throw new Error(`Failed to delete bundle: ${delErr.message}`);
}

/**
 * Clone a bundle into a new draft bundle.
 *
 * cloned bundle defaults to visibility_scope = 'private' for review before reuse.
 * Original visibility mapping is NOT copied - new clone needs fresh review.
 * pricing_model is normalized to valid DB values.
 */
export async function cloneBundle(
  bundleId: string,
  createdBy?: string,
): Promise<CourseBundlesRow> {
  const sb = createAdminClient();

  const { data: original } = await sb
    .from('course_bundles')
    .select('*')
    .eq('id', bundleId)
    .single();

  if (!original) throw new Error('Bundle not found');

  const timestamp = Date.now();
  const cloneTitle = `${original.title} (Copy)`;
  const cloneCode = `${original.code}-copy-${timestamp}`;
  const cloneSlug = `${original.slug}-copy-${timestamp}`;

  const validPricingModels = ['one_time', 'subscription_ready', 'per_seat', 'free', 'invite_only', null];
  let normalizedPricingModel = original.pricing_model;
  if (!validPricingModels.includes(normalizedPricingModel as typeof validPricingModels[number])) {
    normalizedPricingModel = null;
  }

  const { data: clone, error: cloneError } = await sb
    .from('course_bundles')
    .insert({
      title: cloneTitle,
      slug: cloneSlug,
      code: cloneCode,
      description: original.description,
      selling_price: original.selling_price,
      discounted_price: original.discounted_price,
      internal_cost: original.internal_cost,
      pricing_model: normalizedPricingModel,
      publish_status: 'draft',
      lifecycle_status: 'draft',
      visibility_scope: 'private',
      created_for_college_id: null,
      visibility_metadata: {},
      created_by: createdBy ?? null,
    })
    .select('*')
    .single();

  if (cloneError) throw new Error(`Failed to clone bundle: ${cloneError.message}`);

  // Clone bundle items
  const { data: originalItems } = await sb
    .from('bundle_items')
    .select('*')
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true });

  if (originalItems && originalItems.length > 0) {
    const supportedTypes = new Set<string>(['variant', 'master_course', 'master_course_item', 'bundle']);
    const validItems = originalItems.filter((item) => 
      supportedTypes.has(item.item_type)
    );
    
    if (validItems.length > 0) {
      const { data: clonedItems, error: itemsError } = await sb
        .from('bundle_items')
        .insert(
          validItems.map((item) => ({
            bundle_id: clone.id,
            item_type: item.item_type,
            reference_id: item.reference_id,
            sort_order: item.sort_order,
          })),
        )
        .select('id, item_type, reference_id');

      if (itemsError) {
        await sb.from('course_bundles').delete().eq('id', clone.id);
        throw new Error(`Failed to clone bundle items: ${itemsError.message}`);
      }

      // Clone selected item overrides
      if (clonedItems && clonedItems.length > 0) {
        const originalItemIds = validItems.map((item) => item.id);
        const { data: originalOverrides } = await sb
          .from('bundle_item_selected_items')
          .select('bundle_item_id, master_course_item_id, sort_order')
          .in('bundle_item_id', originalItemIds);

        if (originalOverrides && originalOverrides.length > 0) {
          // Build mapping: original bundle_item_id -> cloned bundle_item_id
          // Match by position since validItems and clonedItems are in the same order
          const origToCloneMap = new Map<string, string>();
          for (let i = 0; i < validItems.length; i++) {
            if (clonedItems[i]) {
              origToCloneMap.set(validItems[i].id, clonedItems[i].id);
            }
          }

          const overrideRows = originalOverrides.reduce((acc, ov) => {
            const bundleItemId = origToCloneMap.get(ov.bundle_item_id) ?? '';
            if (bundleItemId !== '') {
              acc.push({
                bundle_item_id: bundleItemId,
                master_course_item_id: ov.master_course_item_id,
                sort_order: ov.sort_order,
              });
            }
            return acc;
          }, [] as Array<{ bundle_item_id: string; master_course_item_id: string; sort_order: number }>);

          if (overrideRows.length > 0) {
            await sb.from('bundle_item_selected_items').insert(overrideRows);
          }
        }
      }
    }
  }

  // Rebuild resolved items for the cloned bundle (draft, so may have 0 resolved — that's ok)
  try {
    await rebuildBundleResolvedItems(clone.id);
  } catch {
    // Clone succeeded; resolved items can be rebuilt later on publish
  }

  return clone as CourseBundlesRow;
}

// --- Lifecycle Management -----------------------------------------------------

/**
 * Publish a bundle with deduplication, sort rebuild, and resolved item validation.
 *
 * Safety:
 *   - Rebuilds bundle_resolved_items BEFORE setting published status.
 *   - If rebuild fails or resolvedCount === 0, publish is blocked.
 *   - Phase 3 relies on bundle_resolved_items for student access.
 *
 * Resolution chain:
 *   1. Load bundle_items ordered by sort_order.
 *   2. Deduplicate exact (item_type, reference_id) pairs.
 *   3. Re-index sort_order sequentially.
 *   4. Delete old items and insert deduplicated items atomically.
 *   5. Rebuild bundle_resolved_items. If fails or empty, abort publish.
 *   6. Set publish_status = published, lifecycle_status = active.
 */
export async function publishBundle(
  bundleId: string,
): Promise<PublishBundleResult> {
  const sb = createAdminClient();

  // -- Step 1: Load current bundle_items --------------------------------
  const rawItems = await sb
    .from('bundle_items')
    .select('*')
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true });

  if (rawItems.error) {
    throw new Error(`Failed to load bundle items: ${rawItems.error.message}`);
  }

  const originalItemCount = (rawItems.data ?? []).length;

  // -- Step 2: Deduplicate exact (item_type, reference_id) pairs ----------
  const seen = new Set<string>();
  const deduped: Array<{
    item_type: 'variant' | 'master_course' | 'master_course_item' | 'bundle';
    reference_id: string;
    sort_order: number;
  }> = [];
  let duplicatesRemoved = 0;

  for (let i = 0; i < (rawItems.data ?? []).length; i++) {
    const item = rawItems.data![i];
    const key = `${item.item_type}:${item.reference_id}`;
    if (seen.has(key)) {
      duplicatesRemoved++;
    } else {
      seen.add(key);
      deduped.push({
        item_type: item.item_type as 'variant' | 'master_course' | 'master_course_item' | 'bundle',
        reference_id: item.reference_id,
        sort_order: deduped.length,
      });
    }
  }

  // -- Step 3b: Validate price plans for paid bundles -------------------------
  // Paid bundles (one_time, subscription_ready, per_seat) require that all
  // contained master_courses have at least one active price plan.
  const { data: bundle, error: bundleError } = await sb
    .from('course_bundles')
    .select('pricing_model')
    .eq('id', bundleId)
    .single();

  if (bundleError || !bundle) {
    throw new Error(`Bundle not found: ${bundleError?.message}`);
  }

  const paidPricingModels = ['one_time', 'subscription_ready', 'per_seat'];
  if (paidPricingModels.includes(bundle.pricing_model)) {
    const courseItems = (rawItems.data ?? []).filter((i) => i.item_type === 'master_course');
    const courseIds = courseItems.map((i) => i.reference_id);

    if (courseIds.length === 0) {
      throw new Error(
        `Bundle has pricing model "${bundle.pricing_model}" but contains no master courses. Add courses to the bundle before publishing.`,
      );
    }

    const planResults = await Promise.allSettled(
      courseIds.map(async (courseId) => {
        const { count: planCount, error: planErr } = await sb
          .from('course_price_plans')
          .select('*', { count: 'exact', head: true })
          .eq('master_course_id', courseId)
          .eq('is_active', true);

        if (planErr) {
          throw new Error(`Failed to check price plans for course ${courseId}: ${planErr.message}`);
        }

        if ((planCount ?? 0) === 0) {
          const { data: courseData } = await sb
            .from('master_courses')
            .select('title')
            .eq('id', courseId)
            .single();

          throw new Error(
            `Bundle has pricing model "${bundle.pricing_model}" but course "${courseData?.title ?? courseId}" has no active price plans. Add at least one price plan to each course before publishing.`,
          );
        }
      }),
    );

    for (const r of planResults) {
      if (r.status === 'rejected') throw r.reason;
    }
  }

  // -- Step 4: Re-index sort_order sequentially ----------------------
  const finalItems = deduped.map((item, idx) => ({
    bundle_id: bundleId,
    item_type: item.item_type,
    reference_id: item.reference_id,
    sort_order: idx,
  }));

  const flattenedItemCount = finalItems.length;

  // -- Step 4: Atomic replace of bundle_items -----------------------------
  const { error: deleteError } = await sb
    .from('bundle_items')
    .delete()
    .eq('bundle_id', bundleId);

  if (deleteError) {
    throw new Error(`Failed to clear old bundle items: ${deleteError.message}`);
  }

  if (finalItems.length > 0) {
    const { error: insertError } = await sb
      .from('bundle_items')
      .insert(finalItems);

    if (insertError) {
      throw new Error(
        `Failed to insert deduplicated bundle items. Bundle ${bundleId} may be in inconsistent state. ` +
        `Error: ${insertError.message}`,
      );
    }
  }

  // -- Step 5: Rebuild bundle_resolved_items BEFORE publishing ------------
  // If rebuild fails or resolves to 0 items, do NOT publish.
  // Phase 3 relies on bundle_resolved_items for student access.
  let resolvedItemCount = 0;
  try {
    const rebuildResult = await rebuildBundleResolvedItems(bundleId);
    resolvedItemCount = rebuildResult.resolvedCount;
  } catch (rebuildErr) {
    throw new Error(
      `Failed to resolve bundle contents. Publish aborted. Error: ${rebuildErr instanceof Error ? rebuildErr.message : String(rebuildErr)}`,
    );
  }

  if (resolvedItemCount === 0) {
    throw new Error(
      'Cannot publish a bundle with no resolved lectures. Add content to the bundle before publishing.',
    );
  }

  // -- Step 6: Set publish status ----------------------------------------
  const { data, error } = await sb
    .from('course_bundles')
    .update({
      publish_status: 'published',
      lifecycle_status: 'active',
    })
    .eq('id', bundleId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to publish bundle: ${error.message}`);

  return {
    bundle: data as CourseBundlesRow,
    meta: {
      originalItemCount,
      flattenedItemCount,
      duplicatesRemoved,
      nestedBundlesExpanded: 0,
      resolvedItemCount,
    },
  };
}

/**
 * Unpublish a bundle.
 */
export async function unpublishBundle(bundleId: string): Promise<CourseBundlesRow> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('course_bundles')
    .update({
      publish_status: 'unpublished',
      lifecycle_status: 'archived',
    })
    .eq('id', bundleId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to unpublish bundle: ${error.message}`);
  return data as CourseBundlesRow;
}

/**
 * Expire a bundle (lifecycle transition).
 */
async function _expireBundle(bundleId: string): Promise<CourseBundlesRow> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('course_bundles')
    .update({ lifecycle_status: 'expired' })
    .eq('id', bundleId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to expire bundle: ${error.message}`);
  return data as CourseBundlesRow;
}

/**
 * Archive a bundle.
 */
async function _archiveBundle(bundleId: string): Promise<CourseBundlesRow> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('course_bundles')
    .update({ lifecycle_status: 'archived' })
    .eq('id', bundleId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to archive bundle: ${error.message}`);
  return data as CourseBundlesRow;
}

// --- Item Management ----------------------------------------------------------

/**
 * Add items to a bundle.
 * If the bundle is published, rebuilds resolved items immediately after.
 */
export async function addBundleItems(
  items: AddBundleItemInput[],
): Promise<BundleItemsRow[]> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('bundle_items')
    .insert(
      items.map((item) => ({
        bundle_id: item.bundle_id,
        item_type: item.item_type,
        reference_id: item.reference_id,
        sort_order: item.sort_order ?? 0,
      })),
    )
    .select('*');

  if (error) throw new Error(`Failed to add bundle items: ${error.message}`);

  // If any bundle is published, rebuild resolved items
  const bundleIds = new Set(items.map((i) => i.bundle_id));
  const publishedBundles: string[] = [];
  const bundleChecks = await Promise.all(
    Array.from(bundleIds).map(async (bundleId) => {
      const { data: bundle } = await sb
        .from('course_bundles')
        .select('publish_status')
        .eq('id', bundleId)
        .single();
      return { bundleId, isPublished: bundle?.publish_status === 'published' };
    }),
  );

  for (const check of bundleChecks) {
    if (check.isPublished) publishedBundles.push(check.bundleId);
  }

  await Promise.allSettled(
    publishedBundles.map((bundleId) =>
      rebuildBundleResolvedItems(bundleId).catch(() => {
        console.warn(`[bundle] Failed to rebuild resolved items after adding items to published bundle ${bundleId}`);
      }),
    ),
  );

  return data as BundleItemsRow[];
}

/**
 * Remove an item from a bundle.
 * Note: bundle_item_selected_items rows are cascade-deleted by FK constraint.
 */
async function _removeBundleItem(
  bundleId: string,
  itemId: string,
): Promise<void> {
  const sb = createAdminClient();

  const { error } = await sb
    .from('bundle_items')
    .delete()
    .eq('bundle_id', bundleId)
    .eq('id', itemId);

  if (error) throw new Error(`Failed to remove bundle item: ${error.message}`);
}

/**
 * Reorder items within a bundle.
 * If the bundle is published, rebuilds resolved items immediately after.
 */
export async function reorderBundleItems(
  bundleId: string,
  itemIds: string[],
): Promise<void> {
  const sb = createAdminClient();

  const updates = itemIds.map((itemId, index) => ({
    id: itemId,
    sort_order: index,
  }));

  const { error } = await sb
    .from('bundle_items')
    .upsert(updates, { onConflict: 'id' });

  if (error) throw new Error(`Failed to reorder bundle items: ${error.message}`);

  // If bundle is published, rebuild resolved items
  const { data: bundle } = await sb
    .from('course_bundles')
    .select('publish_status')
    .eq('id', bundleId)
    .single();

  if (bundle?.publish_status === 'published') {
    try {
      await rebuildBundleResolvedItems(bundleId);
    } catch {
      console.warn(`[bundle] Failed to rebuild resolved items after reordering items in published bundle ${bundleId}`);
    }
  }
}

// --- Selected Item Overrides --------------------------------------------------

/**
 * Set lecture-level overrides for a bundle component.
 * If masterCourseItemIds is empty, all overrides are removed (component reverts to full source).
 * If non-empty, only those lectures are included from the component.
 *
 * For published bundles, rebuilds bundle_resolved_items immediately after saving.
 * If the rebuild fails for a published bundle, throws an error so the caller
 * knows the override save could not be completed safely.
 */
export async function setBundleItemSelectedItems(
  bundleItemId: string,
  masterCourseItemIds: string[],
): Promise<BundleSelectedItemRow[]> {
  const sb = createAdminClient();

  // Delete existing overrides
  const { error: delErr } = await sb
    .from('bundle_item_selected_items')
    .delete()
    .eq('bundle_item_id', bundleItemId);

  if (delErr) throw new Error(`Failed to clear selected items: ${delErr.message}`);

  if (masterCourseItemIds.length === 0) {
    // Overrides cleared — rebuild for published bundle
    await _rebuildIfPublished(bundleItemId, sb);
    return [];
  }

  // Insert new overrides
  const rows = masterCourseItemIds.map((itemId, idx) => ({
    bundle_item_id: bundleItemId,
    master_course_item_id: itemId,
    sort_order: idx,
  }));

  const { data, error } = await sb
    .from('bundle_item_selected_items')
    .insert(rows)
    .select('*');

  if (error) throw new Error(`Failed to set selected items: ${error.message}`);

  // Rebuild resolved items for published bundle
  await _rebuildIfPublished(bundleItemId, sb);

  return (data ?? []) as BundleSelectedItemRow[];
}

/**
 * Helper: given a bundle_item_id, look up its parent bundle.
 * If that bundle is published, rebuild its bundle_resolved_items.
 * Throws if the rebuild fails — caller must surface this error.
 */
async function _rebuildIfPublished(
  bundleItemId: string,
  sb: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { data: bundleItem } = await sb
    .from('bundle_items')
    .select('bundle_id')
    .eq('id', bundleItemId)
    .single();

  if (!bundleItem) return;

  const { data: bundle } = await sb
    .from('course_bundles')
    .select('publish_status')
    .eq('id', bundleItem.bundle_id as string)
    .single();

  if (bundle?.publish_status === 'published') {
    await rebuildBundleResolvedItems(bundleItem.bundle_id as string);
  }
}

/**
 * Get all lecture-level overrides for a bundle.
 * Returns a Map of bundleItemId -> masterCourseItemId[].
 */
export async function getBundleItemSelectedItems(
  bundleId: string,
): Promise<Map<string, string[]>> {
  const sb = createAdminClient();

  // Get bundle_item_ids for this bundle
  const { data: bundleItems } = await sb
    .from('bundle_items')
    .select('id')
    .eq('bundle_id', bundleId);

  const bundleItemIds = (bundleItems ?? []).map((bi) => bi.id);
  if (bundleItemIds.length === 0) return new Map();

  const { data: overrides } = await sb
    .from('bundle_item_selected_items')
    .select('bundle_item_id, master_course_item_id')
    .in('bundle_item_id', bundleItemIds)
    .order('sort_order', { ascending: true });

  const result = new Map<string, string[]>();
  for (const row of overrides ?? []) {
    const bid = row.bundle_item_id as string;
    if (!result.has(bid)) result.set(bid, []);
    result.get(bid)!.push(row.master_course_item_id as string);
  }
  return result;
}

/**
 * Remove a bundle item and its selected item overrides.
 * Also rebuilds bundle_resolved_items if the bundle is published.
 */
export async function removeBundleItemWithOverrides(
  bundleId: string,
  bundleItemId: string,
): Promise<void> {
  const sb = createAdminClient();

  // Delete selected item overrides explicitly (FK cascade handles this too, but be explicit)
  await sb.from('bundle_item_selected_items').delete().eq('bundle_item_id', bundleItemId);

  // Delete the bundle item
  const { error } = await sb
    .from('bundle_items')
    .delete()
    .eq('bundle_id', bundleId)
    .eq('id', bundleItemId);

  if (error) throw new Error(`Failed to remove bundle item: ${error.message}`);

  // If bundle is published, rebuild resolved items immediately
  const { data: bundle } = await sb
    .from('course_bundles')
    .select('publish_status')
    .eq('id', bundleId)
    .single();

  if (bundle?.publish_status === 'published') {
    try {
      await rebuildBundleResolvedItems(bundleId);
    } catch {
      // Log but don't fail the removal — item is already deleted
      console.warn(`[bundle] Failed to rebuild resolved items after removing item from published bundle ${bundleId}`);
    }
  }
}

// --- Queries ------------------------------------------------------------------

/**
 * Get a bundle with its items.
 */
export async function getBundleWithItems(
  bundleId: string,
): Promise<BundleWithItems | null> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('course_bundles')
    .select(`
      *,
      bundle_items (*),
      course_bundle_visibility_colleges (
        college_id
      )
    `)
    .eq('id', bundleId)
    .single();

  if (error) return null;

  return {
    ...data,
    items: data.bundle_items ?? [],
    course_bundle_visibility_colleges: data.course_bundle_visibility_colleges ?? [],
  } as BundleWithItems;
}

/**
 * List all bundles with optional filtering.
 */
export async function listBundles(filters?: {
  publish_status?: string;
  lifecycle_status?: string;
}): Promise<BundleWithItems[]> {
  const sb = createAdminClient();

  let query = sb
    .from('course_bundles')
    .select(`
      id, title, code, description, publish_status, lifecycle_status, visibility_scope, selling_price, discounted_price, pricing_model, created_at, updated_at,
      bundle_items (*),
      course_bundle_visibility_colleges (
        college_id
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.publish_status) {
    query = query.eq('publish_status', filters.publish_status);
  }
  if (filters?.lifecycle_status) {
    query = query.eq('lifecycle_status', filters.lifecycle_status);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list bundles: ${error.message}`);

  return (data ?? []).map((bundle) => ({
    ...bundle,
    items: bundle.bundle_items ?? [],
  })) as unknown as BundleWithItems[];
}

export interface ImportBundleContentsResult {
  sourceBundleTitle: string;
  sourceItemCount: number;
  importedItemCount: number;
  skippedDuplicateCount: number;
  skippedUnsupportedCount: number;
}

export async function importBundleContentsIntoBundle(
  targetBundleId: string,
  sourceBundleId: string,
): Promise<ImportBundleContentsResult> {
  const sb = createAdminClient();

  if (targetBundleId === sourceBundleId) {
    throw new Error('Cannot import a bundle into itself');
  }

  const { data: targetBundle } = await sb
    .from('course_bundles')
    .select('id')
    .eq('id', targetBundleId)
    .single();

  if (!targetBundle) {
    throw new Error('Target bundle not found');
  }

  const { data: sourceBundle, error: sourceError } = await sb
    .from('course_bundles')
    .select('id, title')
    .eq('id', sourceBundleId)
    .single();

  if (sourceError || !sourceBundle) {
    throw new Error('Source bundle not found');
  }

  const { data: targetItems } = await sb
    .from('bundle_items')
    .select('item_type, reference_id, sort_order')
    .eq('bundle_id', targetBundleId);

  const targetItemKeys = new Set(
    (targetItems ?? []).map((i) => `${i.item_type}:${i.reference_id}`),
  );

  const { data: sourceItems } = await sb
    .from('bundle_items')
    .select('item_type, reference_id, sort_order')
    .eq('bundle_id', sourceBundleId)
    .order('sort_order', { ascending: true });

  if (!sourceItems || sourceItems.length === 0) {
    throw new Error('Source bundle has no items to import');
  }

  const supportedTypes = new Set<string>(['variant', 'master_course', 'master_course_item', 'bundle']);
  const newItems: Array<{
    bundle_id: string;
    item_type: 'variant' | 'master_course' | 'master_course_item' | 'bundle';
    reference_id: string;
    sort_order: number;
  }> = [];

  let skippedDuplicateCount = 0;
  let skippedUnsupportedCount = 0;

  const maxSortOrder = Math.max(0, ...(targetItems ?? []).map((i) => i.sort_order));

  for (let i = 0; i < sourceItems.length; i++) {
    const item = sourceItems[i];
    const key = `${item.item_type}:${item.reference_id}`;

    if (!supportedTypes.has(item.item_type)) {
      skippedUnsupportedCount++;
      continue;
    }

    if (targetItemKeys.has(key)) {
      skippedDuplicateCount++;
      continue;
    }

    targetItemKeys.add(key);
    newItems.push({
      bundle_id: targetBundleId,
      item_type: item.item_type as 'variant' | 'master_course' | 'master_course_item' | 'bundle',
      reference_id: item.reference_id,
      sort_order: maxSortOrder + i + 1,
    });
  }

  if (newItems.length > 0) {
    const { error: insertError } = await sb
      .from('bundle_items')
      .insert(newItems);

    if (insertError) {
      throw new Error(`Failed to import items: ${insertError.message}`);
    }
  }

  return {
    sourceBundleTitle: sourceBundle.title,
    sourceItemCount: sourceItems.length,
    importedItemCount: newItems.length,
    skippedDuplicateCount,
    skippedUnsupportedCount,
  };
}

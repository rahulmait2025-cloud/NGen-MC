'use server';

/**
 * Server actions for Course Bundles.
 * All actions are gated by requireAuth().
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  createBundle,
  updateBundle,
  deleteBundle,
  cloneBundle,
  publishBundle,
  unpublishBundle,
  addBundleItems,
  removeBundleItemWithOverrides,
  reorderBundleItems,
  setBundleItemSelectedItems,
  getBundleItemSelectedItems,
  importBundleContentsIntoBundle,
} from '@/lib/services/course-bundles';
import { rebuildBundleResolvedItems } from '@/lib/services/catalog-effective-access';
import { runBundleDiagnostics } from '@/lib/services/bundle-diagnostics';
import type { CourseBundlesRow, BundleItemsRow, BundleSelectedItemRow } from '@/types/database';
import type {
  PublishBundleResult,
  ImportBundleContentsResult,
} from '@/lib/services/course-bundles';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateBundleInput {
  title: string;
  slug: string;
  code: string;
  description?: string;
  selling_price?: number;
  discounted_price?: number;
  pricing_model?: string;
  visibility_scope?: 'private' | 'global' | 'selected_colleges';
  created_for_college_id?: string | null;
  visible_college_ids?: string[];
}

export interface UpdateBundleInput {
  title?: string;
  slug?: string;
  code?: string;
  description?: string;
  selling_price?: number | null;
  discounted_price?: number | null;
  pricing_model?: string | null;
  visibility_scope?: 'private' | 'global' | 'selected_colleges';
  created_for_college_id?: string | null;
  visible_college_ids?: string[];
  landing_card_title?: string;
  landing_card_description?: string;
  landing_badge_label?: string;
  landing_badge_variant?: string;
  landing_highlights?: string[];
  landing_footer_note?: string;
  landing_hero_title?: string;
  landing_hero_subtitle?: string;
  landing_outcomes?: string[];
  landing_audience_points?: string[];
  show_on_lms_catalog?: boolean;
  show_on_lms_curated?: boolean;
  curated_sort_order?: number | null;
  catalog_sort_order?: number | null;
}

export interface AddBundleItemsInput {
  bundle_id: string;
  items: Array<{
    item_type: 'variant' | 'master_course' | 'master_course_item' | 'bundle';
    reference_id: string;
    sort_order?: number;
  }>;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createBundleAction(
  input: CreateBundleInput,
): Promise<ActionResponse<CourseBundlesRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const bundle = await createBundle({
      title: input.title,
      slug: input.slug,
      code: input.code,
      description: input.description,
      selling_price: input.selling_price,
      discounted_price: input.discounted_price,
      pricing_model: input.pricing_model as 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only' | undefined,
      visibility_scope: input.visibility_scope,
      created_for_college_id: input.created_for_college_id,
      visible_college_ids: input.visible_college_ids,
    });

    return { success: true, data: bundle };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateBundleAction(
  bundleId: string,
  input: UpdateBundleInput,
): Promise<ActionResponse<CourseBundlesRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const bundle = await updateBundle(bundleId, {
      title: input.title,
      slug: input.slug,
      code: input.code,
      description: input.description,
      selling_price: input.selling_price,
      discounted_price: input.discounted_price,
      pricing_model: input.pricing_model as 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only' | null | undefined,
      visibility_scope: input.visibility_scope,
      created_for_college_id: input.created_for_college_id,
      visible_college_ids: input.visible_college_ids,
      landing_card_title: input.landing_card_title,
      landing_card_description: input.landing_card_description,
      landing_badge_label: input.landing_badge_label,
      landing_badge_variant: input.landing_badge_variant,
      landing_highlights: input.landing_highlights,
      landing_footer_note: input.landing_footer_note,
      landing_hero_title: input.landing_hero_title,
      landing_hero_subtitle: input.landing_hero_subtitle,
      landing_outcomes: input.landing_outcomes,
      landing_audience_points: input.landing_audience_points,
      show_on_lms_catalog: input.show_on_lms_catalog,
      show_on_lms_curated: input.show_on_lms_curated,
      curated_sort_order: input.curated_sort_order,
      catalog_sort_order: input.catalog_sort_order,
    });

    return { success: true, data: bundle };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteBundleAction(
  bundleId: string,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await deleteBundle(bundleId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function cloneBundleAction(
  bundleId: string,
): Promise<ActionResponse<CourseBundlesRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const bundle = await cloneBundle(bundleId);
    return { success: true, data: bundle };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function publishBundleAction(
  bundleId: string,
): Promise<ActionResponse<PublishBundleResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const result = await publishBundle(bundleId);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function unpublishBundleAction(
  bundleId: string,
): Promise<ActionResponse<CourseBundlesRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const bundle = await unpublishBundle(bundleId);
    return { success: true, data: bundle };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function addBundleItemsAction(
  input: AddBundleItemsInput,
): Promise<ActionResponse<BundleItemsRow[]>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const items = await addBundleItems(
      input.items.map((item, index) => ({
        bundle_id: input.bundle_id,
        item_type: item.item_type,
        reference_id: item.reference_id,
        sort_order: item.sort_order ?? index,
      })),
    );

    return { success: true, data: items };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

async function _removeBundleItemAction(
  bundleId: string,
  bundleItemId: string,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await removeBundleItemWithOverrides(bundleId, bundleItemId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

async function _reorderBundleItemsAction(
  bundleId: string,
  itemIds: string[],
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await reorderBundleItems(bundleId, itemIds);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function setBundleItemSelectedItemsAction(
  bundleItemId: string,
  masterCourseItemIds: string[],
): Promise<ActionResponse<BundleSelectedItemRow[]>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const result = await setBundleItemSelectedItems(bundleItemId, masterCourseItemIds);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getBundleSelectedItemsAction(
  bundleId: string,
): Promise<ActionResponse<Record<string, string[]>>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const map = await getBundleItemSelectedItems(bundleId);
    // Convert Map to plain object for serialization
    const result: Record<string, string[]> = {};
    for (const [key, value] of map) {
      result[key] = value;
    }
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function importBundleContentsAction(
  targetBundleId: string,
  sourceBundleId: string,
): Promise<ActionResponse<ImportBundleContentsResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const result = await importBundleContentsIntoBundle(targetBundleId, sourceBundleId);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function rebuildBundleResolvedItemsAction(
  bundleId: string,
): Promise<ActionResponse<{ resolvedCount: number; duplicateCount: number }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const result = await rebuildBundleResolvedItems(bundleId);
    return { success: true, data: { resolvedCount: result.resolvedCount, duplicateCount: result.duplicateCount } };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

async function _runBundleDiagnosticsAction(): Promise<ActionResponse<Awaited<ReturnType<typeof runBundleDiagnostics>>>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const report = await runBundleDiagnostics();
    return { success: true, data: report };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

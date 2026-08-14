'use server';

/**
 * Server actions for Course Variants.
 * All actions are gated by requireAuth().
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  createVariant,
  deleteVariant,
  publishVariant,
  unpublishVariant,
  addVariantItems,
  removeVariantItem,
  updateVariant,
  DuplicateVariantItemError,
} from '@/lib/services/course-variants';
import type { CourseVariantsRow, CourseVariantItemsRow } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateVariantInput {
  master_course_id: string;
  pillar_id: string;
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

export interface UpdateVariantInput {
  id: string;
  pillar_id?: string;
  title?: string;
  slug?: string;
  code?: string;
  description?: string;
  selling_price?: number;
  discounted_price?: number;
  pricing_model?: string;
  visibility_scope?: 'private' | 'global' | 'selected_colleges';
  created_for_college_id?: string | null;
  visible_college_ids?: string[];
}

export interface AddVariantItemsInput {
  course_variant_id: string;
  master_course_item_ids: string[];
  inclusion_type?: 'full_module' | 'selected_item';
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Create a new Course Variant.
 */
export async function createVariantAction(
  input: CreateVariantInput,
): Promise<ActionResponse<CourseVariantsRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const variant = await createVariant({
      master_course_id: input.master_course_id,
      pillar_id: input.pillar_id,
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

    return { success: true, data: variant };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a Course Variant.
 */
export async function deleteVariantAction(
  variantId: string,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await deleteVariant(variantId);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Publish a Course Variant.
 */
export async function publishVariantAction(
  variantId: string,
): Promise<ActionResponse<CourseVariantsRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const variant = await publishVariant(variantId);

    return { success: true, data: variant };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Unpublish a Course Variant.
 */
export async function unpublishVariantAction(
  variantId: string,
): Promise<ActionResponse<CourseVariantsRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const variant = await unpublishVariant(variantId);

    return { success: true, data: variant };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Add items to a Course Variant.
 */
export async function addVariantItemsAction(
  input: AddVariantItemsInput,
): Promise<ActionResponse<CourseVariantItemsRow[]>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const items = input.master_course_item_ids.map((itemId, index) => ({
      course_variant_id: input.course_variant_id,
      master_course_item_id: itemId,
      inclusion_type: input.inclusion_type ?? 'selected_item',
      sort_order: index,
    }));

    const result = await addVariantItems(items);

return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof DuplicateVariantItemError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Remove an item from a Course Variant.
 */
export async function removeVariantItemAction(
  variantId: string,
  masterCourseItemId: string,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await removeVariantItem(variantId, masterCourseItemId);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update a Course Variant.
 */
export async function updateVariantAction(
  input: UpdateVariantInput,
): Promise<ActionResponse<CourseVariantsRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const variant = await updateVariant(input.id, {
      pillar_id: input.pillar_id,
      title: input.title,
      slug: input.slug,
      code: input.code,
      description: input.description,
      selling_price: input.selling_price,
      discounted_price: input.discounted_price,
      pricing_model: input.pricing_model as 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only' | undefined,
      visibility_scope: input.visibility_scope as 'private' | 'global' | 'selected_colleges' | undefined,
      created_for_college_id: input.created_for_college_id,
      visible_college_ids: input.visible_college_ids,
    });

    return { success: true, data: variant };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

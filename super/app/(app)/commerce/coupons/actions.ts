'use server';

/**
 * Server actions for Coupons.
 * All actions are gated by requireAuth().
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SellableEntityType, PurchaseSource } from '@/types/database';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateCouponInput {
  code: string;
  description?: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  max_uses?: number | null;
  max_uses_per_user?: number;
  valid_from: string;
  valid_until?: string | null;
  applicable_entity_types: SellableEntityType[];
  applicable_entity_ids?: string[] | null;
  min_order_amount_minor?: number | null;
  applicable_sources: PurchaseSource[];
}

export interface UpdateCouponInput {
  id: string;
  code?: string;
  description?: string;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  max_uses?: number | null;
  max_uses_per_user?: number;
  valid_from?: string;
  valid_until?: string | null;
  applicable_entity_types?: SellableEntityType[];
  applicable_entity_ids?: string[] | null;
  min_order_amount_minor?: number | null;
  applicable_sources?: PurchaseSource[];
}

/**
 * Create a new coupon.
 */
export async function createCouponAction(
  input: CreateCouponInput,
): Promise<ActionResponse<{ id: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('coupons')
      .insert({
        code: input.code.toUpperCase(),
        description: input.description ?? null,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        max_uses: input.max_uses ?? null,
        uses_count: 0,
        max_uses_per_user: input.max_uses_per_user ?? 1,
        valid_from: input.valid_from,
        valid_until: input.valid_until ?? null,
        status: 'active',
        applicable_entity_types: input.applicable_entity_types,
        applicable_entity_ids: input.applicable_entity_ids ?? null,
        min_order_amount_minor: input.min_order_amount_minor ?? null,
        applicable_sources: input.applicable_sources,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create coupon: ${error?.message ?? 'No data returned'}`);
    }

    return { success: true, data: data as { id: string } };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update an existing coupon.
 */
export async function updateCouponAction(
  input: UpdateCouponInput,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();
    const { id, ...updates } = input;

    // If code is being updated, uppercase it
    if (updates.code) {
      updates.code = updates.code.toUpperCase();
    }

    const { error } = await admin
      .from('coupons')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update coupon: ${error.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Toggle coupon status (enable/disable).
 */
export async function toggleCouponStatusAction(
  couponId: string,
  enabled: boolean,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from('coupons')
      .update({
        status: enabled ? 'active' : 'disabled',
        disabled_at: enabled ? null : new Date().toISOString(),
        disabled_reason: enabled ? null : 'Disabled by admin',
      })
      .eq('id', couponId);

    if (error) {
      throw new Error(`Failed to toggle coupon status: ${error.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete an existing coupon.
 */
export async function deleteCouponAction(
  couponId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from('coupons')
      .delete()
      .eq('id', couponId);

    if (error) {
      throw new Error(`Failed to delete coupon: ${error.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

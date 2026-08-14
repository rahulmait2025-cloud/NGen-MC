import 'server-only';

/**
 * LMS Payment-to-Entitlement Automation Service.
 *
 * After a verified successful payment, automatically grants access
 * using the existing entitlement engine.
 *
 * FULLY ISOLATED: LMS owns this code. Uses LMS-specific order types.
 *
 * Rules:
 * - Variant purchase → variant entitlement
 * - Bundle purchase → bundle entitlement
 * - No duplicate active entitlement creation
 * - Merge with existing entitlements cleanly
 * - Respect expiry if configured
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { grantEntitlement } from '@/lib/services/student-entitlements';
import { isEntitlementActive } from '@/lib/services/access-helpers';
import type { LmsOrderWithItems } from './orders';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface LmsEntitlementGrantResult {
  success: boolean;
  entitlementId?: string;
  message: string;
  alreadyExists: boolean;
}

export interface LmsProvisionAccessInput {
  /** Verified paid LMS order. */
  order: LmsOrderWithItems;
  /** Student user ID (if available). */
  studentUserId: string;
  /** Student email. */
  studentEmail: string;
}

// ─── Entitlement Automation ──────────────────────────────────────────────────────

/**
 * Provision LMS access for a student after successful payment.
 *
 * Idempotent: checks for existing active entitlements before creating new ones.
 *
 * Flow:
 * 1. Determine what was purchased (variant or bundle)
 * 2. Check for existing active entitlements
 * 3. If none exist, grant new entitlement
 * 4. For bundles, grant entitlements for all items in the bundle
 */
export async function provisionLmsAccessAfterPurchase(
  input: LmsProvisionAccessInput,
): Promise<{ results: LmsEntitlementGrantResult[] }> {
  // Process each order item
  const results = await Promise.all(input.order.items.map(async (item) => {
    if (item.entity_type === 'course_variant') {
      return await provisionLmsVariantAccess({
        variantId: item.entity_id,
        studentUserId: input.studentUserId,
        studentEmail: input.studentEmail,
        orderId: input.order.id,
      });
    }
    if (item.entity_type === 'course_bundle') {
      return await provisionLmsBundleAccess({
        bundleId: item.entity_id,
        studentUserId: input.studentUserId,
        studentEmail: input.studentEmail,
        orderId: input.order.id,
      });
    }
    return {
      success: false,
      message: `Unknown entity type: ${item.entity_type}`,
      alreadyExists: false,
    };
  }));

  return { results };
}

/**
 * Grant LMS entitlement for a purchased course variant.
 */
async function provisionLmsVariantAccess(params: {
  variantId: string;
  studentUserId: string;
  studentEmail: string;
  orderId: string;
}): Promise<LmsEntitlementGrantResult> {
  const admin = createAdminClient();

  // Step 1: Get variant details including master_course_id
  const { data: variant, error: variantError } = await admin
    .from('course_variants')
    .select('id, master_course_id, title')
    .eq('id', params.variantId)
    .single();

  if (variantError || !variant) {
    return {
      success: false,
      message: `Variant not found: ${params.variantId}`,
      alreadyExists: false,
    };
  }

  // Step 2: Check for existing active entitlement (including valid_until)
  const { data: existingEntitlements, error: checkError } = await admin
    .from('student_entitlements')
    .select('id, status, valid_from, valid_until')
    .eq('student_id', params.studentUserId)
    .eq('master_course_id', variant.master_course_id)
    .eq('source_type', 'b2c_direct');

  if (checkError) {
    console.error('[lms/payment-entitlements] Failed to check existing entitlements:', checkError);
    return {
      success: false,
      message: 'Failed to check existing entitlements',
      alreadyExists: false,
    };
  }

  // Check if there's an active, non-expired entitlement
  const hasActiveEntitlement = (existingEntitlements ?? []).some(
    (e) => isEntitlementActive(e),
  );

  if (hasActiveEntitlement) {
    return {
      success: true,
      message: 'Active entitlement already exists for this course',
      alreadyExists: true,
    };
  }

  // Step 3: Grant new entitlement
  try {
    const entitlement = await grantEntitlement({
      student_id: params.studentUserId,
      master_course_id: variant.master_course_id,
      source_type: 'b2c_direct',
      valid_until: null, // No expiry for one-time purchases (configurable later)
      metadata: {
        purchase_type: 'variant',
        variant_id: params.variantId,
        order_id: params.orderId,
        variant_title: (variant as { title: string }).title,
        portal: 'lms',
      },
    });

    return {
      success: true,
      entitlementId: entitlement.id,
      message: 'Entitlement granted successfully',
      alreadyExists: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to grant entitlement: ${message}`,
      alreadyExists: false,
    };
  }
}

/**
 * Grant LMS entitlement for a purchased course bundle.
 *
 * Bundles grant access to all their included items.
 */
async function provisionLmsBundleAccess(params: {
  bundleId: string;
  studentUserId: string;
  studentEmail: string;
  orderId: string;
}): Promise<LmsEntitlementGrantResult> {
  const admin = createAdminClient();

  // Step 1: Get bundle details
  const { data: bundle, error: bundleError } = await admin
    .from('course_bundles')
    .select('id, title')
    .eq('id', params.bundleId)
    .single();

  if (bundleError || !bundle) {
    return {
      success: false,
      message: `Bundle not found: ${params.bundleId}`,
      alreadyExists: false,
    };
  }

  // Step 2: Get all variants in this bundle
  const { data: bundleItems, error: itemsError } = await admin
    .from('bundle_items')
    .select('reference_id, item_type')
    .eq('bundle_id', params.bundleId)
    .eq('item_type', 'variant');

  if (itemsError) {
    console.error('[lms/payment-entitlements] Failed to fetch bundle items:', itemsError);
    return {
      success: false,
      message: 'Failed to fetch bundle items',
      alreadyExists: false,
    };
  }

  // Step 3: Grant entitlements for each variant in the bundle
  const results = await Promise.all((bundleItems ?? []).map(async (item) => {
    const variantId = (item as { reference_id: string }).reference_id;

    return await provisionLmsVariantAccess({
      variantId,
      studentUserId: params.studentUserId,
      studentEmail: params.studentEmail,
      orderId: params.orderId,
    });
  }));

  // Return success if at least one entitlement was granted
  const anySuccess = results.some((r) => r.success);
  const anyNew = results.some((r) => !r.alreadyExists);

  return {
    success: anySuccess,
    message: anyNew
      ? `LMS bundle access provisioned: ${results.filter((r) => !r.alreadyExists).length} new entitlements granted`
      : 'All bundle items already accessible',
    alreadyExists: results.every((r) => r.alreadyExists),
  };
}

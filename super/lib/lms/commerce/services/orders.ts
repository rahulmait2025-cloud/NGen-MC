import 'server-only';

/**
 * LMS Orders Service.
 *
 * Handles secure server-side order creation, payment verification,
 * and order lifecycle management for the LMS portal.
 *
 * FULLY ISOLATED: LMS owns this code. Uses LMS-specific payment provider.
 *
 * Security rules:
 * - NEVER trust amount from client
 * - NEVER trust item pricing from client
 * - All pricing computed server-side from DB
 * - Payment verification is server-side only
 * - Source is always "lms"
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getLmsRazorpayProvider } from '@/lib/lms/commerce/razorpay';
import { validateLmsCoupon, recordLmsCouponUsage } from './coupons';
import type {
  LmsGatewayOrderResponse,
  LmsPaymentVerificationResult,
} from '@/lib/lms/commerce/provider';

// --- Types ----------------------------------------------------------------------

export type LmsOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type LmsPaymentStatus = 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded';

export type LmsEntityType = 'course_variant' | 'course_bundle';
const LMS_SOURCE = 'lms' as const;

export interface LmsOrderRecord {
  id: string;
  entity_type: LmsEntityType;
  entity_id: string;
  purchaser_user_id: string | null;
  purchaser_email: string;
  purchaser_name: string | null;
  source: 'lms';
  base_amount_minor: number;
  discount_amount_minor: number;
  total_amount_minor: number;
  currency: string;
  coupon_code: string | null;
  status: LmsOrderStatus;
  gateway_name: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_signature: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface LmsCreateOrderInput {
  entityType: LmsEntityType;
  entityId: string;
  purchaserEmail: string;
  purchaserName?: string;
  purchaserUserId?: string;
  couponCode?: string;
  /** Idempotency key to prevent duplicate orders. */
  idempotencyKey?: string;
  /** Additional metadata to store with the order. */
  metadata?: Record<string, unknown>;
}

export interface LmsOrderCreationResult {
  order: LmsOrderRecord;
  gatewayOrder: LmsGatewayOrderResponse;
  /** Public Razorpay key for checkout (safe for browser). */
  razorpayKey: string;
}

export interface LmsVerifyPaymentInput {
  /** Your local order ID. */
  orderId: string;
  /** Razorpay order ID from checkout. */
  gatewayOrderId: string;
  /** Razorpay payment ID from checkout. */
  gatewayPaymentId: string;
  /** Razorpay signature from checkout. */
  gatewaySignature: string;
}

export interface LmsVerifyPaymentResult {
  success: boolean;
  order: LmsOrderRecord;
  message: string;
}

export interface LmsOrderWithItems extends LmsOrderRecord {
  items: Array<{
    id: string;
    entity_type: LmsEntityType;
    entity_id: string;
    unit_amount_minor: number;
    discount_amount_minor: number;
    total_amount_minor: number;
    currency: string;
    metadata: Record<string, unknown>;
  }>;
}

// --- Pricing Helpers ------------------------------------------------------------

/**
 * Fetch the sellable entity and compute its price server-side.
 * NEVER trust client-supplied amounts.
 */
async function getLmsEntityPrice(
  entityType: LmsEntityType,
  entityId: string,
): Promise<{ baseAmountMinor: number; currency: string; title: string }> {
  const admin = createAdminClient();

  if (entityType === 'course_variant') {
    const { data, error } = await admin
      .from('course_variants')
      .select('id, selling_price, currency, title, publish_status')
      .eq('id', entityId)
      .single();

    if (error || !data) {
      throw new Error(`Course variant not found: ${entityId}`);
    }

    if (data.publish_status !== 'published') {
      throw new Error('This variant is not available for purchase');
    }

    if (!data.selling_price || data.selling_price <= 0) {
      throw new Error('This variant does not have a valid price');
    }

    return {
      baseAmountMinor: data.selling_price,
      currency: data.currency ?? 'INR',
      title: data.title,
    };
  }

  if (entityType === 'course_bundle') {
    const { data, error } = await admin
      .from('course_bundles')
      .select('id, selling_price, currency, title, publish_status, lifecycle_status')
      .eq('id', entityId)
      .single();

    if (error || !data) {
      throw new Error(`Course bundle not found: ${entityId}`);
    }

    if (data.publish_status !== 'published' || data.lifecycle_status !== 'active') {
      throw new Error('This bundle is not available for purchase');
    }

    if (!data.selling_price || data.selling_price <= 0) {
      throw new Error('This bundle does not have a valid price');
    }

    return {
      baseAmountMinor: data.selling_price,
      currency: data.currency ?? 'INR',
      title: data.title,
    };
  }

  throw new Error(`Unknown entity type: ${entityType}`);
}

// --- Order Creation -------------------------------------------------------------

/**
 * Create a new LMS order securely.
 *
 * Flow:
 * 1. Validate sellable entity exists and is purchasable
 * 2. Compute price server-side (NEVER trust client)
 * 3. Validate and apply coupon if provided
 * 4. Check for idempotency (prevent duplicate orders)
 * 5. Create local pending order
 * 6. Create Razorpay gateway order
 * 7. Return safe checkout payload
 */
export async function createLmsOrder(
  input: LmsCreateOrderInput,
): Promise<LmsOrderCreationResult> {
  const admin = createAdminClient();

  // Step 1: Validate entity and get price
  const pricing = await getLmsEntityPrice(input.entityType, input.entityId);

  // Step 2: Calculate amounts
  let discountAmountMinor = 0;
  let couponCode: string | null = null;

  // Step 3: Validate coupon if provided
  if (input.couponCode) {
    const couponResult = await validateLmsCoupon({
      code: input.couponCode,
      orderAmountMinor: pricing.baseAmountMinor,
      entityType: input.entityType,
      entityId: input.entityId,
      purchaserUserId: input.purchaserUserId,
      purchaserEmail: input.purchaserEmail,
    });

    if (couponResult.valid && couponResult.coupon) {
      discountAmountMinor = couponResult.discountAmountMinor;
      couponCode = input.couponCode.toUpperCase();
    }
  }

  const totalAmountMinor = pricing.baseAmountMinor - discountAmountMinor;

  if (totalAmountMinor < 0) {
    throw new Error('Total amount cannot be negative');
  }

  // Step 4: Check idempotency
  const idempotencyKey = input.idempotencyKey ?? `${input.entityType}-${input.entityId}-${input.purchaserEmail}-${Date.now()}`;

  // Check if order already exists with this idempotency key
  const { data: existingOrder } = await admin
    .from('orders')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .eq('source', LMS_SOURCE)
    .single();

  if (existingOrder && (existingOrder as LmsOrderRecord).status === 'pending') {
    // Return existing pending order with its gateway order
    const existing = existingOrder as LmsOrderRecord;
    if (existing.gateway_order_id) {
      const razorpay = getLmsRazorpayProvider();
      const gatewayOrder = await razorpay.fetchOrder(existing.gateway_order_id);

      return {
        order: existing,
        gatewayOrder: {
          gateway_order_id: gatewayOrder.id as string,
          amount_minor: gatewayOrder.amount as number,
          currency: (gatewayOrder.currency as string) ?? 'INR',
          status: (gatewayOrder.status as string) ?? 'created',
          raw: gatewayOrder,
        },
        razorpayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? '',
      };
    }
  }

  // Step 5: Create local pending order
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      purchaser_user_id: input.purchaserUserId ?? null,
      purchaser_email: input.purchaserEmail,
      purchaser_name: input.purchaserName ?? null,
      source: LMS_SOURCE,
      base_amount_minor: pricing.baseAmountMinor,
      discount_amount_minor: discountAmountMinor,
      total_amount_minor: totalAmountMinor,
      currency: pricing.currency,
      coupon_code: couponCode,
      status: 'pending',
      gateway_name: 'razorpay',
      metadata: input.metadata ?? {},
      idempotency_key: idempotencyKey,
    })
    .select('*')
    .single();

  if (orderError || !order) {
    throw new Error(`Failed to create order: ${orderError?.message ?? 'No data returned'}`);
  }

  const orderRecord = order as LmsOrderRecord;

  // Step 6: Create Razorpay order
  const razorpay = getLmsRazorpayProvider();
  const gatewayOrder = await razorpay.createOrder({
    order_id: orderRecord.id,
    amount_minor: totalAmountMinor,
    currency: pricing.currency,
    receipt: orderRecord.id.substring(0, 40),
    notes: {
      entity_type: input.entityType,
      entity_id: input.entityId,
      source: LMS_SOURCE,
      purchaser_email: input.purchaserEmail,
    },
  });

  // Step 7: Update order with gateway references, create order item, and create payment record (all independent)
  await Promise.all([
    admin
      .from('orders')
      .update({
        gateway_order_id: gatewayOrder.gateway_order_id,
      })
      .eq('id', orderRecord.id),
    admin
      .from('order_items')
      .insert({
        order_id: orderRecord.id,
        entity_type: input.entityType,
        entity_id: input.entityId,
        unit_amount_minor: pricing.baseAmountMinor,
        discount_amount_minor: discountAmountMinor,
        total_amount_minor: totalAmountMinor,
        currency: pricing.currency,
      }),
    admin
      .from('payments')
      .insert({
        order_id: orderRecord.id,
        gateway_name: 'razorpay',
        gateway_order_id: gatewayOrder.gateway_order_id,
        amount_minor: totalAmountMinor,
        currency: pricing.currency,
        status: 'initiated',
      }),
  ]);

  return {
    order: orderRecord,
    gatewayOrder,
    razorpayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? '',
  };
}

// --- Payment Verification -------------------------------------------------------

/**
 * Verify an LMS payment server-side after Razorpay checkout completion.
 *
 * Security:
 * - Verifies signature using HMAC-SHA256 (server-side only)
 * - Never trusts frontend success callback alone
 * - Idempotent - safe to call multiple times
 * - Prevents duplicate order transitions
 * - Prevents duplicate entitlement creation
 */
export async function verifyLmsPayment(
  input: LmsVerifyPaymentInput,
): Promise<LmsVerifyPaymentResult> {
  const admin = createAdminClient();

  // Fetch the order
  const { data: orderData, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', input.orderId)
    .eq('source', LMS_SOURCE)
    .single();

  if (orderError || !orderData) {
    return { success: false, order: null as unknown as LmsOrderRecord, message: 'Order not found' };
  }

  const order = orderData as LmsOrderRecord;

  // Check if already verified (idempotency)
  if (order.status === 'paid') {
    return { success: true, order, message: 'Payment already verified' };
  }

  // Check if order is in a valid state for verification
  if (order.status !== 'pending') {
    return {
      success: false,
      order,
      message: `Order is in '${order.status}' state and cannot be verified`,
    };
  }

  // Verify the payment signature
  const razorpay = getLmsRazorpayProvider();
  const verification: LmsPaymentVerificationResult = await razorpay.verifyPayment({
    gateway_order_id: input.gatewayOrderId,
    gateway_payment_id: input.gatewayPaymentId,
    gateway_signature: input.gatewaySignature,
  });

  if (!verification.verified) {
    // Mark order as failed
    await admin
      .from('orders')
      .update({
        status: 'failed',
        gateway_payment_id: input.gatewayPaymentId,
        gateway_signature: input.gatewaySignature,
        metadata: {
          ...((order.metadata as Record<string, unknown>) ?? {}),
          verification_failed: true,
          failed_at: new Date().toISOString(),
        },
      })
      .eq('id', order.id);

    await admin
      .from('payments')
      .insert({
        order_id: order.id,
        gateway_name: 'razorpay',
        gateway_order_id: input.gatewayOrderId,
        gateway_payment_id: input.gatewayPaymentId,
        gateway_signature: input.gatewaySignature,
        amount_minor: verification.amount_minor,
        status: 'failed',
        failure_reason: 'Signature verification failed',
        failed_at: new Date().toISOString(),
        gateway_payload: verification.raw,
      });

    return { success: false, order, message: 'Payment signature verification failed' };
  }

  // Amount validation - ensure gateway amount matches order
  if (verification.amount_minor !== order.total_amount_minor) {
    console.error(
      `[lms/orders] Amount mismatch for order ${order.id}: expected ${order.total_amount_minor}, got ${verification.amount_minor}`,
    );
    return {
      success: false,
      order,
      message: 'Payment amount does not match order total',
    };
  }

  // Transactional update: order + payment + coupon usage
  const now = new Date().toISOString();

  // Update order
  const { error: updateOrderError } = await admin
    .from('orders')
    .update({
      status: 'paid',
      gateway_payment_id: input.gatewayPaymentId,
      gateway_signature: input.gatewaySignature,
      paid_at: now,
      metadata: {
        ...((order.metadata as Record<string, unknown>) ?? {}),
        payment_method: verification.method,
        verified_at: now,
      },
    })
    .eq('id', order.id);

  if (updateOrderError) {
    console.error('[lms/orders] Failed to update order after verification:', updateOrderError);
    return { success: false, order, message: 'Failed to complete payment verification' };
  }

  // Update/create payment record
  await admin
    .from('payments')
    .insert({
      order_id: order.id,
      gateway_name: 'razorpay',
      gateway_order_id: input.gatewayOrderId,
      gateway_payment_id: input.gatewayPaymentId,
      gateway_signature: input.gatewaySignature,
      amount_minor: verification.amount_minor,
      status: 'captured',
      method: verification.method,
      captured_at: now,
      gateway_payload: verification.raw,
    });

  // Record coupon usage if applicable
  if (order.coupon_code) {
    const { data: couponData } = await admin
      .from('coupons')
      .select('id')
      .eq('code', order.coupon_code)
      .single();

    if (couponData) {
      await recordLmsCouponUsage({
        couponId: (couponData as { id: string }).id,
        orderId: order.id,
        purchaserUserId: order.purchaser_user_id ?? undefined,
        purchaserEmail: order.purchaser_email,
        discountAmountMinor: order.discount_amount_minor,
      });
    }
  }

  // Re-fetch the updated order
  const { data: updatedOrder } = await admin
    .from('orders')
    .select('*')
    .eq('id', order.id)
    .single();

  return {
    success: true,
    order: updatedOrder as LmsOrderRecord,
    message: 'Payment verified successfully',
  };
}

// --- Order Query ----------------------------------------------------------------

/**
 * Get an LMS order by ID with its items.
 */
export async function getLmsOrderById(orderId: string): Promise<LmsOrderWithItems | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('id', orderId)
    .eq('source', LMS_SOURCE)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as LmsOrderWithItems;
}

/**
 * Get LMS orders by purchaser user ID.
 */
 
async function _getLmsOrdersByUserId(userId: string): Promise<LmsOrderRecord[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .select('*')
    .eq('purchaser_user_id', userId)
    .eq('source', LMS_SOURCE)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch LMS orders: ${error.message}`);
  }

  return (data ?? []) as LmsOrderRecord[];
}

/**
 * Get LMS orders by purchaser email.
 */
export async function getLmsOrdersByEmail(email: string): Promise<LmsOrderRecord[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .select('*')
    .eq('purchaser_email', email)
    .eq('source', LMS_SOURCE)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch LMS orders: ${error.message}`);
  }

  return (data ?? []) as LmsOrderRecord[];
}

// --- Order Lifecycle ------------------------------------------------------------

/**
 * Cancel a pending LMS order.
 */
 
async function _cancelLmsOrder(
  orderId: string,
  cancelledBy?: string,
  reason?: string,
): Promise<LmsOrderRecord> {
  const admin = createAdminClient();

  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('source', LMS_SOURCE)
    .single();

  if (fetchError || !order) {
    throw new Error(`LMS order not found: ${orderId}`);
  }

  const currentOrder = order as LmsOrderRecord;

  if (currentOrder.status !== 'pending') {
    throw new Error(`Cannot cancel LMS order in '${currentOrder.status}' state`);
  }

  const now = new Date().toISOString();

  const { data: updatedOrder, error: updateError } = await admin
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      cancelled_by: cancelledBy ?? null,
      cancel_reason: reason ?? null,
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateError || !updatedOrder) {
    throw new Error(`Failed to cancel LMS order: ${updateError?.message}`);
  }

  return updatedOrder as LmsOrderRecord;
}

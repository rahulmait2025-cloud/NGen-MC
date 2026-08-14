import 'server-only';

/**
 * Note Purchase Service (Phase 3 + Coupons).
 *
 * Server-side service for note collection purchases via Razorpay.
 * Follows the same patterns as the existing course purchase flow.
 * Supports official coupons and campus ambassador coupons.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayProvider, getRazorpayPublicKey } from '@/lib/payments/razorpay';
import { validateCouponForCheckout, recordNoteCouponUsage, normalizeCouponCode } from './coupons';
import type { NotePaymentOrdersRow, NoteCollectionsRow } from '@/types/database';

export interface CreateNoteOrderInput {
  studentId: string;
  noteCollectionId: string;
  couponCode?: string;
}

export interface NoteOrderCouponSummary {
  valid: boolean;
  couponCode?: string;
  originalAmountMinor: number;
  discountMinor: number;
  finalAmountMinor: number;
  message?: string;
}

export interface CreateNoteOrderResult {
  order: NotePaymentOrdersRow | null;
  gatewayOrder: {
    gateway_order_id: string;
    amount_minor: number;
    currency: string;
  } | null;
  razorpayKey: string;
  collection: {
    title: string;
    slug: string;
  };
  coupon: NoteOrderCouponSummary;
  zeroPayUnlock: boolean;
}

export interface ValidateNoteCouponInput {
  studentId: string;
  purchaserUserId: string;
  noteCollectionId: string;
  couponCode: string;
}

export interface VerifyNotePaymentInput {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface VerifyNotePaymentResult {
  success: boolean;
  message: string;
}

/**
 * Validate a coupon against a note collection (for the "Apply Coupon" UI).
 * Returns discount breakdown without creating an order.
 */
export async function validateNoteCoupon(
  input: ValidateNoteCouponInput,
): Promise<NoteOrderCouponSummary> {
  const sb = createAdminClient();

  const { data: collection, error: colError } = await sb
    .from('note_collections')
    .select('id, title, price_minor, currency')
    .eq('id', input.noteCollectionId)
    .eq('publish_status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (colError || !collection) {
    return {
      valid: false,
      originalAmountMinor: 0,
      discountMinor: 0,
      finalAmountMinor: 0,
      message: 'Note collection not found',
    };
  }

  const nc = collection as NoteCollectionsRow;
  const originalAmountMinor = nc.price_minor ?? 0;

  if (originalAmountMinor <= 0) {
    return {
      valid: false,
      originalAmountMinor: 0,
      discountMinor: 0,
      finalAmountMinor: 0,
      message: 'This note collection is free — no coupon needed',
    };
  }

  const result = await validateCouponForCheckout({
    couponCode: input.couponCode,
    entityType: 'note_collection',
    entityId: input.noteCollectionId,
    originalAmountMinor,
    currency: nc.currency || 'INR',
    purchaserUserId: input.purchaserUserId,
    studentId: input.studentId,
  });

  return {
    valid: result.valid,
    couponCode: result.couponCode,
    originalAmountMinor: result.breakdown.originalAmountMinor,
    discountMinor: result.breakdown.discountMinor,
    finalAmountMinor: result.breakdown.finalAmountMinor,
    message: result.message,
  };
}

/**
 * Create a Razorpay order for note collection purchase.
 *
 * Server-side pricing: never trusts client-provided amounts.
 * Supports coupon codes — discount calculated server-side.
 * If coupon covers full amount, returns zeroPayUnlock: true (no Razorpay order).
 */
export async function createNoteOrder(
  input: CreateNoteOrderInput,
): Promise<CreateNoteOrderResult> {
  const sb = createAdminClient();

  // 1. Fetch the note collection — server-side pricing
  const { data: collection, error: colError } = await sb
    .from('note_collections')
    .select('id, title, slug, pricing_model, price_minor, currency, publish_status, deleted_at, validity_days')
    .eq('id', input.noteCollectionId)
    .eq('publish_status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (colError || !collection) {
    throw new Error('Note collection not found or not published');
  }

  const nc = collection as NoteCollectionsRow;

  if (nc.pricing_model !== 'free' && (!nc.price_minor || nc.price_minor <= 0)) {
    throw new Error('Invalid note collection pricing');
  }

  // 2. Check if student already has access
  const { data: existingEntitlement } = await sb
    .from('student_note_entitlements')
    .select('id')
    .eq('student_id', input.studentId)
    .eq('note_collection_id', input.noteCollectionId)
    .eq('status', 'active')
    .or('valid_until.is.null,valid_until.gt.now()')
    .maybeSingle();

  if (existingEntitlement) {
    throw new Error('Student already has access to this note collection');
  }

  // 3. Server-side coupon validation
  const originalAmountMinor = nc.price_minor ?? 0;
  let discountMinor = 0;
  let couponCode: string | null = null;
  let couponId: string | null = null;

  if (input.couponCode && originalAmountMinor > 0) {
    const couponResult = await validateCouponForCheckout({
      couponCode: input.couponCode,
      entityType: 'note_collection',
      entityId: input.noteCollectionId,
      originalAmountMinor,
      currency: nc.currency || 'INR',
      purchaserUserId: input.studentId,
      studentId: input.studentId,
    });

    if (!couponResult.valid) {
      throw new Error(couponResult.message ?? 'Invalid coupon code');
    }

    discountMinor = couponResult.discountMinor;
    couponCode = couponResult.couponCode ?? normalizeCouponCode(input.couponCode);
    couponId = couponResult.couponId ?? null;
  }

  const finalAmountMinor = Math.max(originalAmountMinor - discountMinor, 0);

  // 4. Zero-pay unlock: coupon covers full amount
  //    Skip note_payment_orders entirely (amount_minor CHECK requires > 0).
  //    Create entitlement directly with source_type 'free_claim'.
  if (finalAmountMinor <= 0) {
    const nowIso = new Date().toISOString();

    // Idempotency: check for existing active entitlement
    const { data: existingEntitlement } = await sb
      .from('student_note_entitlements')
      .select('id')
      .eq('student_id', input.studentId)
      .eq('note_collection_id', input.noteCollectionId)
      .eq('status', 'active')
      .or('valid_until.is.null,valid_until.gt.now()')
      .maybeSingle();

    if (existingEntitlement) {
      return {
        order: null,
        gatewayOrder: null,
        razorpayKey: getRazorpayPublicKey(),
        collection: { title: nc.title, slug: nc.slug },
        coupon: {
          valid: true,
          couponCode: couponCode ?? undefined,
          originalAmountMinor,
          discountMinor,
          finalAmountMinor: 0,
        },
        zeroPayUnlock: true,
      };
    }

    // Fetch validity_days for entitlement
    const { data: collectionData } = await sb
      .from('note_collections')
      .select('validity_days')
      .eq('id', input.noteCollectionId)
      .maybeSingle();

    const validityDays = (collectionData as { validity_days: number | null } | null)?.validity_days;
    const validUntil = validityDays
      ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create entitlement directly (no order row — avoids CHECK (amount_minor > 0))
    const { data: newEntitlement } = await sb
      .from('student_note_entitlements')
      .insert({
        student_id: input.studentId,
        note_collection_id: input.noteCollectionId,
        source_type: 'free_claim',
        source_order_id: null,
        status: 'active',
        valid_from: nowIso,
        valid_until: validUntil,
        metadata: {
          zero_pay_unlock: true,
          coupon_code: couponCode,
          coupon_id: couponId,
          original_amount_minor: originalAmountMinor,
          discount_amount_minor: discountMinor,
        },
      })
      .select('id')
      .single();

    // Record coupon usage in note_coupon_usages (after entitlement creation)
    if (couponId && couponCode) {
      const [couponResult, profileResult] = await Promise.all([
        sb.from('coupons').select('coupon_origin, owner_user_id').eq('id', couponId).maybeSingle(),
        sb.from('profiles').select('email').eq('id', input.studentId).maybeSingle(),
      ]);
      const couponRecord = couponResult.data;
      const profile = profileResult.data;

      await recordNoteCouponUsage({
        couponId,
        studentId: input.studentId,
        noteCollectionId: input.noteCollectionId,
        notePaymentOrderId: null,
        studentNoteEntitlementId: newEntitlement?.id ?? null,
        purchaserUserId: input.studentId,
        purchaserEmail: (profile as { email?: string } | null)?.email ?? '',
        couponCode,
        discountAmountMinor: discountMinor,
        originalAmountMinor,
        finalAmountMinor: 0,
        couponOrigin: (couponRecord as { coupon_origin?: string } | null)?.coupon_origin ?? null,
        metadata: {
          zero_pay_unlock: true,
          coupon_id: couponId,
        },
      });
    }

    return {
      order: null,
      gatewayOrder: null,
      razorpayKey: getRazorpayPublicKey(),
      collection: { title: nc.title, slug: nc.slug },
      coupon: {
        valid: true,
        couponCode: couponCode ?? undefined,
        originalAmountMinor,
        discountMinor,
        finalAmountMinor: 0,
      },
      zeroPayUnlock: true,
    };
  }

  // 5. Paid order: create Razorpay order for finalAmountMinor
  const currency = nc.currency || 'INR';

  // Idempotency: check for existing pending order with same coupon
  const { data: existingOrder } = await sb
    .from('note_payment_orders')
    .select('id, student_id, note_collection_id, amount_minor, currency, status, gateway_order_id, gateway_payment_id, idempotency_key, metadata, created_at, updated_at')
    .eq('student_id', input.studentId)
    .eq('note_collection_id', input.noteCollectionId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingOrder) {
    const existing = existingOrder as NotePaymentOrdersRow;
    const existingCoupon = (existing.metadata as Record<string, unknown>)?.coupon_code as string | undefined ?? null;
    if (existing.gateway_order_id && existingCoupon === couponCode) {
      return {
        order: existing,
        gatewayOrder: {
          gateway_order_id: existing.gateway_order_id,
          amount_minor: existing.amount_minor * 100,
          currency: existing.currency,
        },
        razorpayKey: getRazorpayPublicKey(),
        collection: { title: nc.title, slug: nc.slug },
        coupon: {
          valid: true,
          couponCode: couponCode ?? undefined,
          originalAmountMinor,
          discountMinor,
          finalAmountMinor,
        },
        zeroPayUnlock: false,
      };
    }
  }

  const idempotencyKey = `note_${input.studentId}_${input.noteCollectionId}_${Date.now()}`;

  const { data: orderRow, error: orderError } = await sb
    .from('note_payment_orders')
    .insert({
      student_id: input.studentId,
      note_collection_id: input.noteCollectionId,
      amount_minor: finalAmountMinor,
      currency,
      status: 'pending',
      idempotency_key: idempotencyKey,
      metadata: {
        coupon_code: couponCode,
        coupon_id: couponId,
        original_amount_minor: originalAmountMinor,
        discount_amount_minor: discountMinor,
      },
    })
    .select()
    .single();

  if (orderError || !orderRow) {
    throw new Error(`Failed to create note payment order: ${orderError?.message}`);
  }

  // 6. Create Razorpay order — multiply by 100 to convert rupees to paise
  const razorpay = getRazorpayProvider();
  const gatewayOrder = await razorpay.createOrder({
    order_id: orderRow.id,
    amount_minor: finalAmountMinor * 100,
    currency,
    receipt: `note_${orderRow.id.slice(0, 20)}`,
    notes: {
      note_collection_id: input.noteCollectionId,
      student_id: input.studentId,
      ...(couponCode ? { coupon_code: couponCode } : {}),
    },
  });

  // 7. Update order with gateway_order_id
  await sb
    .from('note_payment_orders')
    .update({ gateway_order_id: gatewayOrder.gateway_order_id })
    .eq('id', orderRow.id);

  return {
    order: { ...orderRow, gateway_order_id: gatewayOrder.gateway_order_id } as NotePaymentOrdersRow,
    gatewayOrder: {
      gateway_order_id: gatewayOrder.gateway_order_id,
      amount_minor: gatewayOrder.amount_minor,
      currency: gatewayOrder.currency,
    },
    razorpayKey: getRazorpayPublicKey(),
    collection: { title: nc.title, slug: nc.slug },
    coupon: {
      valid: true,
      couponCode: couponCode ?? undefined,
      originalAmountMinor,
      discountMinor,
      finalAmountMinor,
    },
    zeroPayUnlock: false,
  };
}

/**
 * Verify a Razorpay payment for note collection purchase.
 *
 * Only grants access after successful signature verification.
 * Idempotent: safe to call multiple times with the same input.
 * Stores gateway_signature and paid_at for audit trail.
 * Prevents duplicate entitlements.
 * Records coupon usage after successful verification.
 */
export async function verifyNotePayment(
  input: VerifyNotePaymentInput,
): Promise<VerifyNotePaymentResult> {
  const sb = createAdminClient();

  // 1. Fetch the order
  const { data: orderData, error: orderError } = await sb
    .from('note_payment_orders')
    .select('id, student_id, note_collection_id, amount_minor, currency, status, gateway_order_id, gateway_payment_id, idempotency_key, metadata, created_at, updated_at')
    .eq('id', input.orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    return { success: false, message: 'Order not found' };
  }

  const order = orderData as NotePaymentOrdersRow;

  // 2. Idempotency: already paid → check entitlement exists, return success
  if (order.status === 'paid') {
    const { data: existingEntitlement } = await sb
      .from('student_note_entitlements')
      .select('id')
      .eq('student_id', order.student_id)
      .eq('note_collection_id', order.note_collection_id)
      .eq('source_order_id', order.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingEntitlement) {
      return { success: true, message: 'Payment already verified' };
    }

    // Order is paid but entitlement missing — re-create entitlement
    const { data: collection } = await sb
      .from('note_collections')
      .select('validity_days')
      .eq('id', order.note_collection_id)
      .maybeSingle();

    const validityDays = (collection as { validity_days: number | null } | null)?.validity_days;
    const validUntil = validityDays
      ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await sb
      .from('student_note_entitlements')
      .insert({
        student_id: order.student_id,
        note_collection_id: order.note_collection_id,
        source_type: 'direct_purchase',
        source_order_id: order.id,
        status: 'active',
        valid_from: order.updated_at ?? order.created_at,
        valid_until: validUntil,
        metadata: {},
      });

    return { success: true, message: 'Payment already verified, entitlement restored' };
  }

  if (order.status !== 'pending') {
    return { success: false, message: `Order is in '${order.status}' state and cannot be verified` };
  }

  // 3. Verify Razorpay signature
  const razorpay = getRazorpayProvider();
  const verification = await razorpay.verifyPayment({
    gateway_order_id: input.gatewayOrderId,
    gateway_payment_id: input.gatewayPaymentId,
    gateway_signature: input.gatewaySignature,
  });

  if (!verification.verified || verification.status !== 'captured') {
    // Update order to failed
    await sb
      .from('note_payment_orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    return { success: false, message: 'Payment verification failed' };
  }

  // 4. Verify amount matches server-stored amount (DB stores rupees, Razorpay returns paise)
  if (verification.amount_minor !== order.amount_minor * 100) {
    await sb
      .from('note_payment_orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    return { success: false, message: 'Payment amount mismatch' };
  }

  // 5. Mark order as paid — store gateway_signature and paid_at for audit trail
  const nowIso = new Date().toISOString();
  await sb
    .from('note_payment_orders')
    .update({
      status: 'paid',
      gateway_payment_id: input.gatewayPaymentId,
      gateway_order_id: input.gatewayOrderId,
      gateway_signature: input.gatewaySignature,
      paid_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', order.id);

  // 6. Fetch collection to determine validity_days
  const { data: collection } = await sb
    .from('note_collections')
    .select('validity_days')
    .eq('id', order.note_collection_id)
    .maybeSingle();

  const validityDays = (collection as { validity_days: number | null } | null)?.validity_days;
  const validUntil = validityDays
    ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // 7. Create student_note_entitlement — prevent duplicate
  const { data: existingEntitlement } = await sb
    .from('student_note_entitlements')
    .select('id')
    .eq('student_id', order.student_id)
    .eq('note_collection_id', order.note_collection_id)
    .eq('source_order_id', order.id)
    .maybeSingle();

  if (!existingEntitlement) {
    await sb
      .from('student_note_entitlements')
      .insert({
        student_id: order.student_id,
        note_collection_id: order.note_collection_id,
        source_type: 'direct_purchase',
        source_order_id: order.id,
        status: 'active',
        valid_from: nowIso,
        valid_until: validUntil,
        metadata: {},
      });
  }

  // 8. Record coupon usage in note_coupon_usages after successful payment verification
  const orderMeta = (order.metadata as Record<string, unknown>) ?? {};
  const couponId = orderMeta.coupon_id as string | undefined;
  const couponCodeFromMeta = orderMeta.coupon_code as string | undefined;

  if (couponId && couponCodeFromMeta && order.student_id) {
    // Check if usage already recorded (idempotent)
    const { data: existingUsage } = await sb
      .from('note_coupon_usages')
      .select('id')
      .eq('note_payment_order_id', order.id)
      .maybeSingle();

    if (!existingUsage) {
      const [couponResult, profileResult, entitlementResult] = await Promise.all([
        sb.from('coupons').select('coupon_origin, owner_user_id').eq('id', couponId).maybeSingle(),
        sb.from('profiles').select('email').eq('id', order.student_id).maybeSingle(),
        sb.from('student_note_entitlements')
          .select('id')
          .eq('student_id', order.student_id)
          .eq('note_collection_id', order.note_collection_id)
          .eq('source_order_id', order.id)
          .maybeSingle(),
      ]);
      const couponRecord = couponResult.data;
      const profile = profileResult.data;
      const entitlement = entitlementResult.data;

      await recordNoteCouponUsage({
        couponId,
        studentId: order.student_id,
        noteCollectionId: order.note_collection_id,
        notePaymentOrderId: order.id,
        studentNoteEntitlementId: entitlement?.id ?? null,
        purchaserUserId: order.student_id,
        purchaserEmail: (profile as { email?: string } | null)?.email ?? '',
        couponCode: couponCodeFromMeta,
        discountAmountMinor: (orderMeta.discount_amount_minor as number) ?? 0,
        originalAmountMinor: (orderMeta.original_amount_minor as number) ?? order.amount_minor,
        finalAmountMinor: order.amount_minor,
        couponOrigin: (couponRecord as { coupon_origin?: string } | null)?.coupon_origin ?? null,
        metadata: {},
      });
    }
  }

  return { success: true, message: 'Payment verified successfully' };
}

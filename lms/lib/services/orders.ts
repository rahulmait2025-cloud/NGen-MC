import 'server-only';

/**
 * Orders Service for LMS.
 * 
 * Handles secure server-side order creation and payment verification.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  getRazorpayProvider,
  getRazorpayPublicKey,
  logRazorpayEnvCheck,
  RazorpayApiError,
} from '@/lib/payments/razorpay';
import { validateCoupon, recordCouponUsage, normalizeCouponCode } from './coupons';
import type {
  GatewayOrderResponse,
  PaymentVerificationResult,
} from '@/lib/payments/provider';
import type { 
  OrderRecord, 
  OrderWithItems, 
  SellableEntityType, 
  PurchaseSource 
} from '@/types/payments';
import { contentTitleMetadataKey } from '@/lib/commerce/purchased-content-display';

// --- Types ----------------------------------------------------------------------

export interface CreateOrderInput {
  entityType: SellableEntityType;
  entityId: string;
  purchaserEmail: string;
  purchaserName?: string;
  purchaserUserId?: string;
  source: PurchaseSource;
  couponCode?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  pricePlanId?: string | null;
}

export interface OrderCreationResult {
  order: OrderRecord;
  gatewayOrder: GatewayOrderResponse;
  razorpayKey: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  order: OrderRecord;
  message: string;
}

// --- Pricing Helpers ------------------------------------------------------------

export interface CheckoutPricing {
  baseAmountMinor: number;
  currency: string;
  title: string;
  validityDays: number | null;
  /** course_price_plans.id — course/variant checkout only */
  pricePlanId: string | null;
  /** bundle_price_plans.id — bundle checkout only */
  bundlePricePlanId: string | null;
}

/** Server-side checkout pricing (never trust client amounts). */
export async function resolveCheckoutPricing(
  entityType: SellableEntityType,
  entityId: string,
  pricePlanId?: string | null,
): Promise<CheckoutPricing> {
  return getEntityPrice(entityType, entityId, pricePlanId);
}

async function getEntityPrice(
  entityType: SellableEntityType,
  entityId: string,
  pricePlanId?: string | null,
): Promise<CheckoutPricing> {
  const admin = createAdminClient();

  // If price_plan_id is provided, use it as the source of truth
  if (pricePlanId) {
    const { data: plan, error: planError } = await admin
      .from('course_price_plans')
      .select('id, master_course_id, source_type, source_id, plan_name, price_minor, currency, validity_days, is_active')
      .eq('id', pricePlanId)
      .single();

    if (planError || !plan) {
      // Bundle price plan fallback
      const { data: bundlePlan, error: bundlePlanError } = await admin
        .from('bundle_price_plans')
        .select('id, bundle_id, plan_name, price_minor, currency, validity_days, is_active')
        .eq('id', pricePlanId)
        .single();

      if (bundlePlanError || !bundlePlan) {
        console.error(`[orders] Price plan not found: ${pricePlanId}`, { entityType, entityId });
        throw new Error(`Price plan not found: ${pricePlanId}`);
      }

      if (entityType === 'course_bundle' && (bundlePlan as { bundle_id: string }).bundle_id !== entityId) {
        throw new Error('Price plan does not match the selected bundle');
      }

      if (!(bundlePlan as { is_active: boolean }).is_active) {
        throw new Error('This price plan is no longer available');
      }

      return {
        baseAmountMinor: (bundlePlan as { price_minor: number }).price_minor,
        currency: (bundlePlan as { currency: string }).currency,
        title: (bundlePlan as { plan_name: string }).plan_name,
        validityDays: (bundlePlan as { validity_days: number | null }).validity_days,
        pricePlanId: null,
        bundlePricePlanId: (bundlePlan as { id: string }).id,
      };
    }

    if (!(plan as { is_active: boolean }).is_active) {
      throw new Error('This price plan is no longer available');
    }

    const planRow = plan as {
      master_course_id: string;
      source_type?: string | null;
      source_id?: string | null;
    };

    if (entityType === 'master_course') {
      const matchesSource =
        planRow.master_course_id === entityId
        || (planRow.source_id === entityId
          && (planRow.source_type === 'master_course' || planRow.source_type === 'paid_course_builder'));
      if (!matchesSource) {
        throw new Error('Price plan does not match the selected course');
      }
    }

    if (entityType === 'course_variant') {
      const matchesVariant =
        planRow.source_type === 'course_variant' && planRow.source_id === entityId;
      if (!matchesVariant) {
        throw new Error('Price plan does not match the selected variant');
      }
    }

    return {
      baseAmountMinor: (plan as { price_minor: number }).price_minor,
      currency: (plan as { currency: string }).currency,
      title: (plan as { plan_name: string }).plan_name,
      validityDays: (plan as { validity_days: number | null }).validity_days,
      pricePlanId: (plan as { id: string }).id,
      bundlePricePlanId: null,
    };
  }

  if (entityType === 'course_variant') {
    const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
    const plans = await getActivePricePlansForSource('course_variant', entityId);
    const defaultPlan = plans.find((p) => p.is_default) ?? plans[0];
    if (defaultPlan) {
      return {
        baseAmountMinor: defaultPlan.price_minor,
        currency: defaultPlan.currency,
        title: defaultPlan.plan_name,
        validityDays: defaultPlan.validity_days,
        pricePlanId: defaultPlan.id,
        bundlePricePlanId: null,
      };
    }

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
      validityDays: null,
      pricePlanId: null,
      bundlePricePlanId: null,
    };
  }

  if (entityType === 'course_bundle') {
    const { getActiveBundlePricePlans } = await import('@/lib/services/bundle-price-plans');
    const plans = await getActiveBundlePricePlans(entityId);
    const defaultPlan = plans.find((p) => p.is_default) ?? plans[0];
    if (defaultPlan) {
      return {
        baseAmountMinor: defaultPlan.price_minor,
        currency: defaultPlan.currency,
        title: defaultPlan.plan_name,
        validityDays: defaultPlan.validity_days,
        pricePlanId: null,
        bundlePricePlanId: defaultPlan.id,
      };
    }

    const { data, error } = await admin
      .from('course_bundles')
      .select('id, selling_price, currency, title, publish_status, lifecycle_status, pricing_model')
      .eq('id', entityId)
      .single();

    if (error || !data) {
      throw new Error(`Course bundle not found: ${entityId}`);
    }

    if (data.publish_status !== 'published' || data.lifecycle_status !== 'active') {
      throw new Error('This bundle is not available for purchase');
    }

    if (data.pricing_model === 'free' || data.selling_price === 0) {
      return {
        baseAmountMinor: 0,
        currency: data.currency ?? 'INR',
        title: data.title,
        validityDays: null,
        pricePlanId: null,
        bundlePricePlanId: null,
      };
    }

    if (!data.selling_price || data.selling_price <= 0) {
      throw new Error('This bundle does not have a valid price');
    }

    return {
      baseAmountMinor: data.selling_price,
      currency: data.currency ?? 'INR',
      title: data.title,
      validityDays: null,
      pricePlanId: null,
      bundlePricePlanId: null,
    };
  }

  if (entityType === 'job_ready_bootcamp') {
    const { getJobReadyBootcampProduct } = await import('@/lib/services/job-ready-bootcamp');
    const product = await getJobReadyBootcampProduct();
    if (!product) {
      throw new Error('Job Ready Bootcamp is not available for purchase');
    }
    if (entityId !== product.id) {
      throw new Error('Invalid Job Ready Bootcamp product');
    }
    if (!product.price_minor || product.price_minor <= 0) {
      throw new Error('Job Ready Bootcamp does not have a valid price');
    }
    return {
      baseAmountMinor: product.price_minor,
      currency: product.currency,
      title: product.title,
      validityDays: product.validity_days,
      pricePlanId: product.price_plan_id,
      bundlePricePlanId: null,
    };
  }

  if (entityType === 'master_course') {
    // First try to get active price plans
    const { data: plans } = await admin
      .rpc('get_active_price_plans', { p_master_course_id: entityId });

    if (plans && (plans as Array<Record<string, unknown>>).length > 0) {
      const planList = plans as Array<Record<string, unknown>>;
      const defaultPlan = planList.find((p) => p.is_default) ?? planList[0];
      return {
        baseAmountMinor: defaultPlan.price_minor as number,
        currency: (defaultPlan.currency as string) ?? 'INR',
        title: (defaultPlan.plan_name as string) ?? 'Standard Access',
        validityDays: (defaultPlan.validity_days as number | null) ?? null,
        pricePlanId: (defaultPlan.id as string) ?? null,
        bundlePricePlanId: null,
      };
    }

    // Fallback to legacy selling_price
    const { data, error } = await admin
      .from('master_courses')
      .select('id, selling_price, currency, title, publish_status, is_free, pricing_model')
      .eq('id', entityId)
      .single();

    if (error || !data) {
      throw new Error(`Master course not found: ${entityId}`);
    }

    if (data.publish_status !== 'published') {
      throw new Error('This course is not available for purchase');
    }

    if (data.is_free || data.pricing_model === 'free') {
      throw new Error('This course is free and does not require payment');
    }

    if (!data.selling_price || data.selling_price <= 0) {
      throw new Error('This course does not have a valid price');
    }

    return {
      baseAmountMinor: data.selling_price,
      currency: data.currency ?? 'INR',
      title: data.title,
      validityDays: null,
      pricePlanId: null,
      bundlePricePlanId: null,
    };
  }

  throw new Error(`Unknown entity type: ${entityType}`);
}

async function resolveSellableEntityTitle(
  entityType: SellableEntityType,
  entityId: string,
): Promise<string> {
  const admin = createAdminClient();

  if (entityType === 'master_course') {
    const { data } = await admin
      .from('master_courses')
      .select('title')
      .eq('id', entityId)
      .maybeSingle();
    return ((data?.title as string | undefined)?.trim() || 'Course');
  }

  if (entityType === 'course_variant') {
    const { data } = await admin
      .from('course_variants')
      .select('title')
      .eq('id', entityId)
      .maybeSingle();
    return ((data?.title as string | undefined)?.trim() || 'Course Variant');
  }

  if (entityType === 'course_bundle') {
    const { data } = await admin
      .from('course_bundles')
      .select('title')
      .eq('id', entityId)
      .maybeSingle();
    return ((data?.title as string | undefined)?.trim() || 'Bundle');
  }

  if (entityType === 'job_ready_bootcamp') {
    const { data } = await admin
      .from('bootcamps')
      .select('title')
      .eq('id', entityId)
      .maybeSingle();
    return ((data?.title as string | undefined)?.trim() || 'Job Ready Bootcamp');
  }

  if (entityType === 'paid_mentorship_booking') {
    return 'Mentorship Session';
  }

  return 'Purchased course';
}

// --- Order Creation -------------------------------------------------------------

export async function createOrder(
  input: CreateOrderInput,
): Promise<OrderCreationResult> {
  const admin = createAdminClient();

  const pricing = await getEntityPrice(input.entityType, input.entityId, input.pricePlanId);
  const hasPricePlan = Boolean(pricing.pricePlanId || pricing.bundlePricePlanId);
  const entityTitle = hasPricePlan
    ? await resolveSellableEntityTitle(input.entityType, input.entityId)
    : (pricing.title?.trim() || await resolveSellableEntityTitle(input.entityType, input.entityId));
  const planName = hasPricePlan ? pricing.title : null;
  const contentTitleKey = contentTitleMetadataKey(input.entityType);

  let discountAmountMinor = 0;
  let couponCode: string | null = null;

  if (input.couponCode) {
    const couponResult = await validateCoupon({
      code: input.couponCode,
      orderAmountMinor: pricing.baseAmountMinor,
      entityType: input.entityType,
      entityId: input.entityId,
      source: input.source,
      purchaserUserId: input.purchaserUserId,
      purchaserEmail: input.purchaserEmail,
    });

    if (!couponResult.valid) {
      throw new Error(couponResult.errorMessage ?? 'Invalid coupon code');
    }

    discountAmountMinor = couponResult.discountAmountMinor;
    couponCode = normalizeCouponCode(input.couponCode);
  }

  const totalAmountMinor = pricing.baseAmountMinor - discountAmountMinor;

  if (totalAmountMinor < 0) {
    throw new Error('Total amount cannot be negative');
  }

  if (totalAmountMinor === 0) {
    throw new Error(
      'This coupon covers the full price. Free checkout is not supported — contact support or use a smaller discount.',
    );
  }

  if (totalAmountMinor < 100) {
    throw new Error('Order amount is below the minimum payment amount (₹1).');
  }

  // Idempotency key: same user + same product = same key (no Date.now()).
  // This prevents duplicate orders when the user clicks rapidly or the network is slow.
  // If a pending order already exists, we reuse its Razorpay order instead of creating a new one.
  const idempotencyKey = input.idempotencyKey ?? `${input.entityType}-${input.entityId}-${input.purchaserEmail}`;

  const { data: existingOrder } = await admin
    .from('orders')
    .select('id, status, gateway_order_id, entity_type, entity_id, purchaser_user_id, purchaser_email, purchaser_name, source, base_amount_minor, discount_amount_minor, total_amount_minor, currency, coupon_code, gateway_name, gateway_payment_id, gateway_signature, status, paid_at, metadata, idempotency_key, created_at, updated_at, price_plan_id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingOrder) {
    if (existingOrder.status === 'pending') {
      if (existingOrder.gateway_order_id) {
        // Verify existing pending order matches latest server-calculated state before reuse.
        const existingPlanId = (existingOrder.metadata as Record<string, unknown>)?.price_plan_id as string | undefined
          ?? existingOrder.price_plan_id ?? null;
        const latestPlanId = pricing.pricePlanId ?? null;
        const existingCouponCode = existingOrder.coupon_code ?? null;
        const latestCouponCode = couponCode ?? null;

        const userMatch = existingOrder.purchaser_user_id === input.purchaserUserId;
        const entityTypeMatch = existingOrder.entity_type === input.entityType;
        const entityIdMatch = existingOrder.entity_id === input.entityId;
        const planMatch = existingPlanId === latestPlanId;
        const couponMatch = existingCouponCode === latestCouponCode;
        const currencyMatch = (existingOrder.currency ?? 'INR') === pricing.currency;
        const amountMatch = existingOrder.total_amount_minor === totalAmountMinor;

        if (
          userMatch
          && entityTypeMatch
          && entityIdMatch
          && planMatch
          && couponMatch
          && currencyMatch
          && amountMatch
        ) {
          // All checks pass — reuse existing pending gateway order.
          // No razorpay.fetchOrder() call needed.
          return {
            order: existingOrder as OrderRecord,
            gatewayOrder: {
              gateway_order_id: existingOrder.gateway_order_id,
              amount_minor: existingOrder.total_amount_minor,
              currency: existingOrder.currency ?? 'INR',
              status: 'created',
              raw: { reused: true },
            },
            razorpayKey: getRazorpayPublicKey(),
          };
        }

        // Mismatch found — free up idempotency key so a new order can be created.
        await admin
          .from('orders')
          .update({ idempotency_key: `${idempotencyKey}-old-${existingOrder.id}` })
          .eq('id', existingOrder.id);
      }
    } else {
      // Free up the idempotency key on the completed/failed/cancelled order so the user can purchase again
      await admin
        .from('orders')
        .update({ idempotency_key: `${idempotencyKey}-old-${existingOrder.id}` })
        .eq('id', existingOrder.id);
    }
  }

  const isBundleOrder = input.entityType === 'course_bundle';
  const isBootcampOrder = input.entityType === 'job_ready_bootcamp';
  const orderContentType = isBundleOrder ? 'bundle' : isBootcampOrder ? 'job_ready_bootcamp' : 'course';

  const orderMetadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    content_type: orderContentType,
    entity_title: entityTitle,
    [contentTitleKey]: entityTitle,
    ...(isBundleOrder ? { bundle_id: input.entityId } : {}),
    ...(pricing.pricePlanId
      ? {
          price_plan_id: pricing.pricePlanId,
          ...(planName ? { plan_name: planName } : {}),
          validity_days: pricing.validityDays,
        }
      : {}),
    ...(pricing.bundlePricePlanId
      ? {
          bundle_price_plan_id: pricing.bundlePricePlanId,
          ...(planName ? { plan_name: planName } : {}),
          validity_days: pricing.validityDays,
        }
      : {}),
  };

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      purchaser_user_id: input.purchaserUserId ?? null,
      purchaser_email: input.purchaserEmail,
      purchaser_name: input.purchaserName ?? null,
      source: input.source,
      base_amount_minor: pricing.baseAmountMinor,
      discount_amount_minor: discountAmountMinor,
      total_amount_minor: totalAmountMinor,
      currency: pricing.currency,
      coupon_code: couponCode,
      status: 'pending',
      gateway_name: 'razorpay',
      // course orders only — bundle plans live in metadata until migration 00219 is applied
      price_plan_id: pricing.pricePlanId ?? null,
      metadata: orderMetadata,
      idempotency_key: idempotencyKey,
    })
    .select('id, status, gateway_order_id, entity_type, entity_id, purchaser_user_id, purchaser_email, purchaser_name, source, base_amount_minor, discount_amount_minor, total_amount_minor, currency, coupon_code, gateway_name, gateway_payment_id, gateway_signature, paid_at, metadata, idempotency_key, created_at, updated_at, price_plan_id')
    .single();

  if (orderError || !order) {
    throw new Error(`Failed to create order: ${orderError?.message ?? 'No data returned'}`);
  }

  const orderRecord = order as OrderRecord;

  logRazorpayEnvCheck('orders.createOrder');
  const razorpay = getRazorpayProvider();
  let gatewayOrder;
  try {
    gatewayOrder = await razorpay.createOrder({
      order_id: orderRecord.id,
      amount_minor: totalAmountMinor,
      currency: pricing.currency,
      receipt: orderRecord.id,
      notes: {
        entity_type: input.entityType,
        entity_id: input.entityId,
        source: input.source,
        purchaser_email: input.purchaserEmail,
        content_type: orderContentType,
        entity_title: entityTitle,
        ...(isBundleOrder ? { bundle_id: input.entityId } : {}),
        ...(pricing.pricePlanId
          ? {
              price_plan_id: pricing.pricePlanId,
              ...(planName ? { plan_name: planName } : {}),
              validity_days: pricing.validityDays?.toString() ?? 'lifetime',
            }
          : {}),
        ...(pricing.bundlePricePlanId
          ? {
              bundle_price_plan_id: pricing.bundlePricePlanId,
              ...(planName ? { plan_name: planName } : {}),
              validity_days: pricing.validityDays?.toString() ?? 'lifetime',
            }
          : {}),
      },
    });
  } catch (err) {
    if (err instanceof RazorpayApiError && err.statusCode === 401) {
      throw new Error(
        'Razorpay authentication failed. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are from the same key pair in the Razorpay dashboard, and NEXT_PUBLIC_RAZORPAY_KEY_ID matches the same mode (test/live).',
      );
    }
    throw err;
  }

  // Parallelize order_items + payments insert + orders update
  await Promise.all([
    admin
      .from('orders')
      .update({ gateway_order_id: gatewayOrder.gateway_order_id })
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
        metadata: {
          entity_title: entityTitle,
          [contentTitleKey]: entityTitle,
          ...(planName ? { plan_name: planName } : {}),
          ...(pricing.validityDays != null ? { validity_days: pricing.validityDays } : {}),
        },
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
    razorpayKey: getRazorpayPublicKey(),
  };
}

// --- Payment Verification -------------------------------------------------------

export async function verifyPayment(
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const admin = createAdminClient();

const { data: orderData, error: orderError } = await admin
    .from('orders')
    .select('id, status, gateway_order_id, entity_type, entity_id, purchaser_user_id, purchaser_email, purchaser_name, source, base_amount_minor, discount_amount_minor, total_amount_minor, currency, coupon_code, gateway_name, gateway_payment_id, gateway_signature, paid_at, metadata, idempotency_key, created_at, updated_at')
    .eq('id', input.orderId)
    .single();

  if (orderError || !orderData) {
    return { success: false, order: null as unknown as OrderRecord, message: 'Order not found' };
  }

  const order = orderData as OrderRecord;

  if (order.status === 'paid') {
    return { success: true, order, message: 'Payment already verified' };
  }

  if (order.status !== 'pending') {
    return {
      success: false,
      order,
      message: `Order is in '${order.status}' state and cannot be verified`,
    };
  }

  const razorpay = getRazorpayProvider();
  const verification: PaymentVerificationResult = await razorpay.verifyPayment({
    gateway_order_id: input.gatewayOrderId,
    gateway_payment_id: input.gatewayPaymentId,
    gateway_signature: input.gatewaySignature,
  });

  const now = new Date().toISOString();

  if (!verification.verified) {
    await Promise.all([
      admin
        .from('orders')
        .update({
          status: 'failed',
          gateway_payment_id: input.gatewayPaymentId,
          gateway_signature: input.gatewaySignature,
          metadata: {
            ...((order.metadata as Record<string, unknown>) ?? {}),
            verification_failed: true,
            failed_at: now,
          },
        })
        .eq('id', order.id),
      admin
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
          failed_at: now,
          gateway_payload: verification.raw,
        }),
    ]);

    return { success: false, order, message: 'Payment signature verification failed' };
  }

  if (verification.status !== 'captured') {
    await admin
      .from('payments')
      .insert({
        order_id: order.id,
        gateway_name: 'razorpay',
        gateway_order_id: input.gatewayOrderId,
        gateway_payment_id: input.gatewayPaymentId,
        gateway_signature: input.gatewaySignature,
        amount_minor: verification.amount_minor,
        status: verification.status,
        method: verification.method,
        gateway_payload: verification.raw,
      });

    return {
      success: false,
      order,
      message: 'Payment is not captured yet. Please complete the payment before accessing the course.',
    };
  }

  if (verification.amount_minor !== order.total_amount_minor) {
    console.error(
      `[orders] Amount mismatch for order ${order.id}: expected ${order.total_amount_minor}, got ${verification.amount_minor}`,
    );
    return {
      success: false,
      order,
      message: 'Payment amount does not match order total',
    };
  }

  // Parallelize order update + payment insert + coupon usage
  const [orderUpdateRes] = await Promise.all([
    admin
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
      .eq('id', order.id)
      .then(),
    admin
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
      })
      .then(),
  ]);

  if (order.coupon_code) {
    await recordCouponUsageForOrder(order);
  }

  const updateOrderError = orderUpdateRes as { error?: unknown } | undefined;

  if (updateOrderError?.error) {
    console.error('[orders] Failed to update order after verification:', updateOrderError.error);
    return { success: false, order, message: 'Failed to complete payment verification' };
  }

  if (order.purchaser_user_id) {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(`student-payment-history-${order.purchaser_user_id}`, 'max');
  }

  return {
    success: true,
    order,
    message: 'Payment verified successfully',
  };
}

// --- Order Query ----------------------------------------------------------------

export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as OrderWithItems;
}

export async function getOrderByGatewayOrderId(
  gatewayOrderId: string,
): Promise<OrderWithItems | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('gateway_order_id', gatewayOrderId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as OrderWithItems;
}

export async function recordCouponUsageForOrder(order: OrderRecord): Promise<void> {
  if (!order.coupon_code) {
    return;
  }

  const admin = createAdminClient();

  const { data: existingUsage } = await admin
    .from('coupon_usages')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle();

  if (existingUsage) {
    return;
  }

  const { data: couponData } = await admin
    .from('coupons')
    .select('id')
    .ilike('code', order.coupon_code)
    .maybeSingle();

  if (!couponData) {
    console.error('[orders] Coupon not found while recording usage', {
      orderId: order.id,
      couponCode: order.coupon_code,
    });
    return;
  }

  let purchaserEmail = order.purchaser_email?.trim() || '';
  if (!purchaserEmail && order.purchaser_user_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', order.purchaser_user_id)
      .maybeSingle();
    purchaserEmail = (profile as { email?: string } | null)?.email?.trim() || '';
  }
  if (!purchaserEmail) {
    console.error('[orders] Missing purchaser_email while recording coupon usage', {
      orderId: order.id,
      purchaserUserId: order.purchaser_user_id,
    });
    return;
  }

  await recordCouponUsage({
    couponId: (couponData as { id: string }).id,
    orderId: order.id,
    purchaserUserId: order.purchaser_user_id ?? undefined,
    purchaserEmail,
    discountAmountMinor: order.discount_amount_minor,
  });
}

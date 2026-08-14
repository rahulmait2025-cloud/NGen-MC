'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudentLearningCaches } from '@/lib/lms/revalidate-student-learning';
import { requireAuth } from '@/lib/auth/require-student-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOrder, verifyPayment, getOrderById, resolveCheckoutPricing } from '@/lib/services/orders';
import { provisionAccessAfterPurchase } from '@/lib/services/payment-entitlements';
import { RazorpayApiError } from '@/lib/payments/razorpay';
import { normUuid } from '@/lib/utils';
import { listStudentContentEntitlements } from '@/lib/services/course-access-manager';
import { buildBundleHref } from '@/lib/utils/bundle-routes';
import { validateCouponForCheckout } from '@/lib/services/coupons';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import type { ActionResponse } from '@/app/c/[collegeSlug]/student/(public)/pillars/[pillarSlug]/courses/[courseId]/actions';

export interface BundleCouponPreviewResponse {
  valid: boolean;
  couponCode?: string;
  originalAmountMinor: number;
  discountMinor: number;
  finalAmountMinor: number;
  message?: string;
}

async function studentHasBundleAccess(studentId: string, bundleId: string): Promise<boolean> {
  const entitlements = await listStudentContentEntitlements(studentId);
  return entitlements.some(
    (e) =>
      e.assigned_entity_type === 'bundle' &&
      normUuid(e.assigned_entity_id) === normUuid(bundleId) &&
      e.status === 'active',
  );
}

async function loadPublishedBundle(bundleSlug: string) {
  const sb = createAdminClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(bundleSlug);
  let query = sb
    .from('course_bundles')
    .select('id, slug, title, publish_status, lifecycle_status')
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active');
  query = isUuid ? query.eq('id', bundleSlug) : query.eq('slug', bundleSlug);
  const { data } = await query.maybeSingle();
  return data;
}

export async function createBundleOrderAction(
  collegeSlug: string,
  bundleSlug: string,
  couponCode?: string,
  pricePlanId?: string,
): Promise<ActionResponse> {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(collegeSlug);
    if (!runtime) return { ok: false, error: 'Unauthorized' };
    const isGlobal = runtime.tenant.isGlobal;
    if (!runtime.identity.email) {
      return { ok: false, error: 'User email not found. Please update your profile.' };
    }

    const rateLimitKey = `order:${runtime.student.studentId}`;
    const { ok: rateLimitOk } = await consumeRateLimit({ key: rateLimitKey, limit: 3, windowMs: 300_000 });
    if (!rateLimitOk) {
      return { ok: false, error: 'Too many requests. Please wait a moment before trying again.' };
    }

    const bundle = await loadPublishedBundle(bundleSlug);
    if (!bundle) {
      return { ok: false, error: 'This bundle is not available for purchase.' };
    }

    if (await studentHasBundleAccess(runtime.student.studentId, bundle.id as string)) {
      return { ok: false, error: 'You already have access to this bundle.' };
    }

    await resolveCheckoutPricing('course_bundle', bundle.id as string, pricePlanId);

    const result = await createOrder({
      entityType: 'course_bundle',
      entityId: bundle.id as string,
      purchaserEmail: runtime.identity.email,
      purchaserName: runtime.identity.fullName ?? undefined,
      purchaserUserId: runtime.identity.userId,
      source: 'lms',
      couponCode: couponCode?.trim() ? couponCode : undefined,
      pricePlanId: pricePlanId ?? null,
      metadata: {
        bundle_id: bundle.id,
        bundle_slug: bundle.slug,
        bundle_title: bundle.title,
        student_id: runtime.student.studentId,
        content_type: 'bundle',
        purchase_flow: isGlobal ? 'global_direct' : 'college_personal',
      },
    });

    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      console.error('[createBundleOrderAction] Razorpay order creation failed', {
        statusCode: error.statusCode,
        route: 'createBundleOrderAction',
      });
      if (error.statusCode === 401) {
        return {
          ok: false,
          error:
            'Payment gateway authentication failed. Check server Razorpay keys (RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET) and that checkout key matches the same test/live mode.',
        };
      }
      return { ok: false, error: 'Payment gateway authentication failed. Please try again later.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return { ok: false, error: message };
  }
}

export async function verifyBundlePaymentAction(
  collegeSlug: string,
  bundleSlug: string,
  payload: {
    orderId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  },
): Promise<ActionResponse> {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(collegeSlug);
    if (!runtime) return { ok: false, error: 'Unauthorized' };
    const isGlobal = runtime.tenant.isGlobal;
    const collegeId = isGlobal ? null : runtime.tenant.collegeId;

    if (!runtime.identity.email) {
      return { ok: false, error: 'User email not found.' };
    }

    const authContext = {
      user: {
        id: runtime.identity.userId,
        email: runtime.identity.email,
        fullName: runtime.identity.fullName ?? undefined,
      },
      studentId: runtime.student.studentId,
    };

    const bundle = await loadPublishedBundle(bundleSlug);
    if (!bundle) {
      return { ok: false, error: 'Bundle not found.' };
    }

    const order = await getOrderById(payload.orderId);
    if (!order) {
      return { ok: false, error: 'Order not found.' };
    }

    const { orderBelongsToAuthenticatedStudent } = await import('@/lib/orders/order-ownership');
    if (!orderBelongsToAuthenticatedStudent(order, authContext)) {
      return { ok: false, error: 'This order does not belong to you.' };
    }

    if (order.gateway_order_id !== payload.gatewayOrderId) {
      return { ok: false, error: 'Invalid order details.' };
    }

    if (order.entity_type !== 'course_bundle' || order.entity_id !== bundle.id) {
      return { ok: false, error: 'Order is for a different bundle.' };
    }

    const verifyResult = await verifyPayment({
      orderId: payload.orderId,
      gatewayOrderId: payload.gatewayOrderId,
      gatewayPaymentId: payload.gatewayPaymentId,
      gatewaySignature: payload.gatewaySignature,
    });

    if (!verifyResult.success) {
      return { ok: false, error: verifyResult.message };
    }

    const paidOrder = await getOrderById(payload.orderId);
    if (!paidOrder) {
      return { ok: false, error: 'Order not found after verification.' };
    }

    await provisionAccessAfterPurchase({
      order: paidOrder,
      studentUserId: runtime.student.studentId,
      studentEmail: runtime.identity.email,
      collegeId,
      metadata: {
        source: 'razorpay_sync_verify',
        paymentId: payload.gatewayPaymentId,
        bundle_id: bundle.id,
        bundle_slug: bundle.slug,
        purchased_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        razorpay_order_id: payload.gatewayOrderId,
      },
    });

    void (async () => {
      const { ensurePaymentSuccessSideEffects } = await import(
        '@/lib/lms/transactional-email/payment-success'
      );
      await ensurePaymentSuccessSideEffects({
        orderId: paidOrder.id,
        source: 'verify',
        authUserId: runtime.identity.userId,
        studentId: runtime.student.studentId,
        studentEmail: runtime.identity.email ?? undefined,
        collegeSlug,
        metadata: {
          bundle_id: bundle.id,
          bundle_slug: bundle.slug,
        },
      });
    })();

    revalidatePath(buildBundleHref(collegeSlug, bundle.slug as string));
    revalidatePath(`/c/${collegeSlug}/student/dashboard`);
    revalidateStudentLearningCaches(collegeSlug, runtime.student.studentId);

    return { ok: true, data: { orderId: verifyResult.order.id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return { ok: false, error: message };
  }
}

export async function validateBundleCouponPreviewAction(
  collegeSlug: string,
  bundleSlug: string,
  input: { couponCode: string; pricePlanId?: string },
): Promise<ActionResponse<BundleCouponPreviewResponse>> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    const limited = await consumeRateLimit({
      key: `coupon-validate:${auth.user.id}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return { ok: false, error: 'Too many attempts. Please try again in a moment.' };
    }

    const bundle = await loadPublishedBundle(bundleSlug);
    if (!bundle) {
      return { ok: false, error: 'Bundle not found.' };
    }

    const pricing = await resolveCheckoutPricing(
      'course_bundle',
      bundle.id as string,
      input.pricePlanId,
    );

    const result = await validateCouponForCheckout({
      couponCode: input.couponCode,
      purchaserUserId: auth.user.id,
      studentId: auth.studentId,
      entityType: 'course_bundle',
      entityId: bundle.id as string,
      pricePlanId: input.pricePlanId ?? pricing.bundlePricePlanId,
      originalAmountMinor: pricing.baseAmountMinor,
      currency: pricing.currency,
      collegeId,
      purchaserEmail: auth.user.email ?? undefined,
    });

    return {
      ok: true,
      data: {
        valid: result.valid,
        couponCode: result.couponCode,
        originalAmountMinor: result.breakdown.originalAmountMinor,
        discountMinor: result.breakdown.discountMinor,
        finalAmountMinor: result.breakdown.finalAmountMinor,
        message: result.message,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate coupon';
    return { ok: false, error: message };
  }
}

export async function enrollFreeBundleAction(
  collegeSlug: string,
  bundleSlug: string,
): Promise<ActionResponse> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false, error: 'Unauthorized' };
    if (!auth.user.email) {
      return { ok: false, error: 'User email not found.' };
    }

    const bundle = await loadPublishedBundle(bundleSlug);
    if (!bundle) {
      return { ok: false, error: 'This bundle is not available.' };
    }

    if (await studentHasBundleAccess(auth.studentId, bundle.id as string)) {
      return { ok: false, error: 'You already have access to this bundle.' };
    }

    const pricing = await resolveCheckoutPricing('course_bundle', bundle.id as string);
    if (pricing.baseAmountMinor > 0) {
      return { ok: false, error: 'This bundle is not free.' };
    }

    const sb = createAdminClient();
    const nowIso = new Date().toISOString();
    const validUntil =
      pricing.validityDays != null
        ? new Date(Date.now() + pricing.validityDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { error } = await sb.from('student_content_entitlements').insert({
      student_id: auth.studentId,
      assigned_entity_type: 'bundle',
      assigned_entity_id: bundle.id,
      source_type: 'b2c_direct',
      status: 'active',
      valid_from: nowIso,
      valid_until: validUntil,
      metadata: {
        source: 'free_bundle_enrollment',
        bundle_slug: bundle.slug,
        enrolled_at: nowIso,
        bundle_price_plan_id: pricing.bundlePricePlanId,
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(buildBundleHref(collegeSlug, bundle.slug as string));
    revalidatePath(`/c/${collegeSlug}/student/dashboard`);
    revalidateStudentLearningCaches(collegeSlug, auth.studentId);

    return { ok: true, data: { success: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enroll in bundle';
    return { ok: false, error: message };
  }
}

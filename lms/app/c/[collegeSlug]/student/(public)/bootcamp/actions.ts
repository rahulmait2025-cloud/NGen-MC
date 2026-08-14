'use server';

import { after } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateStudentLearningCaches, revalidateBootcampCatalogCaches } from '@/lib/lms/revalidate-student-learning';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOrder, verifyPayment, getOrderById } from '@/lib/services/orders';
import { provisionAccessAfterPurchase } from '@/lib/services/payment-entitlements';
import { RazorpayApiError } from '@/lib/payments/razorpay';
import {
  getJobReadyBootcampProduct,
  isStudentEnrolledInJobReadyBootcamp,
} from '@/lib/services/job-ready-bootcamp';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';
import {
  buildBootcampLandingHref,
  buildBootcampPaymentSuccessHref,
} from '@/lib/student/bootcamp-routes';
import { studentBasePath } from '@/lib/student/student-home-route';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import type { ActionResponse } from '@/app/c/[collegeSlug]/student/(public)/pillars/[pillarSlug]/courses/[courseId]/actions';
import type { OrderCreationResult } from '@/lib/services/orders';
import type { EntitlementGrantResult } from '@/lib/services/payment-entitlements';
import type { StudentAuthContext } from '@/lib/auth/require-student-action';

function summarizeProvisionResults(results: EntitlementGrantResult[]) {
  const primary = results[0];
  return {
    success: results.some((r) => r.success),
    results,
    entitlementId: primary?.entitlementId,
    alreadyExists: primary?.alreadyExists ?? false,
    message: primary?.message,
  };
}

async function provisionBootcampEnrollment(
  orderId: string,
  auth: StudentAuthContext,
  collegeId: string | null,
  paymentId: string,
  gatewayOrderId: string,
  product: { id: string; slug: string },
) {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error('Order not found after payment verification.');
  }

  const provisionResult = await provisionAccessAfterPurchase({
    order,
    studentUserId: auth.studentId,
    studentEmail: auth.user.email!,
    collegeId,
    metadata: {
      source: 'razorpay_sync_verify',
      paymentId,
      purchased_at: order.paid_at ?? new Date().toISOString(),
      verified_at: new Date().toISOString(),
      bootcamp_id: product.id,
      bootcamp_slug: product.slug,
      razorpay_order_id: gatewayOrderId,
    },
  });

  const summary = summarizeProvisionResults(provisionResult.results);

  after(() => console.info('[bootcamp/payment] enrollment provisioned', {
    orderId: order.id,
    itemCount: order.order_items?.length ?? 0,
    success: summary.success,
    entitlementId: summary.entitlementId,
    alreadyExists: summary.alreadyExists,
    message: summary.message,
    failures: provisionResult.results.reduce((acc, r) => {
      if (!r.success) acc.push(r.message);
      return acc;
    }, [] as string[]),
  }));

  if (!summary.success) {
    throw new Error(summary.message ?? 'Failed to create Job Ready Bootcamp enrollment.');
  }

  return summary;
}

function revalidateBootcampPaths(collegeSlug: string, studentId: string) {
  const base = studentBasePath(collegeSlug);
  revalidatePath(`${base}/bootcamp`);
  revalidatePath(`${base}/my-courses/job-ready-bootcamp`);
  revalidatePath(`${base}/dashboard`);
  revalidateTag(`student-entitlements:${collegeSlug}`, 'max');
  revalidateStudentLearningCaches(collegeSlug, studentId);
  revalidateBootcampCatalogCaches(collegeSlug);
}

async function runBootcampPaymentSuccessSideEffects(
  orderId: string,
  auth: StudentAuthContext,
  collegeSlug: string,
  bootcampId: string,
  bootcampSlug: string,
): Promise<void> {
  const { ensurePaymentSuccessSideEffects } = await import(
    '@/lib/lms/transactional-email/payment-success'
  );

  const result = await ensurePaymentSuccessSideEffects({
    orderId,
    source: 'verify',
    authUserId: auth.user.id,
    studentId: auth.studentId,
    studentEmail: auth.user.email ?? undefined,
    collegeSlug,
    metadata: {
      bootcamp_id: bootcampId,
      bootcamp_slug: bootcampSlug,
      source_type: 'job_ready_bootcamp',
    },
  });

  after(() => console.info('[bootcamp/payment] side effects', {
    orderId,
    invoiceId: result.invoiceId,
    emailsQueued: result.emailsQueued,
    errors: result.errors,
  }));
}

export async function createJobReadyBootcampOrderAction(
  collegeSlug: string,
  couponCode?: string,
  pricePlanId?: string,
): Promise<ActionResponse<OrderCreationResult>> {
  try {
    if (!(await isJobReadyBootcampFeatureEnabled())) {
      return { ok: false, error: 'Job Ready Bootcamp is currently unavailable.' };
    }

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

    const product = await getJobReadyBootcampProduct();
    if (!product?.price_minor) {
      return { ok: false, error: 'Job Ready Bootcamp pricing is not configured yet.' };
    }

    if (await isStudentEnrolledInJobReadyBootcamp(runtime.student.studentId, isGlobal ? null : runtime.tenant.collegeId)) {
      return { ok: false, error: 'You are already enrolled in Job Ready Bootcamp.' };
    }

    const result = await createOrder({
      entityType: 'job_ready_bootcamp',
      entityId: product.id,
      purchaserEmail: runtime.identity.email,
      purchaserName: runtime.identity.fullName ?? undefined,
      purchaserUserId: runtime.identity.userId,
      source: 'lms',
      couponCode: couponCode?.trim() ? couponCode : undefined,
      pricePlanId: pricePlanId ?? product.price_plan_id,
      metadata: {
        bootcamp_id: product.id,
        bootcamp_slug: product.slug,
        bootcamp_title: product.title,
        student_id: runtime.student.studentId,
        content_type: 'job_ready_bootcamp',
        purchase_flow: isGlobal ? 'global_direct' : 'college_personal',
        source_type: 'job_ready_bootcamp',
        validity_days: product.validity_days,
      },
    });

    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      return { ok: false, error: 'Payment gateway error. Please try again later.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return { ok: false, error: message };
  }
}

export async function verifyJobReadyBootcampPaymentAction(
  collegeSlug: string,
  payload: {
    orderId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  },
): Promise<ActionResponse> {
  try {
    if (!(await isJobReadyBootcampFeatureEnabled())) {
      return { ok: false, error: 'Job Ready Bootcamp is currently unavailable.' };
    }

    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(collegeSlug);
    if (!runtime) return { ok: false, error: 'Unauthorized' };
    const isGlobal = runtime.tenant.isGlobal;
    const collegeId = isGlobal ? null : runtime.tenant.collegeId;

    if (!runtime.identity.email) {
      return { ok: false, error: 'User email not found.' };
    }

    const authContext: StudentAuthContext = {
      user: {
        id: runtime.identity.userId,
        email: runtime.identity.email ?? null,
        fullName: runtime.identity.fullName ?? null,
        isActive: true,
      },
      membership: {
        id: runtime.student.membershipId || '',
        collegeId: runtime.tenant.collegeId || '',
        role: 'student',
        status: runtime.student.membershipStatus || 'active',
      },
      studentId: runtime.student.studentId,
      tenant: {
        id: runtime.tenant.collegeId || '',
        name: collegeSlug,
        slug: collegeSlug,
        shortName: collegeSlug,
        logoUrl: null,
        primaryColor: null,
        secondaryColor: null,
      },
      isGlobal,
      collegeId,
    };

    const product = await getJobReadyBootcampProduct();
    if (!product) {
      return { ok: false, error: 'Job Ready Bootcamp product not found.' };
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

    if (order.entity_type !== 'job_ready_bootcamp' || order.entity_id !== product.id) {
      return { ok: false, error: 'Order is for a different product.' };
    }

    const sb = createAdminClient();
    const { data: existingPayment } = await sb
      .from('payments')
      .select('id, order_id, status')
      .eq('gateway_payment_id', payload.gatewayPaymentId)
      .not('status', 'eq', 'failed')
      .limit(10);

    const paymentUsedElsewhere = (existingPayment ?? []).some(
      (payment) => (payment as { order_id: string }).order_id !== payload.orderId,
    );

    if (paymentUsedElsewhere) {
      return { ok: false, error: 'This payment has already been processed.' };
    }

    const paymentsForThisOrder = (existingPayment ?? []).filter(
      (payment) => (payment as { order_id: string }).order_id === payload.orderId,
    );

    const alreadyProcessedForThisOrder =
      paymentsForThisOrder.length > 0 ||
      (order.status === 'paid' && order.gateway_payment_id === payload.gatewayPaymentId);

    if (alreadyProcessedForThisOrder) {
      await provisionBootcampEnrollment(
        order.id,
        authContext,
        collegeId,
        payload.gatewayPaymentId,
        payload.gatewayOrderId,
        product,
      );

      after(() => console.info('[bootcamp/payment] idempotent verify', {
        orderId: order.id,
        paymentId: payload.gatewayPaymentId,
      }));

      void runBootcampPaymentSuccessSideEffects(
        order.id,
        authContext,
        collegeSlug,
        product.id,
        product.slug,
      );

      revalidateBootcampPaths(collegeSlug, runtime.student.studentId);

      return {
        ok: true,
        data: {
          redirectHref: buildBootcampPaymentSuccessHref(collegeSlug),
          landingHref: buildBootcampLandingHref(collegeSlug),
        },
      };
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

    after(() => console.info('[bootcamp/payment] payment verified', {
      orderId: order.id,
      paymentId: payload.gatewayPaymentId,
      studentId: runtime.student.studentId,
    }));

    await provisionBootcampEnrollment(
      order.id,
      authContext,
      collegeId,
      payload.gatewayPaymentId,
      payload.gatewayOrderId,
      product,
    );

    void runBootcampPaymentSuccessSideEffects(
      order.id,
      authContext,
      collegeSlug,
      product.id,
      product.slug,
    );

    revalidateBootcampPaths(collegeSlug, runtime.student.studentId);

    return {
      ok: true,
      data: {
        redirectHref: buildBootcampPaymentSuccessHref(collegeSlug),
        landingHref: buildBootcampLandingHref(collegeSlug),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return { ok: false, error: message };
  }
}

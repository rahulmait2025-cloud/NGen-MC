'use server';

/**
 * Course Purchase Server Actions (Phase 5 - College Student Purchase Support).
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateStudentLearningCaches } from '@/lib/lms/revalidate-student-learning';
import { normUuid } from '@/lib/utils';
import { requireAuth } from '@/lib/auth/require-student-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOrder, verifyPayment, getOrderById, resolveCheckoutPricing } from '@/lib/services/orders';
import { validateCouponForCheckout } from '@/lib/services/coupons';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { RazorpayApiError } from '@/lib/payments/razorpay';
import { provisionAccessAfterPurchase } from '@/lib/services/payment-entitlements';
import { grantEntitlement, hasActiveCourseEntitlement } from '@/lib/services/course-access-manager';
import { getVariantPurchaseInfo } from '@/lib/services/variant-purchase';
import {
  hasExactPaidProductEnrollment,
  studentHasExactVariantProductEnrollment,
} from '@/lib/services/paid-product-enrollment';
import {
  LEGACY_BOOTCAMP_PILLAR_SLUG,
  isPaidCourseBuilderCourse,
  resolvePaidCourseSourceType,
  type PaidCourseSourceType,
} from '@/lib/services/paid-course-catalog';
import { applyMasterCourseKeyFilter } from '@/lib/utils/master-course-key';
import type { SellableEntityType } from '@/types/payments';
import type { StudentAuthContext } from '@/lib/auth/require-student-action';

export interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function resolvePaidCoursePricing(
  course: {
    id: string;
    selling_price: number | null;
    currency: string | null;
    is_free: boolean | null;
    pricing_model: string | null;
  },
  courseId: string,
  pricePlanId?: string,
): Promise<{ priceMinor: number; currency: string } | null> {
  const sb = createAdminClient();

  if (pricePlanId) {
    const { data: plan } = await sb
      .from('course_price_plans')
      .select('id, price_minor, currency')
      .eq('id', pricePlanId)
      .eq('master_course_id', courseId)
      .eq('is_active', true)
      .maybeSingle();

    if (!plan) return null;

    return {
      priceMinor: (plan as { price_minor: number }).price_minor,
      currency: (plan as { currency: string }).currency ?? 'INR',
    };
  }

  if (course.selling_price && !course.is_free && course.pricing_model !== 'free') {
    return {
      priceMinor: course.selling_price,
      currency: course.currency ?? 'INR',
    };
  }

  const { data: variant } = await sb
    .from('course_variants')
    .select('id, selling_price, currency')
    .eq('master_course_id', courseId)
    .eq('publish_status', 'published')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!variant || !(variant as { selling_price: number }).selling_price) return null;

  return {
    priceMinor: (variant as { selling_price: number }).selling_price,
    currency: (variant as { currency: string }).currency ?? 'INR',
  };
}

/**
 * Validate pillar and course independently, respecting student-type visibility.
 */
async function validatePillarAndCourse(
  pillarSlug: string,
  courseId: string,
  ctx: { isGlobal: boolean; collegeId: string | null; studentId: string },
  pricePlanId?: string,
): Promise<{
  pillarId: string;
  pillarTitle: string;
  courseId: string;
  priceMinor: number;
  currency: string;
  courseSourceType: PaidCourseSourceType;
} | null> {
  const sb = createAdminClient();
  const visibilityField = ctx.isGlobal ? 'visible_to_global_students' : 'visible_to_college_students';

  // Paid Course Builder virtual pillar (legacy slug: bootcamp)
  if (pillarSlug === LEGACY_BOOTCAMP_PILLAR_SLUG || pillarSlug === 'bootcamp') {
    return validateBootcampAndCourse(courseId, ctx, pricePlanId);
  }

  // 1. Validate pillar exists, published, and student-type-visible
  const { data: pillar } = await sb
    .from('master_course_pillars')
    .select('id, title')
    .eq('slug', pillarSlug)
    .eq('publish_status', 'published')
    .eq(visibilityField, true)
    .maybeSingle();

  if (!pillar) return null;
  const pillarId = (pillar as { id: string }).id;
  const pillarTitle = (pillar as { title: string }).title;

  // 2. Validate course exists, belongs to this pillar, published, and student-type-visible
  const { data: course } = await applyMasterCourseKeyFilter(
    sb
      .from('master_courses')
      .select('id, selling_price, currency, is_free, pricing_model, catalog_type, bootcamp_id, show_as_paid_course')
      .eq('pillar_id', pillarId)
      .eq('publish_status', 'published')
      .eq(visibilityField, true),
    courseId,
  ).maybeSingle();

  if (!course) return null;

  const resolvedCourseId = course.id as string;

  if (course.is_free || course.pricing_model === 'free') {
    return {
      pillarId,
      pillarTitle,
      courseId: resolvedCourseId,
      priceMinor: 0,
      currency: course.currency ?? 'INR',
      courseSourceType: resolvePaidCourseSourceType(course),
    };
  }

  if (!isPaidCourseBuilderCourse(course) && !course.show_as_paid_course) {
    return null;
  }

  // 3. For college students: check if already assigned (shouldn't purchase assigned course)
  if (!ctx.isGlobal && ctx.collegeId) {
    const assignedIds = await resolveCollegeAssignedCourseIdsStatic(ctx.collegeId);
    const want = normUuid(resolvedCourseId);
    if (assignedIds.some((id) => normUuid(id) === want)) {
      return null;
    }
  }

  const pricing = await resolvePaidCoursePricing(course, resolvedCourseId, pricePlanId);
  if (!pricing) return null;

  return {
    pillarId,
    pillarTitle,
    courseId: resolvedCourseId,
    priceMinor: pricing.priceMinor,
    currency: pricing.currency,
    courseSourceType: resolvePaidCourseSourceType(course),
  };
}

/**
 * Static version for use in validatePillarAndCourse (no closure dependencies).
 */
async function resolveCollegeAssignedCourseIdsStatic(collegeId: string): Promise<string[]> {
  const { resolveCollegeAssignedCourseIds } = await import('@/lib/services/course-access-manager');
  return resolveCollegeAssignedCourseIds(collegeId);
}

async function validatePillarAndCourseVisibility(
  pillarSlug: string,
  courseId: string,
  ctx: { isGlobal: boolean; collegeId: string | null },
): Promise<{ pillarId: string; pillarTitle: string; courseId: string } | null> {
  const sb = createAdminClient();
  const visibilityField = ctx.isGlobal ? 'visible_to_global_students' : 'visible_to_college_students';
  if (pillarSlug === 'bootcamp') {
    return validateBootcampAndCourseVisibility(courseId, ctx);
  }

  const { data: pillar } = await sb
    .from('master_course_pillars')
    .select('id, title')
    .eq('slug', pillarSlug)
    .eq('publish_status', 'published')
    .eq(visibilityField, true)
    .maybeSingle();

  if (!pillar) return null;

  const { data: course } = await applyMasterCourseKeyFilter(
    sb
      .from('master_courses')
      .select('id')
      .eq('pillar_id', (pillar as { id: string }).id)
      .eq('publish_status', 'published')
      .eq(visibilityField, true),
    courseId,
  ).maybeSingle();

  if (!course) return null;

  const resolvedCourseId = (course as { id: string }).id;

  if (!ctx.isGlobal && ctx.collegeId) {
    const assignedIds = await resolveCollegeAssignedCourseIdsStatic(ctx.collegeId);
    const want = normUuid(resolvedCourseId);
    if (assignedIds.some((id) => normUuid(id) === want)) {
      return null;
    }
  }

  return {
    pillarId: (pillar as { id: string }).id,
    pillarTitle: (pillar as { title: string }).title,
    courseId: resolvedCourseId,
  };
}

async function validateVariantPurchaseContext(
  pillarSlug: string,
  masterCourseId: string,
  variantId: string,
  ctx: { isGlobal: boolean; collegeId: string | null; studentId: string },
  pricePlanId?: string,
): Promise<{
  pillarId: string;
  pillarTitle: string;
  courseId: string;
  variantId: string;
  priceMinor: number;
  currency: string;
} | null> {
  const pillarCourse = await validatePillarAndCourseVisibility(pillarSlug, masterCourseId, ctx);
  if (!pillarCourse) return null;

  const variantInfo = await getVariantPurchaseInfo(
    variantId,
    masterCourseId,
    ctx.collegeId,
  );
  if (!variantInfo) return null;

  if (pricePlanId) {
    const plan = variantInfo.pricePlans.find((p) => p.id === pricePlanId);
    if (!plan) return null;
    return {
      pillarId: pillarCourse.pillarId,
      pillarTitle: pillarCourse.pillarTitle,
      courseId: masterCourseId,
      variantId: variantInfo.variantId,
      priceMinor: plan.price_minor,
      currency: plan.currency,
    };
  }

  return {
    pillarId: pillarCourse.pillarId,
    pillarTitle: pillarCourse.pillarTitle,
    courseId: masterCourseId,
    variantId: variantInfo.variantId,
    priceMinor: variantInfo.priceMinor,
    currency: variantInfo.currency,
  };
}

async function studentHasExactVariantEnrollment(
  studentId: string,
  variantId: string,
): Promise<boolean> {
  return studentHasExactVariantProductEnrollment(studentId, variantId);
}

/**
 * Enroll in a free course.
 */
export async function enrollFreeCourseAction(
  collegeSlug: string,
  pillarSlug: string,
  courseId: string,
): Promise<ActionResponse> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    if (!auth.user.email) {
      return { ok: false, error: 'User email not found.' };
    }

    const studentCtx = {
      isGlobal,
      collegeId,
      studentId: auth.studentId,
    };

    const validated = await validatePillarAndCourse(pillarSlug, courseId, studentCtx);
    if (!validated) {
      return { ok: false, error: 'This course is no longer available.' };
    }

    const sb = createAdminClient();
    const { data: course } = await sb
      .from('master_courses')
      .select('id, is_free, pricing_model')
      .eq('id', courseId)
      .single();

    if (!course || !(course.is_free || course.pricing_model === 'free')) {
      return { ok: false, error: 'This course is not free.' };
    }

    const alreadyEnrolled = await hasActiveCourseEntitlement(auth.studentId, courseId, isGlobal);
    if (alreadyEnrolled) {
      return { ok: true, data: { success: true, alreadyEnrolled: true } };
    }

    await grantEntitlement({
      student_id: auth.studentId,
      master_course_id: courseId,
      source_type: 'b2c_direct',
      college_id: collegeId ?? undefined,
      metadata: {
        enrollment_type: 'free',
        pillar_slug: pillarSlug,
        enrolled_at: new Date().toISOString(),
      },
    });

    revalidatePath(`/c/${collegeSlug}/student/pillars`);
    revalidatePath(`/c/${collegeSlug}/student/pillars/${pillarSlug}/courses/${courseId}`, 'page');
    revalidateStudentLearningCaches(collegeSlug, auth.studentId);

    return { ok: true, data: { success: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enroll in free course';
    return { ok: false, error: message };
  }
}

/**
 * Create a purchase order for a course.
 * Works for both global and college students. College students must not already have the course assigned.
 */
export interface CouponPreviewResponse {
  valid: boolean;
  message?: string;
  originalAmountMinor: number;
  discountMinor: number;
  finalAmountMinor: number;
  couponCode?: string;
}

/**
 * Preview coupon discount for checkout (no Razorpay order created).
 */
export async function validateCouponPreviewAction(
  collegeSlug: string,
  pillarSlug: string,
  courseId: string,
  input: { couponCode: string; pricePlanId?: string; variantId?: string },
): Promise<ActionResponse<CouponPreviewResponse>> {
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

    if (!auth.user.email) {
      return { ok: false, error: 'User email not found.' };
    }

    const studentCtx = {
      isGlobal,
      collegeId,
      studentId: auth.studentId,
    };

    let entityType: SellableEntityType = 'master_course';
    let entityId = courseId;
    let originalAmountMinor: number;
    let currency: string;

    if (input.variantId) {
      const variantCtx = await validateVariantPurchaseContext(
        pillarSlug,
        courseId,
        input.variantId,
        studentCtx,
        input.pricePlanId,
      );
      if (!variantCtx) {
        return { ok: false, error: 'This course variant is not available for purchase.' };
      }
      entityType = 'course_variant';
      entityId = variantCtx.variantId;
      originalAmountMinor = variantCtx.priceMinor;
      currency = variantCtx.currency;
    } else {
      const validated = await validatePillarAndCourse(
        pillarSlug,
        courseId,
        studentCtx,
        input.pricePlanId,
      );
      if (!validated) {
        return { ok: false, error: 'This course is not available for purchase.' };
      }

      const pricing = await resolveCheckoutPricing(
        'master_course',
        validated.courseId,
        input.pricePlanId ?? null,
      );
      entityId = validated.courseId;
      originalAmountMinor = pricing.baseAmountMinor;
      currency = pricing.currency;
    }

    const result = await validateCouponForCheckout({
      couponCode: input.couponCode,
      purchaserUserId: auth.user.id,
      studentId: auth.studentId,
      entityType,
      entityId,
      pricePlanId: input.pricePlanId ?? null,
      originalAmountMinor,
      currency,
      collegeId,
      purchaserEmail: auth.user.email,
    });

    return {
      ok: true,
      data: {
        valid: result.valid,
        message: result.message,
        originalAmountMinor: result.breakdown.originalAmountMinor,
        discountMinor: result.breakdown.discountMinor,
        finalAmountMinor: result.breakdown.finalAmountMinor,
        couponCode: result.couponCode,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate coupon';
    return { ok: false, error: message };
  }
}

export async function createGlobalCourseOrderAction(
  collegeSlug: string,
  pillarSlug: string,
  courseId: string,
  pricePlanId?: string,
  couponCode?: string,
  variantId?: string,
): Promise<ActionResponse> {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(collegeSlug);
    if (!runtime) return { ok: false, error: 'Unauthorized' };
    const isGlobal = runtime.tenant.isGlobal;
    const collegeId = isGlobal ? null : runtime.tenant.collegeId;

    if (!runtime.identity.email) {
      return { ok: false, error: 'User email not found. Please update your profile.' };
    }

    const rateLimitKey = `order:${runtime.student.studentId}`;
    const { ok: rateLimitOk } = await consumeRateLimit({ key: rateLimitKey, limit: 3, windowMs: 300_000 });
    if (!rateLimitOk) {
      return { ok: false, error: 'Too many requests. Please wait a moment before trying again.' };
    }

    const studentCtx = {
      isGlobal,
      collegeId,
      studentId: runtime.student.studentId,
    };

    let entityType: SellableEntityType = 'master_course';
    let entityId = courseId;
    let validatedPillarId: string;
    let validatedPillarTitle: string;
    let courseSourceType: PaidCourseSourceType = 'master_course';

    if (variantId) {
      const variantCtx = await validateVariantPurchaseContext(
        pillarSlug,
        courseId,
        variantId,
        studentCtx,
        pricePlanId,
      );
      if (!variantCtx) {
        return { ok: false, error: 'This course variant is not available for purchase.' };
      }

      const alreadyPurchased = await studentHasExactVariantEnrollment(
        runtime.student.studentId,
        variantId,
      );
      if (alreadyPurchased) {
        return { ok: false, error: 'You already purchased this course variant.' };
      }

      entityType = 'course_variant';
      entityId = variantCtx.variantId;
      validatedPillarId = variantCtx.pillarId;
      validatedPillarTitle = variantCtx.pillarTitle;
      courseSourceType = 'course_variant';
    } else {
      const validated = await validatePillarAndCourse(
        pillarSlug,
        courseId,
        studentCtx,
        pricePlanId,
      );
      if (!validated) {
        return { ok: false, error: 'This course is not available for purchase.' };
      }

      const alreadyPurchased = await hasExactPaidProductEnrollment({
        userId: runtime.student.studentId,
        sourceType: courseSourceType,
        sourceId: validated.courseId,
        masterCourseId: validated.courseId,
        context: { isGlobal, collegeId },
      });
      if (alreadyPurchased) {
        return { ok: false, error: 'You already purchased this course.' };
      }

      entityId = validated.courseId;
      validatedPillarId = validated.pillarId;
      validatedPillarTitle = validated.pillarTitle;
      courseSourceType = validated.courseSourceType;
    }

    const metadata: Record<string, unknown> = {
      pillar_id: validatedPillarId,
      pillar_slug: pillarSlug,
      pillar_title: validatedPillarTitle,
      course_id: courseId,
      course_source_type: courseSourceType,
      course_source_id: courseSourceType === 'course_variant' ? entityId : courseId,
      source_type: courseSourceType,
      source_id: entityId,
      student_id: runtime.student.studentId,
      purchase_flow: isGlobal ? 'global_direct' : 'college_personal',
    };

    if (variantId) {
      metadata.variant_id = variantId;
    }

    if (pricePlanId) {
      metadata.price_plan_id = pricePlanId;
    }

    const result = await createOrder({
      entityType,
      entityId,
      purchaserEmail: runtime.identity.email,
      purchaserName: runtime.identity.fullName ?? undefined,
      purchaserUserId: runtime.identity.userId,
      source: 'lms',
      pricePlanId: pricePlanId ?? null,
      couponCode: couponCode?.trim() ? couponCode : undefined,
      metadata,
    });

    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      console.error('[createGlobalCourseOrderAction] Razorpay order creation failed', {
        statusCode: error.statusCode,
        route: 'createGlobalCourseOrderAction',
      });
      if (error.statusCode === 401) {
        return {
          ok: false,
          error:
            'Payment gateway authentication failed. Check server Razorpay keys (RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET) and that checkout key matches the same test/live mode.',
        };
      }
    }
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return { ok: false, error: message };
  }
}

/**
 * Verify a payment and grant access.
 * Works for both global and college students.
 */
export async function verifyGlobalCoursePaymentAction(
  collegeSlug: string,
  pillarSlug: string,
  courseId: string,
  payload: {
    orderId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  },
  variantId?: string,
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

    // 2. Load order and validate ownership
    const order = await getOrderById(payload.orderId);
    if (!order) {
      return { ok: false, error: 'Order not found.' };
    }

    // 3. Validate order belongs to authenticated student
    const { orderBelongsToAuthenticatedStudent } = await import('@/lib/orders/order-ownership');
    if (!orderBelongsToAuthenticatedStudent(order, authContext)) {
      return { ok: false, error: 'This order does not belong to you.' };
    }

    // 4. Validate stored Razorpay order id matches client order id
    if (order.gateway_order_id !== payload.gatewayOrderId) {
      return { ok: false, error: 'Invalid order details.' };
    }

    // 5. Validate order item course matches requested course
    const orderItem = order.order_items?.[0];
    if (!orderItem) {
      return { ok: false, error: 'Invalid order items.' };
    }

    const metadataCourseId = (order.metadata as Record<string, unknown>)?.course_id as string | undefined;
    const metadataVariantId = (order.metadata as Record<string, unknown>)?.variant_id as string | undefined;
    const expectedVariantId = variantId ?? metadataVariantId;

    if (expectedVariantId) {
      const isVariantOrder =
        order.entity_type === 'course_variant' && order.entity_id === expectedVariantId;
      const parentMatches = metadataCourseId === courseId;
      if (!isVariantOrder || !parentMatches) {
        return { ok: false, error: 'Order is for a different variant.' };
      }
    } else {
      const isDirectMatch = order.entity_type === 'master_course' && order.entity_id === courseId;
      const isMetadataMatch = metadataCourseId === courseId;
      if (!isDirectMatch && !isMetadataMatch) {
        return { ok: false, error: 'Order is for a different course.' };
      }
    }

    const studentCtx = {
      isGlobal,
      collegeId,
      studentId: runtime.student.studentId,
    };

    let validated: {
      pillarId: string;
      pillarTitle: string;
      courseId: string;
      priceMinor: number;
      currency: string;
    } | null;

    if (expectedVariantId) {
      validated = await validateVariantPurchaseContext(
        pillarSlug,
        courseId,
        expectedVariantId,
        studentCtx,
      );
    } else {
      validated = await validatePillarAndCourse(
        pillarSlug,
        courseId,
        studentCtx,
        order.price_plan_id ?? undefined,
      );
    }

    if (!validated) {
      return { ok: false, error: 'This course is no longer available.' };
    }

    // 7. Check payment_id not already used for another order (via duplicate verification)
    const sb = createAdminClient();
    const { data: existingPayment } = await sb
      .from('payments')
      .select('id, order_id, status')
      .eq('gateway_payment_id', payload.gatewayPaymentId)
      .not('status', 'eq', 'failed')
      .limit(10);

    const paymentsForThisOrder = (existingPayment ?? []).filter(
      (payment) => (payment as { order_id: string }).order_id === payload.orderId,
    );
    const paymentUsedElsewhere = (existingPayment ?? []).some(
      (payment) => (payment as { order_id: string }).order_id !== payload.orderId,
    );

    if (paymentUsedElsewhere) {
      return { ok: false, error: 'This payment has already been processed.' };
    }

    const alreadyProcessedForThisOrder =
      paymentsForThisOrder.length > 0 ||
      (order.status === 'paid' && order.gateway_payment_id === payload.gatewayPaymentId);

    if (alreadyProcessedForThisOrder) {
      await provisionAccessAfterPurchase({
        order,
        studentUserId: runtime.student.studentId,
        studentEmail: runtime.identity.email,
        collegeId: collegeId,
        metadata: {
          source: 'razorpay_sync_verify',
          paymentId: payload.gatewayPaymentId,
          purchased_at: order.paid_at ?? new Date().toISOString(),
          verified_at: order.paid_at ?? new Date().toISOString(),
          pillar_id: validated.pillarId,
          pillar_slug: pillarSlug,
          course_id: courseId,
          variant_id: expectedVariantId,
          razorpay_order_id: payload.gatewayOrderId,
        },
      });

      void runPaymentSuccessSideEffects(order.id, authContext, collegeSlug, pillarSlug, courseId);

      revalidatePath(`/c/${collegeSlug}/student/pillars`);
      revalidatePath(`/c/${collegeSlug}/student/pillars/${pillarSlug}/courses/${courseId}`, 'page');
      revalidateStudentLearningCaches(collegeSlug, runtime.student.studentId);
      revalidateTag(`course-price-plans:${courseId}`, 'max');

      return { ok: true, data: { success: true } };
    }

    // 8. Verify payment server-side (signature verification)
    const verifyResult = await verifyPayment({
      orderId: payload.orderId,
      gatewayOrderId: payload.gatewayOrderId,
      gatewayPaymentId: payload.gatewayPaymentId,
      gatewaySignature: payload.gatewaySignature,
    });

    if (!verifyResult.success) {
      return { ok: false, error: verifyResult.message };
    }

    // 9. Provision access with correct collegeId context
    await provisionAccessAfterPurchase({
      order: order,
      studentUserId: runtime.student.studentId,
      studentEmail: runtime.identity.email,
      collegeId: collegeId,
      metadata: {
        source: 'razorpay_sync_verify',
        paymentId: payload.gatewayPaymentId,
        purchased_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        pillar_id: validated.pillarId,
        pillar_slug: pillarSlug,
        course_id: courseId,
        variant_id: expectedVariantId,
        razorpay_order_id: payload.gatewayOrderId,
      },
    });

    void runPaymentSuccessSideEffects(order.id, authContext, collegeSlug, pillarSlug, courseId);

    revalidatePath(`/c/${collegeSlug}/student/pillars`);
    revalidatePath(`/c/${collegeSlug}/student/pillars/${pillarSlug}/courses/${courseId}`, 'page');
    revalidateStudentLearningCaches(collegeSlug, runtime.student.studentId);
    revalidateTag(`course-price-plans:${courseId}`, 'max');

    return { ok: true, data: { success: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    return { ok: false, error: message };
  }
}

async function runPaymentSuccessSideEffects(
  orderId: string,
  ctx: StudentAuthContext,
  collegeSlug: string,
  pillarSlug: string,
  courseId: string,
): Promise<void> {
  const { ensurePaymentSuccessSideEffects } = await import(
    '@/lib/lms/transactional-email/payment-success'
  );
  void ensurePaymentSuccessSideEffects({
    orderId,
    source: 'verify',
    authUserId: ctx.user.id,
    studentId: ctx.studentId,
    studentEmail: ctx.user.email ?? undefined,
    collegeSlug,
    metadata: { pillar_slug: pillarSlug, course_id: courseId },
  });
}

/**
 * Retry invoice + transactional emails for a paid order (no re-charge, no new entitlement).
 */
async function _retryPaymentSuccessSideEffectsAction(
  collegeSlug: string,
  orderId: string,
): Promise<ActionResponse<{ invoiceId?: string; emailsQueued: string[]; errors: string[] }>> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false, error: 'Unauthorized' };
    const order = await getOrderById(orderId);
    if (!order) {
      return { ok: false, error: 'Order not found.' };
    }

    const { orderBelongsToAuthenticatedStudent } = await import('@/lib/orders/order-ownership');
    if (!orderBelongsToAuthenticatedStudent(order, auth)) {
      return { ok: false, error: 'This order does not belong to you.' };
    }

    if (order.status !== 'paid') {
      return { ok: false, error: 'Order is not paid; cannot retry side effects.' };
    }

    const { ensurePaymentSuccessSideEffects } = await import(
      '@/lib/lms/transactional-email/payment-success'
    );
    const result = await ensurePaymentSuccessSideEffects({
      orderId: order.id,
      source: 'manual_retry',
      authUserId: auth.user.id,
      studentId: auth.studentId,
      studentEmail: auth.user.email ?? undefined,
      collegeSlug,
      metadata: (order.metadata as Record<string, unknown>) ?? {},
    });

    return {
      ok: result.ok,
      data: {
        invoiceId: result.invoiceId,
        emailsQueued: result.emailsQueued,
        errors: result.errors,
      },
      error: result.ok ? undefined : result.errors.join('; '),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Retry failed';
    return { ok: false, error: message };
  }
}

async function validateBootcampAndCourse(
  courseId: string,
  ctx: { isGlobal: boolean; collegeId: string | null; studentId: string },
  pricePlanId?: string,
): Promise<{
  pillarId: string;
  pillarTitle: string;
  courseId: string;
  priceMinor: number;
  currency: string;
  courseSourceType: PaidCourseSourceType;
} | null> {
  const sb = createAdminClient();

  const { data: course } = await applyMasterCourseKeyFilter(
    sb
      .from('master_courses')
      .select('id, selling_price, currency, is_free, pricing_model, bootcamp_id, catalog_type')
      .eq('publish_status', 'published')
      .or('bootcamp_id.not.is.null,catalog_type.eq.bootcamp'),
    courseId,
  ).maybeSingle();

  if (!course) return null;

  const resolvedCourseId = course.id as string;
  let pillarTitle = 'Paid Courses';

  if (course.bootcamp_id) {
    const { data: bootcamp } = await sb
      .from('bootcamps')
      .select('id, title, lifecycle_status, publish_status')
      .eq('id', course.bootcamp_id)
      .maybeSingle();

    if (!bootcamp || bootcamp.lifecycle_status !== 'active') return null;
    pillarTitle = bootcamp.title;
  }

  const pillarId = '__bootcamp__';

  if (!ctx.isGlobal && ctx.collegeId) {
    const assignedIds = await resolveCollegeAssignedCourseIdsStatic(ctx.collegeId);
    const want = normUuid(resolvedCourseId);
    if (assignedIds.some((id) => normUuid(id) === want)) {
      return null;
    }
  }

  if (course.is_free || course.pricing_model === 'free') {
    return {
      pillarId,
      pillarTitle,
      courseId: resolvedCourseId,
      priceMinor: 0,
      currency: course.currency ?? 'INR',
      courseSourceType: 'paid_course_builder',
    };
  }

  if (pricePlanId) {
    const { data: plan } = await sb
      .from('course_price_plans')
      .select('id, price_minor, currency')
      .eq('id', pricePlanId)
      .eq('master_course_id', resolvedCourseId)
      .eq('is_active', true)
      .maybeSingle();

    if (!plan) return null;

    return {
      pillarId,
      pillarTitle,
      courseId: resolvedCourseId,
      priceMinor: (plan as { price_minor: number }).price_minor,
      currency: (plan as { currency: string }).currency ?? 'INR',
      courseSourceType: 'paid_course_builder',
    };
  }

  if (course.selling_price && !course.is_free && course.pricing_model !== 'free') {
    return {
      pillarId,
      pillarTitle,
      courseId: resolvedCourseId,
      priceMinor: course.selling_price,
      currency: course.currency ?? 'INR',
      courseSourceType: 'paid_course_builder',
    };
  }

  const { data: variant } = await sb
    .from('course_variants')
    .select('id, selling_price, currency')
    .eq('master_course_id', resolvedCourseId)
    .eq('publish_status', 'published')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!variant || !(variant as { selling_price: number }).selling_price) return null;

  return {
    pillarId,
    pillarTitle,
    courseId: resolvedCourseId,
    priceMinor: (variant as { selling_price: number }).selling_price,
    currency: (variant as { currency: string }).currency ?? 'INR',
    courseSourceType: 'paid_course_builder',
  };
}

async function validateBootcampAndCourseVisibility(
  courseId: string,
  ctx: { isGlobal: boolean; collegeId: string | null },
): Promise<{ pillarId: string; pillarTitle: string; courseId: string } | null> {
  const sb = createAdminClient();

  const { data: course } = await applyMasterCourseKeyFilter(
    sb
      .from('master_courses')
      .select('id, bootcamp_id, catalog_type')
      .eq('publish_status', 'published')
      .or('bootcamp_id.not.is.null,catalog_type.eq.bootcamp'),
    courseId,
  ).maybeSingle();

  if (!course) return null;

  const resolvedCourseId = course.id as string;
  let pillarTitle = 'Paid Courses';

  if (course.bootcamp_id) {
    const { data: bootcamp } = await sb
      .from('bootcamps')
      .select('id, title, lifecycle_status, publish_status')
      .eq('id', course.bootcamp_id)
      .maybeSingle();

    if (!bootcamp || bootcamp.lifecycle_status !== 'active') return null;
    pillarTitle = bootcamp.title;
  }

  if (!ctx.isGlobal && ctx.collegeId) {
    const assignedIds = await resolveCollegeAssignedCourseIdsStatic(ctx.collegeId);
    const want = normUuid(resolvedCourseId);
    if (assignedIds.some((id) => normUuid(id) === want)) {
      return null;
    }
  }

  return {
    pillarId: '__bootcamp__',
    pillarTitle,
    courseId: resolvedCourseId,
  };
}

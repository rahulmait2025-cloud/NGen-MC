import 'server-only';

/**
 * Payment-to-Entitlement Automation Service for LMS.
 * 
 * After a verified successful payment, automatically grants access.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { describeSupabaseError } from '@/lib/supabase/network-error';
import { grantEntitlement } from './student-entitlements';
import { isEntitlementActive } from '@/lib/services/access-helpers';
import type { OrderWithItems } from '@/types/payments';

// --- Types ----------------------------------------------------------------------

export interface EntitlementGrantResult {
  success: boolean;
  entitlementId?: string;
  message: string;
  alreadyExists: boolean;
}

export interface ProvisionAccessInput {
  order: OrderWithItems;
  studentUserId: string;
  studentEmail: string;
  collegeId?: string | null;
  metadata?: Record<string, unknown>;
}

function computeValidUntil(validityDays: number | null, paidAt: Date): string | null {
  if (validityDays === null || validityDays <= 0) return null;
  const expiry = new Date(paidAt.getTime() + validityDays * 24 * 60 * 60 * 1000);
  return expiry.toISOString();
}

// --- Entitlement Automation ------------------------------------------------------

export async function provisionAccessAfterPurchase(
  input: ProvisionAccessInput,
): Promise<{ results: EntitlementGrantResult[] }> {
  const results: EntitlementGrantResult[] = [];
  const metadata = input.metadata ?? {};
  const paymentId =
    typeof metadata.paymentId === 'string'
      ? metadata.paymentId
      : input.order.gateway_payment_id ?? undefined;
  const source =
    typeof metadata.source === 'string' ? metadata.source : 'global_direct_purchase';
  const purchasedAt =
    typeof metadata.purchased_at === 'string' ? metadata.purchased_at : undefined;
  const pillarId =
    typeof metadata.pillar_id === 'string' ? metadata.pillar_id : undefined;
  const pillarSlug =
    typeof metadata.pillar_slug === 'string' ? metadata.pillar_slug : undefined;
  const courseId =
    typeof metadata.course_id === 'string' ? metadata.course_id : undefined;
  const variantId =
    typeof metadata.variant_id === 'string' ? metadata.variant_id : undefined;
  const razorpayOrderId =
    typeof metadata.razorpay_order_id === 'string'
      ? metadata.razorpay_order_id
      : input.order.gateway_order_id ?? undefined;
  const webhookEventId =
    typeof metadata.webhook_event_id === 'string'
      ? metadata.webhook_event_id
      : undefined;
  const verifiedAt =
    typeof metadata.verified_at === 'string'
      ? metadata.verified_at
      : new Date().toISOString();

  // Extract validity_days from order metadata (set during order creation from price plan)
  const orderMetadata = input.order.metadata as Record<string, unknown> | null;
  const validityDays =
    typeof orderMetadata?.validity_days === 'number'
      ? orderMetadata.validity_days
      : typeof orderMetadata?.validity_days === 'string'
        ? parseInt(orderMetadata.validity_days, 10) || null
        : null;
  const pricePlanId =
    typeof orderMetadata?.bundle_price_plan_id === 'string'
      ? orderMetadata.bundle_price_plan_id
      : typeof orderMetadata?.price_plan_id === 'string'
        ? orderMetadata.price_plan_id
        : undefined;
  const planName =
    typeof orderMetadata?.plan_name === 'string'
      ? orderMetadata.plan_name
      : undefined;

  const paidAt = purchasedAt ? new Date(purchasedAt) : new Date();
  const validUntil = computeValidUntil(validityDays, paidAt);

  const orderItems =
    input.order.order_items?.length > 0
      ? input.order.order_items
      : [
          {
            id: 'synthetic',
            entity_type: input.order.entity_type,
            entity_id: input.order.entity_id,
            unit_amount_minor: input.order.base_amount_minor,
            discount_amount_minor: input.order.discount_amount_minor,
            total_amount_minor: input.order.total_amount_minor,
            currency: input.order.currency,
            metadata: (input.order.metadata as Record<string, unknown>) ?? {},
          },
        ];

  const grantResults = await Promise.allSettled(
    orderItems.map(async (item) => {
      if (item.entity_type === 'course_variant') {
        return provisionVariantAccess({
          variantId: variantId ?? item.entity_id,
          studentUserId: input.studentUserId,
          studentEmail: input.studentEmail,
          orderId: input.order.id,
          collegeId: input.collegeId,
          paymentId,
          purchased_at: purchasedAt,
          pillar_id: pillarId,
          pillar_slug: pillarSlug,
          course_id: courseId,
          razorpay_order_id: razorpayOrderId,
          webhook_event_id: webhookEventId,
          verified_at: verifiedAt,
          source,
          valid_until: validUntil,
          price_plan_id: pricePlanId,
          plan_name: planName,
          validity_days: validityDays,
          amount_paid: input.order.total_amount_minor,
        });
      } else if (item.entity_type === 'master_course') {
        return provisionMasterCourseAccess({
          courseId: courseId ?? item.entity_id,
          studentUserId: input.studentUserId,
          studentEmail: input.studentEmail,
          orderId: input.order.id,
          collegeId: input.collegeId,
          paymentId,
          purchased_at: purchasedAt,
          pillar_id: pillarId,
          pillar_slug: pillarSlug,
          razorpay_order_id: razorpayOrderId,
          webhook_event_id: webhookEventId,
          verified_at: verifiedAt,
          source,
          valid_until: validUntil,
          price_plan_id: pricePlanId,
          plan_name: planName,
          validity_days: validityDays,
          amount_paid: input.order.total_amount_minor,
        });
      } else if (item.entity_type === 'course_bundle') {
        return provisionBundleAccess({
          bundleId: item.entity_id,
          studentUserId: input.studentUserId,
          studentEmail: input.studentEmail,
          orderId: input.order.id,
          collegeId: input.collegeId,
          paymentId,
          purchased_at: purchasedAt,
          razorpay_order_id: razorpayOrderId,
          webhook_event_id: webhookEventId,
          verified_at: verifiedAt,
          source,
          valid_until: validUntil,
        });
      } else if (item.entity_type === 'job_ready_bootcamp') {
        return provisionJobReadyBootcampAccess({
          bootcampId: item.entity_id,
          studentUserId: input.studentUserId,
          orderId: input.order.id,
          collegeId: input.collegeId,
          paymentId,
          purchased_at: purchasedAt,
          razorpay_order_id: razorpayOrderId,
          webhook_event_id: webhookEventId,
          verified_at: verifiedAt,
          source,
          valid_until: validUntil,
          amount_paid: input.order.total_amount_minor,
        });
      } else {
        return {
          success: false,
          message: `Unknown entity type: ${item.entity_type}`,
          alreadyExists: false,
        };
      }
    }),
  );

  for (const r of grantResults) {
    if (r.status === 'fulfilled') {
      results.push(r.value);
    } else {
      results.push({
        success: false,
        message: r.reason instanceof Error ? r.reason.message : 'Provision failed',
        alreadyExists: false,
      });
    }
  }

  return { results };
}

async function provisionVariantAccess(params: {
  variantId: string;
  studentUserId: string;
  studentEmail: string;
  orderId: string;
  collegeId?: string | null;
  paymentId?: string;
  purchased_at?: string;
  pillar_id?: string;
  pillar_slug?: string;
  course_id?: string;
  razorpay_order_id?: string;
  webhook_event_id?: string;
  verified_at?: string;
  source?: string;
  valid_until?: string | null;
  price_plan_id?: string;
  plan_name?: string;
  validity_days?: number | null;
  amount_paid?: number;
}): Promise<EntitlementGrantResult> {
  const admin = createAdminClient();

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

  const nowIso = new Date().toISOString();
  const validFrom = params.purchased_at ?? nowIso;

  const { data: existingContentEntitlement, error: checkError } = await admin
    .from('student_content_entitlements')
    .select('id, status, valid_until')
    .eq('student_id', params.studentUserId)
    .eq('assigned_entity_type', 'variant')
    .eq('assigned_entity_id', params.variantId)
    .eq('status', 'active')
    .maybeSingle();

  if (checkError) {
    console.error('[payment-entitlements] Failed to check existing content entitlements:', checkError);
    return {
      success: false,
      message: 'Failed to check existing entitlements',
      alreadyExists: false,
    };
  }

  if (existingContentEntitlement) {
    return {
      success: true,
      message: 'Active content entitlement already exists for this variant',
      alreadyExists: true,
    };
  }

  try {
    const { data: inserted, error: insertError } = await admin
      .from('student_content_entitlements')
      .insert({
        student_id: params.studentUserId,
        assigned_entity_type: 'variant',
        assigned_entity_id: params.variantId,
        source_type: 'b2c_direct',
        status: 'active',
        valid_from: validFrom,
        valid_until: params.valid_until ?? null,
        metadata: {
          source: params.source ?? 'global_direct_purchase',
          original_entity_type: 'variant',
          original_entity_id: params.variantId,
          variant_id: params.variantId,
          master_course_id: variant.master_course_id,
          order_id: params.orderId,
          payment_id: params.paymentId ?? null,
          razorpay_order_id: params.razorpay_order_id ?? null,
          purchased_at: params.purchased_at ?? null,
          pillar_id: params.pillar_id ?? null,
          pillar_slug: params.pillar_slug ?? null,
          course_id: params.course_id ?? null,
          variant_title: (variant as { title: string }).title,
          verified_at: params.verified_at ?? nowIso,
          webhook_event_id: params.webhook_event_id ?? null,
          price_plan_id: params.price_plan_id ?? null,
          plan_name: params.plan_name ?? null,
          validity_days: params.validity_days ?? null,
          amount_paid: params.amount_paid ?? null,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return {
          success: true,
          message: 'Content entitlement already exists for this variant',
          alreadyExists: true,
        };
      }
      throw insertError;
    }

    return {
      success: true,
      entitlementId: inserted?.id,
      message: 'Variant content entitlement granted successfully',
      alreadyExists: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to grant variant content entitlement: ${message}`,
      alreadyExists: false,
    };
  }
}

async function provisionBundleAccess(params: {
  bundleId: string;
  studentUserId: string;
  studentEmail: string;
  orderId: string;
  collegeId?: string | null;
  paymentId?: string;
  purchased_at?: string;
  razorpay_order_id?: string;
  webhook_event_id?: string;
  verified_at?: string;
  source?: string;
  valid_until?: string | null;
}): Promise<EntitlementGrantResult> {
  const admin = createAdminClient();

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

  const nowIso = new Date().toISOString();
  const validFrom = params.purchased_at ?? nowIso;

  const { data: existingContentEntitlement, error: checkError } = await admin
    .from('student_content_entitlements')
    .select('id, status, valid_until')
    .eq('student_id', params.studentUserId)
    .eq('assigned_entity_type', 'bundle')
    .eq('assigned_entity_id', params.bundleId)
    .eq('status', 'active')
    .maybeSingle();

  if (checkError) {
    console.error('[payment-entitlements] Failed to check existing content entitlements:', checkError);
    return {
      success: false,
      message: 'Failed to check existing entitlements',
      alreadyExists: false,
    };
  }

  if (existingContentEntitlement) {
    return {
      success: true,
      message: 'Active content entitlement already exists for this bundle',
      alreadyExists: true,
    };
  }

  try {
    const { data: inserted, error: insertError } = await admin
      .from('student_content_entitlements')
      .insert({
        student_id: params.studentUserId,
        assigned_entity_type: 'bundle',
        assigned_entity_id: params.bundleId,
        source_type: 'b2c_direct',
        status: 'active',
        valid_from: validFrom,
        valid_until: params.valid_until ?? null,
        metadata: {
          source: params.source ?? 'global_direct_purchase',
          original_entity_type: 'bundle',
          original_entity_id: params.bundleId,
          bundle_id: params.bundleId,
          order_id: params.orderId,
          payment_id: params.paymentId ?? null,
          razorpay_order_id: params.razorpay_order_id ?? null,
          purchased_at: params.purchased_at ?? null,
          bundle_title: (bundle as { title: string }).title,
          verified_at: params.verified_at ?? nowIso,
          webhook_event_id: params.webhook_event_id ?? null,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return {
          success: true,
          message: 'Content entitlement already exists for this bundle',
          alreadyExists: true,
        };
      }
      throw insertError;
    }

    return {
      success: true,
      entitlementId: inserted?.id,
      message: 'Bundle content entitlement granted successfully',
      alreadyExists: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to grant bundle content entitlement: ${message}`,
      alreadyExists: false,
    };
  }
}

async function provisionMasterCourseAccess(params: {
  courseId: string;
  studentUserId: string;
  studentEmail: string;
  orderId: string;
  collegeId?: string | null;
  paymentId?: string;
  purchased_at?: string;
  pillar_id?: string;
  pillar_slug?: string;
  razorpay_order_id?: string;
  webhook_event_id?: string;
  verified_at?: string;
  source?: string;
  valid_until?: string | null;
  price_plan_id?: string;
  plan_name?: string;
  validity_days?: number | null;
  amount_paid?: number;
}): Promise<EntitlementGrantResult> {
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('id, title')
    .eq('id', params.courseId)
    .single();

  if (courseError || !course) {
    return {
      success: false,
      message: `Course not found: ${params.courseId}`,
      alreadyExists: false,
    };
  }

  const { data: existingEntitlements, error: checkError } = await admin
    .from('student_entitlements')
    .select('id, status, valid_until')
    .eq('student_id', params.studentUserId)
    .eq('master_course_id', params.courseId)
    .eq('source_type', 'b2c_direct');

  if (checkError) {
    console.error('[payment-entitlements] Failed to check existing entitlements:', checkError);
    return {
      success: false,
      message: 'Failed to check existing entitlements',
      alreadyExists: false,
    };
  }

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

  try {
    const entitlement = await grantEntitlement({
      student_id: params.studentUserId,
      master_course_id: params.courseId,
      source_type: 'b2c_direct',
      college_id: params.collegeId ?? undefined,
      valid_until: params.valid_until ?? null,
      metadata: {
        purchase_type: 'global_direct_purchase',
        source: params.source ?? 'global_direct_purchase',
        order_id: params.orderId,
        payment_id: params.paymentId ?? null,
        razorpay_order_id: params.razorpay_order_id ?? null,
        purchased_at: params.purchased_at ?? null,
        pillar_id: params.pillar_id ?? null,
        pillar_slug: params.pillar_slug ?? null,
        course_id: params.courseId,
        course_title: (course as { title: string }).title,
        verified_at: params.verified_at ?? new Date().toISOString(),
        webhook_event_id: params.webhook_event_id ?? null,
        ...(params.price_plan_id ? { price_plan_id: params.price_plan_id } : {}),
        ...(params.plan_name ? { plan_name: params.plan_name } : {}),
        ...(params.validity_days !== undefined ? { validity_days: params.validity_days } : {}),
        ...(params.amount_paid !== undefined ? { amount_paid: params.amount_paid } : {}),
      },
    });

    return {
      success: true,
      entitlementId: entitlement.id,
      message: 'Entitlement granted successfully',
      alreadyExists: false,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to grant entitlement: ${describeSupabaseError(error)}`,
      alreadyExists: false,
    };
  }
}

async function provisionJobReadyBootcampAccess(params: {
  bootcampId: string;
  studentUserId: string;
  orderId: string;
  collegeId?: string | null;
  paymentId?: string;
  purchased_at?: string;
  razorpay_order_id?: string;
  webhook_event_id?: string;
  verified_at?: string;
  source?: string;
  valid_until?: string | null;
  amount_paid?: number;
}): Promise<EntitlementGrantResult> {
  const admin = createAdminClient();

  const nowIso = new Date().toISOString();
  const validFrom = params.purchased_at ?? nowIso;

  const enrollmentPayload = {
    student_id: params.studentUserId,
    college_id: params.collegeId ?? null,
    bootcamp_id: params.bootcampId,
    status: 'active' as const,
    order_id: params.orderId,
    valid_from: validFrom,
    valid_until: params.valid_until ?? null,
    metadata: {
      source: params.source ?? 'global_direct_purchase',
      source_type: 'job_ready_bootcamp',
      order_id: params.orderId,
      payment_id: params.paymentId ?? null,
      razorpay_order_id: params.razorpay_order_id ?? null,
      verified_at: params.verified_at ?? nowIso,
      webhook_event_id: params.webhook_event_id ?? null,
      amount_paid: params.amount_paid ?? null,
    },
  };

  try {
    const { data: studentRow, error: studentLookupError } = await admin
      .from('students')
      .select('id')
      .eq('id', params.studentUserId)
      .maybeSingle();

    if (studentLookupError) {
      throw studentLookupError;
    }

    if (!studentRow) {
      return {
        success: false,
        message: `Student record not found for enrollment (${params.studentUserId})`,
        alreadyExists: false,
      };
    }

    const { data: bootcampRow, error: bootcampLookupError } = await admin
      .from('bootcamps')
      .select('id')
      .eq('id', params.bootcampId)
      .maybeSingle();

    if (bootcampLookupError) {
      throw bootcampLookupError;
    }

    if (!bootcampRow) {
      return {
        success: false,
        message: `Bootcamp record not found for enrollment (${params.bootcampId})`,
        alreadyExists: false,
      };
    }

    const { data: existing, error: existingError } = await admin
      .from('job_ready_bootcamp_enrollments')
      .select('id, status, valid_until')
      .eq('student_id', params.studentUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing && isEntitlementActive({ status: existing.status, valid_until: existing.valid_until })) {
      return {
        success: true,
        message: 'Job Ready Bootcamp enrollment already active',
        alreadyExists: true,
        entitlementId: existing.id,
      };
    }

    if (existing) {
      const { data: updated, error: updateError } = await admin
        .from('job_ready_bootcamp_enrollments')
        .update(enrollmentPayload)
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) {
        throw updateError;
      }

      return {
        success: true,
        entitlementId: updated?.id,
        message: 'Job Ready Bootcamp enrollment reactivated',
        alreadyExists: false,
      };
    }

    const { data: inserted, error } = await admin
      .from('job_ready_bootcamp_enrollments')
      .insert(enrollmentPayload)
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: raceExisting } = await admin
          .from('job_ready_bootcamp_enrollments')
          .select('id')
          .eq('student_id', params.studentUserId)
          .eq('status', 'active')
          .maybeSingle();

        if (raceExisting?.id) {
          return {
            success: true,
            message: 'Job Ready Bootcamp enrollment already exists',
            alreadyExists: true,
            entitlementId: raceExisting.id,
          };
        }
      }
      throw error;
    }

    return {
      success: true,
      entitlementId: inserted?.id,
      message: 'Job Ready Bootcamp enrollment granted successfully',
      alreadyExists: false,
    };
  } catch (error) {
    const message = describeSupabaseError(error);
    console.error('[payment-entitlements] Job Ready Bootcamp enrollment failed', {
      studentId: params.studentUserId,
      bootcampId: params.bootcampId,
      orderId: params.orderId,
      collegeId: params.collegeId ?? null,
      error: typeof error === 'object' && error !== null ? error : { message },
    });
    return {
      success: false,
      message: `Failed to grant Job Ready Bootcamp enrollment: ${message}`,
      alreadyExists: false,
    };
  }
}

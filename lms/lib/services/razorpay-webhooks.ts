import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrderByGatewayOrderId, recordCouponUsageForOrder } from '@/lib/services/orders';
import { provisionAccessAfterPurchase } from '@/lib/services/payment-entitlements';
import type { OrderWithItems, RazorpayWebhookEvent } from '@/types/payments';

type WebhookResult = {
  handled: boolean;
  duplicate: boolean;
  message: string;
};

type RazorpayPaymentEntity = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  error_description?: string;
};

function getObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function extractPaymentEntity(payload: Record<string, unknown>): RazorpayPaymentEntity | null {
  const event = payload as RazorpayWebhookEvent;
  const paymentEntity = getObject(event.payload?.payment?.entity);
  if (!paymentEntity) {
    return null;
  }

  const id = getString(paymentEntity.id);
  const orderId = getString(paymentEntity.order_id);
  const amount = getNumber(paymentEntity.amount);
  const currency = getString(paymentEntity.currency);
  const status = getString(paymentEntity.status);
  const method = getString(paymentEntity.method) ?? undefined;
  const errorDescription = getString(paymentEntity.error_description) ?? undefined;

  if (!id || !orderId || amount === null || !currency || !status) {
    return null;
  }

  return {
    id,
    order_id: orderId,
    amount,
    currency,
    status,
    method,
    error_description: errorDescription,
  };
}

async function resolvePurchaserStudentContext(
  order: OrderWithItems,
): Promise<{ studentId: string; collegeId: string | null } | null> {
  const metadata = getObject(order.metadata) ?? {};
  let studentId = getString(metadata.student_id) ?? order.purchaser_user_id;
  let collegeId: string | null = null;
  const admin = createAdminClient();

  if (!studentId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', order.purchaser_email)
      .maybeSingle();

    if (profile) {
      const { data: student } = await admin
        .from('students')
        .select('id, college_id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (student) {
        studentId = student.id;
        collegeId = (student as { college_id: string | null }).college_id ?? null;
      }
    }
  } else {
    const { data: student } = await admin
      .from('students')
      .select('college_id')
      .eq('id', studentId)
      .maybeSingle();

    if (student) {
      collegeId = (student as { college_id: string | null }).college_id ?? null;
    }
  }

  if (!studentId) return null;
  return { studentId, collegeId };
}

async function validateGlobalCourseOrder(
  order: OrderWithItems,
): Promise<{
  courseId: string;
  pillarId: string;
  variantId: string | null;
  studentId: string;
  collegeId: string | null;
} | null> {
  const isMasterCourse = order.entity_type === 'master_course';
  const isVariant = order.entity_type === 'course_variant';

  if (!isMasterCourse && !isVariant) {
    return null;
  }

  const orderItem = order.order_items[0];
  if (!orderItem || (orderItem.entity_type !== 'course_variant' && orderItem.entity_type !== 'master_course')) {
    return null;
  }

  const metadata = getObject(order.metadata) ?? {};
  const actors = await resolvePurchaserStudentContext(order);
  if (!actors) return null;
  const { studentId, collegeId } = actors;
  const admin = createAdminClient();

  if (isMasterCourse) {
    const courseId = order.entity_id;
    const { data: course } = await admin
      .from('master_courses')
      .select('id, pillar_id')
      .eq('id', courseId)
      .eq('publish_status', 'published')
      .eq('visible_to_global_students', true)
      .maybeSingle();

    if (!course || !course.pillar_id) return null;

    return {
      courseId: course.id,
      pillarId: course.pillar_id,
      variantId: null,
      studentId,
      collegeId,
    };
  }

  const courseId = getString(metadata.course_id);
  const pillarId = getString(metadata.pillar_id);
  const variantId = getString(metadata.variant_id) ?? order.entity_id;

  if (!courseId || !pillarId || !variantId) {
    return null;
  }

  if (variantId !== order.entity_id || orderItem.entity_id !== variantId) {
    return null;
  }

  const { data: pillar } = await admin
    .from('master_course_pillars')
    .select('id')
    .eq('id', pillarId)
    .eq('publish_status', 'published')
    .eq('visible_to_global_students', true)
    .maybeSingle();

  if (!pillar) {
    return null;
  }

  const { data: course } = await admin
    .from('master_courses')
    .select('id')
    .eq('id', courseId)
    .eq('pillar_id', pillarId)
    .eq('publish_status', 'published')
    .eq('visible_to_global_students', true)
    .maybeSingle();

  if (!course) {
    return null;
  }

  const { data: variant } = await admin
    .from('course_variants')
    .select('id')
    .eq('id', variantId)
    .eq('master_course_id', courseId)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (!variant) {
    return null;
  }

  return {
    courseId,
    pillarId,
    variantId,
    studentId,
    collegeId,
  };
}

async function validateCatalogPaidOrder(
  order: OrderWithItems,
): Promise<{
  studentId: string;
  collegeId: string | null;
  courseId: string | null;
  pillarId: string | null;
  variantId: string | null;
} | null> {
  const actors = await resolvePurchaserStudentContext(order);
  if (!actors) return null;

  if (order.entity_type === 'master_course' || order.entity_type === 'course_variant') {
    const validated = await validateGlobalCourseOrder(order);
    if (!validated) return null;
    return {
      studentId: validated.studentId,
      collegeId: validated.collegeId,
      courseId: validated.courseId,
      pillarId: validated.pillarId,
      variantId: validated.variantId,
    };
  }

  if (order.entity_type === 'course_bundle') {
    const admin = createAdminClient();
    const { data: bundle } = await admin
      .from('course_bundles')
      .select('id')
      .eq('id', order.entity_id)
      .maybeSingle();
    if (!bundle) return null;
    return {
      studentId: actors.studentId,
      collegeId: actors.collegeId,
      courseId: null,
      pillarId: null,
      variantId: null,
    };
  }

  if (order.entity_type === 'job_ready_bootcamp') {
    const admin = createAdminClient();
    const { data: bootcamp } = await admin
      .from('bootcamps')
      .select('id')
      .eq('id', order.entity_id)
      .maybeSingle();
    if (!bootcamp) return null;
    return {
      studentId: actors.studentId,
      collegeId: actors.collegeId,
      courseId: null,
      pillarId: null,
      variantId: null,
    };
  }

  return null;
}

async function upsertCapturedPayment(params: {
  order: OrderWithItems;
  payment: RazorpayPaymentEntity;
  payload: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existingPayment } = await admin
    .from('payments')
    .select('id')
    .eq('order_id', params.order.id)
    .eq('gateway_payment_id', params.payment.id)
    .maybeSingle();

  if (existingPayment) {
    await admin
      .from('payments')
      .update({
        status: 'captured',
        amount_minor: params.payment.amount,
        currency: params.payment.currency,
        method: params.payment.method ?? null,
        captured_at: now,
        failure_reason: null,
        gateway_payload: params.payload,
      })
      .eq('id', (existingPayment as { id: string }).id);
    return;
  }

  const { data: initiatedPayment } = await admin
    .from('payments')
    .select('id')
    .eq('order_id', params.order.id)
    .eq('gateway_order_id', params.payment.order_id)
    .eq('status', 'initiated')
    .maybeSingle();

  if (initiatedPayment) {
    await admin
      .from('payments')
      .update({
        gateway_payment_id: params.payment.id,
        amount_minor: params.payment.amount,
        currency: params.payment.currency,
        status: 'captured',
        method: params.payment.method ?? null,
        captured_at: now,
        failure_reason: null,
        gateway_payload: params.payload,
      })
      .eq('id', (initiatedPayment as { id: string }).id);
    return;
  }

  await admin
    .from('payments')
    .insert({
      order_id: params.order.id,
      gateway_name: 'razorpay',
      gateway_order_id: params.payment.order_id,
      gateway_payment_id: params.payment.id,
      amount_minor: params.payment.amount,
      currency: params.payment.currency,
      status: 'captured',
      method: params.payment.method ?? null,
      captured_at: now,
      gateway_payload: params.payload,
    });
}

async function upsertFailedPayment(params: {
  order: OrderWithItems;
  payment: RazorpayPaymentEntity;
  payload: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existingPayment } = await admin
    .from('payments')
    .select('id, status')
    .eq('order_id', params.order.id)
    .eq('gateway_payment_id', params.payment.id)
    .maybeSingle();

  if (existingPayment) {
    const status = (existingPayment as { status: string }).status;
    if (status === 'captured' || status === 'authorized' || status === 'refunded') {
      return;
    }

    await admin
      .from('payments')
      .update({
        status: 'failed',
        amount_minor: params.payment.amount,
        currency: params.payment.currency,
        failure_reason: params.payment.error_description ?? 'Payment failed',
        failed_at: now,
        gateway_payload: params.payload,
      })
      .eq('id', (existingPayment as { id: string }).id);
    return;
  }

  const { data: initiatedPayment } = await admin
    .from('payments')
    .select('id')
    .eq('order_id', params.order.id)
    .eq('gateway_order_id', params.payment.order_id)
    .eq('status', 'initiated')
    .maybeSingle();

  if (initiatedPayment) {
    await admin
      .from('payments')
      .update({
        gateway_payment_id: params.payment.id,
        amount_minor: params.payment.amount,
        currency: params.payment.currency,
        status: 'failed',
        failure_reason: params.payment.error_description ?? 'Payment failed',
        failed_at: now,
        gateway_payload: params.payload,
      })
      .eq('id', (initiatedPayment as { id: string }).id);
    return;
  }

  await admin
    .from('payments')
    .insert({
      order_id: params.order.id,
      gateway_name: 'razorpay',
      gateway_order_id: params.payment.order_id,
      gateway_payment_id: params.payment.id,
      amount_minor: params.payment.amount,
      currency: params.payment.currency,
      status: 'failed',
      failure_reason: params.payment.error_description ?? 'Payment failed',
      failed_at: now,
      gateway_payload: params.payload,
    });
}

async function reconcileMentorshipBookingPayment(params: {
  order: OrderWithItems;
  payment: RazorpayPaymentEntity;
  eventId: string | null;
}): Promise<WebhookResult> {
  const { order, payment, eventId } = params;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Update order status
  if (order.status !== 'paid' || order.gateway_payment_id !== payment.id) {
    await admin
      .from('orders')
      .update({
        status: 'paid',
        gateway_payment_id: payment.id,
        paid_at: order.paid_at ?? now,
        metadata: {
          ...(getObject(order.metadata) ?? {}),
          payment_method: payment.method ?? null,
          verified_at: now,
          webhook_verified_at: now,
          webhook_event_id: eventId,
          webhook_event_type: 'payment.captured',
        },
      })
      .eq('id', order.id);
  }

  // Confirm the booking if it's still pending
  if (order.entity_id) {
    const { data: confirmedFromPending } = await admin
      .from('paid_mentorship_bookings')
      .update({
        status: 'confirmed',
        expires_at: null,
        updated_at: now,
      })
      .eq('id', order.entity_id)
      .eq('order_id', order.id)
      .eq('status', 'pending')
      .select('id, user_id, category_id, session_date, start_time_ist, end_time_ist, meeting_url, final_amount_minor')
      .maybeSingle();

    // Duplicate webhook / already-confirmed: still attempt confirmation email
    // (idempotent outbox key). Never fail the webhook because email is missing.
    let booking = confirmedFromPending;
    if (!booking) {
      const { data: existingConfirmed } = await admin
        .from('paid_mentorship_bookings')
        .select('id, user_id, category_id, session_date, start_time_ist, end_time_ist, meeting_url, final_amount_minor')
        .eq('id', order.entity_id)
        .eq('order_id', order.id)
        .in('status', ['confirmed', 'rescheduled', 'completed'])
        .maybeSingle();
      booking = existingConfirmed;
    }

    if (booking) {
      const bookingId = booking.id as string;
      const { sendMentorshipPaymentConfirmation, sendMentorshipBookingConfirmed } = await import('@/lib/lms/transactional-email/mentorship-emails');
      if ((booking.final_amount_minor ?? 0) > 0) {
        void sendMentorshipPaymentConfirmation({
          userId: booking.user_id,
          categoryTitle: '',
          categoryId: booking.category_id,
          sessionDate: booking.session_date,
          startTime: booking.start_time_ist,
          endTime: booking.end_time_ist,
          orderId: order.id,
          totalMinor: booking.final_amount_minor,
          paymentId: payment.id,
        }).catch((err) => console.error('[razorpay-webhooks] mentorship payment confirmation email failed', { bookingId, orderId: order.id, err }));
      }
      void sendMentorshipBookingConfirmed({
        userId: booking.user_id,
        categoryId: booking.category_id,
        sessionDate: booking.session_date,
        startTime: booking.start_time_ist,
        endTime: booking.end_time_ist,
        meetingUrl: booking.meeting_url,
        orderId: order.id,
        bookingId,
      }).catch((err) => console.error('[razorpay-webhooks] mentorship booking confirmation email failed', { bookingId, orderId: order.id, err }));
    }
  }

  // Record coupon usage
  await recordCouponUsageForOrder(order);

  return { handled: true, duplicate: false, message: 'Mentorship booking payment captured.' };
}

async function reconcileNotePaymentOrder(params: {
  payment: RazorpayPaymentEntity;
  eventId: string | null;
}): Promise<WebhookResult> {
  const admin = createAdminClient();
  const { data: noteOrder } = await admin
    .from('note_payment_orders')
    .select(
      'id, student_id, note_collection_id, status, amount_minor, currency, gateway_payment_id, gateway_order_id, paid_at, metadata',
    )
    .eq('gateway_order_id', params.payment.order_id)
    .maybeSingle();

  if (!noteOrder) {
    return { handled: true, duplicate: false, message: 'Ignored unknown Razorpay order.' };
  }

  if (noteOrder.status === 'failed' || noteOrder.status === 'cancelled' || noteOrder.status === 'refunded') {
    return { handled: true, duplicate: false, message: 'Ignored non-payable note order state.' };
  }

  // Note amounts are stored in rupees; Razorpay amount is paise.
  const expectedPaise = Math.round(Number(noteOrder.amount_minor) * 100);
  if (expectedPaise !== params.payment.amount) {
    return { handled: true, duplicate: false, message: 'Blocked note amount mismatch.' };
  }

  const now = new Date().toISOString();
  const alreadyPaid =
    noteOrder.status === 'paid' && noteOrder.gateway_payment_id === params.payment.id;

  if (!alreadyPaid) {
    await admin
      .from('note_payment_orders')
      .update({
        status: 'paid',
        gateway_payment_id: params.payment.id,
        gateway_order_id: params.payment.order_id,
        paid_at: noteOrder.paid_at ?? now,
        updated_at: now,
        metadata: {
          ...((noteOrder.metadata as Record<string, unknown>) ?? {}),
          webhook_verified_at: now,
          webhook_event_id: params.eventId,
        },
      })
      .eq('id', noteOrder.id);
  }

  const { data: collection } = await admin
    .from('note_collections')
    .select('validity_days')
    .eq('id', noteOrder.note_collection_id)
    .maybeSingle();

  const validityDays = (collection as { validity_days: number | null } | null)?.validity_days;
  const validUntil = validityDays
    ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: existingEntitlement } = await admin
    .from('student_note_entitlements')
    .select('id')
    .eq('student_id', noteOrder.student_id)
    .eq('note_collection_id', noteOrder.note_collection_id)
    .eq('source_order_id', noteOrder.id)
    .maybeSingle();

  if (!existingEntitlement) {
    await admin.from('student_note_entitlements').insert({
      student_id: noteOrder.student_id,
      note_collection_id: noteOrder.note_collection_id,
      source_type: 'direct_purchase',
      source_order_id: noteOrder.id,
      status: 'active',
      valid_from: noteOrder.paid_at ?? now,
      valid_until: validUntil,
      metadata: { source: 'razorpay_webhook' },
    });
  }

  const { ensureNotePaymentSuccessSideEffects } = await import(
    '@/lib/lms/transactional-email/note-payment-success'
  );
  void ensureNotePaymentSuccessSideEffects({
    notePaymentOrderId: noteOrder.id,
    source: 'webhook',
  });

  return {
    handled: true,
    duplicate: alreadyPaid,
    message: alreadyPaid
      ? 'Handled duplicate note payment capture.'
      : 'Note payment captured and access provisioned.',
  };
}

async function reconcileCapturedPayment(params: {
  eventId: string | null;
  payload: Record<string, unknown>;
}): Promise<WebhookResult> {
  const payment = extractPaymentEntity(params.payload);
  if (!payment) {
    return { handled: true, duplicate: false, message: 'Ignored malformed payment payload.' };
  }

  const order = await getOrderByGatewayOrderId(payment.order_id);
  if (!order) {
    return reconcileNotePaymentOrder({ payment, eventId: params.eventId });
  }

  if (order.status === 'cancelled' || order.status === 'failed' || order.status === 'refunded') {
    return { handled: true, duplicate: false, message: 'Ignored non-payable order state.' };
  }

  if (order.total_amount_minor !== payment.amount) {
    return { handled: true, duplicate: false, message: 'Blocked amount mismatch.' };
  }

  if (order.currency && order.currency !== payment.currency) {
    return { handled: true, duplicate: false, message: 'Blocked currency mismatch.' };
  }

  // Handle paid mentorship bookings
  if (order.entity_type === 'paid_mentorship_booking') {
    return reconcileMentorshipBookingPayment({ order, payment, eventId: params.eventId });
  }

  const validatedOrder = await validateCatalogPaidOrder(order);
  if (!validatedOrder) {
    return { handled: true, duplicate: false, message: 'Blocked invalid purchase context.' };
  }

  const admin = createAdminClient();
  const { data: paymentMatches } = await admin
    .from('payments')
    .select('order_id, status')
    .eq('gateway_payment_id', payment.id)
    .limit(10);

  const reuseAcrossOrders = (paymentMatches ?? []).some(
    (match) => (match as { order_id: string }).order_id !== order.id,
  );
  if (reuseAcrossOrders) {
    return { handled: true, duplicate: false, message: 'Blocked payment reuse across orders.' };
  }

  const isDuplicate =
    (paymentMatches ?? []).some(
      (match) =>
        (match as { order_id: string; status: string }).order_id === order.id &&
        ['authorized', 'captured', 'refunded'].includes(
          (match as { status: string }).status,
        ),
    ) ||
    (order.status === 'paid' && order.gateway_payment_id === payment.id);

  if (order.gateway_payment_id && order.gateway_payment_id !== payment.id && order.status === 'paid') {
    return { handled: true, duplicate: false, message: 'Blocked conflicting paid order payment id.' };
  }

  const now = new Date().toISOString();

  // Parallelize: order update + payment upsert + coupon usage + entitlement provisioning
  const parallelOps = [];

  if (order.status !== 'paid' || order.gateway_payment_id !== payment.id) {
    parallelOps.push(
      admin
        .from('orders')
        .update({
          status: 'paid',
          gateway_payment_id: payment.id,
          paid_at: order.paid_at ?? now,
          metadata: {
            ...(getObject(order.metadata) ?? {}),
            payment_method: payment.method ?? null,
            verified_at: now,
            webhook_verified_at: now,
            webhook_event_id: params.eventId,
            webhook_event_type: 'payment.captured',
          },
        })
        .eq('id', order.id)
        .then()
    );
  }

  parallelOps.push(
    upsertCapturedPayment({ order, payment, payload: params.payload }),
    recordCouponUsageForOrder(order),
    provisionAccessAfterPurchase({
      order: {
        ...order,
        gateway_payment_id: payment.id,
        paid_at: order.paid_at ?? now,
      },
      studentUserId: validatedOrder.studentId,
      studentEmail: order.purchaser_email,
      collegeId: validatedOrder.collegeId,
      metadata: {
        source: 'razorpay_webhook',
        paymentId: payment.id,
        purchased_at: order.paid_at ?? now,
        verified_at: now,
        pillar_id: validatedOrder.pillarId ?? undefined,
        course_id: validatedOrder.courseId ?? undefined,
        variant_id: validatedOrder.variantId ?? undefined,
        razorpay_order_id: payment.order_id,
        webhook_event_id: params.eventId ?? undefined,
      },
    })
  );

  await Promise.all(parallelOps);

  const [{ resolveOrderActors }, { ensurePaymentSuccessSideEffects }, { revalidateStudentLearningCaches }] = await Promise.all([
    import('@/lib/lms/billing/resolve-order-actors'),
    import('@/lib/lms/transactional-email/payment-success'),
    import('@/lib/lms/revalidate-student-learning'),
  ]);

  if (validatedOrder.studentId) {
    const collegeSlug = validatedOrder.collegeId
      ? (order.metadata as Record<string, unknown>)?.college_slug as string ?? 'direct-learners'
      : 'direct-learners';
    revalidateStudentLearningCaches(collegeSlug, validatedOrder.studentId);
  }
  const actors = await resolveOrderActors(order);
  void ensurePaymentSuccessSideEffects({
    orderId: order.id,
    source: 'webhook',
    authUserId: actors.authUserId,
    studentId: validatedOrder.studentId ?? actors.studentId,
    studentEmail: order.purchaser_email,
    metadata: {
      pillar_id: validatedOrder.pillarId ?? undefined,
      course_id: validatedOrder.courseId ?? undefined,
      variant_id: validatedOrder.variantId ?? undefined,
    },
  });

  return {
    handled: true,
    duplicate: isDuplicate,
    message: isDuplicate ? 'Handled duplicate captured payment.' : 'Captured payment reconciled.',
  };
}

async function reconcileFailedPayment(params: {
  payload: Record<string, unknown>;
}): Promise<WebhookResult> {
  const payment = extractPaymentEntity(params.payload);
  if (!payment) {
    return { handled: true, duplicate: false, message: 'Ignored malformed failed payment payload.' };
  }

  const order = await getOrderByGatewayOrderId(payment.order_id);
  if (!order) {
    return { handled: true, duplicate: false, message: 'Ignored unknown Razorpay order.' };
  }

  if (order.status === 'paid' || order.status === 'refunded' || order.status === 'cancelled') {
    return { handled: true, duplicate: false, message: 'Ignored failure after terminal paid state.' };
  }

  const admin = createAdminClient();
  const { data: successfulPayments } = await admin
    .from('payments')
    .select('id')
    .eq('order_id', order.id)
    .in('status', ['authorized', 'captured', 'refunded'])
    .limit(1);

  if ((successfulPayments ?? []).length > 0) {
    return { handled: true, duplicate: false, message: 'Ignored failure because success already recorded.' };
  }

  const { data: paymentMatches } = await admin
    .from('payments')
    .select('order_id')
    .eq('gateway_payment_id', payment.id)
    .limit(10);

  const reuseAcrossOrders = (paymentMatches ?? []).some(
    (match) => (match as { order_id: string }).order_id !== order.id,
  );
  if (reuseAcrossOrders) {
    return { handled: true, duplicate: false, message: 'Blocked failed payment reuse across orders.' };
  }

  await Promise.all([
    admin
      .from('orders')
      .update({
        status: 'failed',
        metadata: {
          ...(getObject(order.metadata) ?? {}),
          failed_at: new Date().toISOString(),
          webhook_event_type: 'payment.failed',
        },
      })
      .eq('id', order.id)
      .eq('status', 'pending')
      .then(),
    upsertFailedPayment({
      order,
      payment,
      payload: params.payload,
    }),
  ]);

  return { handled: true, duplicate: false, message: 'Failed payment recorded conservatively.' };
}

export async function handleRazorpayWebhookEvent(params: {
  eventId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<WebhookResult> {
  if (params.eventType === 'payment.captured') {
    return reconcileCapturedPayment({
      eventId: params.eventId,
      payload: params.payload,
    });
  }

  if (params.eventType === 'payment.failed') {
    return reconcileFailedPayment({ payload: params.payload });
  }

  if (params.eventType === 'order.paid') {
    const payment = extractPaymentEntity(params.payload);
    if (!payment) {
      return { handled: true, duplicate: false, message: 'Ignored order.paid without payment entity.' };
    }

    return reconcileCapturedPayment({
      eventId: params.eventId,
      payload: params.payload,
    });
  }

  return { handled: true, duplicate: false, message: 'Ignored unrelated event.' };
}

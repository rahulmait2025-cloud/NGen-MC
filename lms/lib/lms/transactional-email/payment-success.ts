import 'server-only';

import { getOrderById } from '@/lib/services/orders';
import { createOrGetInvoiceForPaidOrder } from '@/lib/lms/billing/invoices';
import { resolveOrderActors } from '@/lib/lms/billing/resolve-order-actors';
import { getSupplierConfig } from '@/lib/lms/billing/supplier-config';
import { buildPaymentConfirmationEmail } from './templates/payment-confirmation';
import { buildBatchEnrollmentSuccessEmail } from './templates/batch-enrollment-success';
import { buildStudentDashboardUrl } from './dashboard-url';
import { resolvePurchasedEntityPresentation } from './entity-access';
import { EMAIL_BRAND } from './templates/email-brand';
import { queueAndMaybeProcessLmsEmail } from './processor';
import type { SellableEntityType } from '@/types/payments';

export type PaymentSideEffectsSource = 'verify' | 'webhook' | 'manual_retry';

export type EnsurePaymentSuccessSideEffectsResult = {
  ok: boolean;
  skipped?: boolean;
  invoiceId?: string;
  invoiceCreated?: boolean;
  emailsQueued: string[];
  errors: string[];
};

function isCourseLikeAccessEmail(entityType: SellableEntityType): boolean {
  return (
    entityType === 'master_course' ||
    entityType === 'course_variant' ||
    entityType === 'course_bundle' ||
    entityType === 'job_ready_bootcamp' ||
    entityType === 'note_collection'
  );
}

export async function ensurePaymentSuccessSideEffects(params: {
  orderId: string;
  source: PaymentSideEffectsSource;
  authUserId?: string | null;
  studentId?: string | null;
  studentEmail?: string | null;
  collegeSlug?: string;
  metadata?: Record<string, unknown>;
}): Promise<EnsurePaymentSuccessSideEffectsResult> {
  const errors: string[] = [];
  const emailsQueued: string[] = [];

  const order = await getOrderById(params.orderId);
  if (!order) {
    return { ok: false, skipped: true, emailsQueued, errors: ['order_not_found'] };
  }
  if (order.status !== 'paid') {
    return { ok: false, skipped: true, emailsQueued, errors: ['order_not_paid'] };
  }

  // Mentorship uses its own booking/payment confirmation emails.
  if (order.entity_type === 'paid_mentorship_booking') {
    return { ok: true, skipped: true, emailsQueued, errors: [] };
  }

  const email = (params.studentEmail ?? order.purchaser_email)?.trim();
  if (!email) {
    console.error('[lms-email/payment-success] missing recipient email', {
      orderId: order.id,
      source: params.source,
    });
    return { ok: false, emailsQueued, errors: ['missing_recipient_email'] };
  }

  const actors = await resolveOrderActors(order);
  const authUserId = params.authUserId ?? actors.authUserId;
  const studentId = params.studentId ?? actors.studentId;

  if (!authUserId) {
    const msg = `no auth user for order ${order.id} (${actors.authUserIdSource})`;
    console.error('[lms-email/payment-success] cannot queue email', {
      orderId: order.id,
      source: params.source,
      error: msg,
    });
    return { ok: false, emailsQueued, errors: [msg] };
  }

  let invoiceId: string | undefined;
  let invoiceNumber: string | undefined;
  let invoiceCreated: boolean | undefined;
  let downloadUrl: string | undefined;

  try {
    const invoiceResult = await createOrGetInvoiceForPaidOrder(order.id);
    invoiceId = invoiceResult.invoice.id;
    invoiceNumber = invoiceResult.invoice.invoice_number;
    invoiceCreated = invoiceResult.created;
    downloadUrl = invoiceResult.downloadUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`invoice: ${message}`);
    console.error('[lms-email/payment-success] invoice failed', {
      orderId: order.id,
      source: params.source,
      error: message,
    });
  }

  const supplier = getSupplierConfig();
  const dashboardUrl = buildStudentDashboardUrl(params.collegeSlug);

  const orderItems =
    order.order_items?.length > 0
      ? order.order_items
      : [
          {
            id: 'synthetic',
            entity_type: order.entity_type,
            entity_id: order.entity_id,
            unit_amount_minor: order.base_amount_minor,
            discount_amount_minor: order.discount_amount_minor,
            total_amount_minor: order.total_amount_minor,
            currency: order.currency,
            metadata: (order.metadata as Record<string, unknown>) ?? {},
          },
        ];

  try {
    const firstItem = orderItems[0];
    let paymentEntityName = 'your purchase';
    let paymentEntityLabel = 'Purchase';
    let paymentCtaUrl = dashboardUrl;
    let paymentCtaLabel = 'Go to Dashboard';

    if (firstItem) {
      const primaryPresentation = await resolvePurchasedEntityPresentation({
        entityType: firstItem.entity_type,
        entityId: firstItem.entity_id,
        metadata: {
          ...((firstItem.metadata as Record<string, unknown>) ?? {}),
          ...(params.metadata ?? {}),
        },
        collegeSlug: params.collegeSlug,
      });
      paymentEntityName = primaryPresentation.title;
      paymentEntityLabel = primaryPresentation.typeLabel;
      paymentCtaUrl = primaryPresentation.accessUrl;
      paymentCtaLabel = primaryPresentation.primaryCtaLabel;
    }

    const paymentEmail = buildPaymentConfirmationEmail({
      purchaserName: order.purchaser_name ?? email,
      entityName: paymentEntityName,
      entityLabel: paymentEntityLabel,
      purchaseTypeLabel: paymentEntityLabel,
      orderId: order.id,
      invoiceNumber: invoiceNumber ?? null,
      totalMinor: order.total_amount_minor,
      paidAtLabel: new Date(order.paid_at ?? Date.now()).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      }),
      invoiceDownloadUrl: downloadUrl ?? null,
      dashboardUrl,
      primaryCtaUrl: paymentCtaUrl,
      primaryCtaLabel: paymentCtaLabel,
      paymentId: order.gateway_payment_id ?? undefined,
      supportEmail: supplier.supportEmail,
    });

    await queueAndMaybeProcessLmsEmail({
      eventType: 'payment_confirmation',
      userId: authUserId,
      studentId,
      orderId: order.id,
      invoiceId,
      toEmail: email,
      subject: paymentEmail.subject,
      htmlBody: paymentEmail.html,
      textBody: paymentEmail.text,
      category: 'payment_confirmation',
      idempotencyKey: `payment_confirmation:order:${order.id}`,
      metadata: { source: params.source, entity_type: order.entity_type },
    });
    emailsQueued.push('payment_confirmation');
    console.info('[lms-email/payment-success] payment email queued', {
      orderId: order.id,
      source: params.source,
      entityType: order.entity_type,
      hasInvoice: Boolean(invoiceId && downloadUrl),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`payment_confirmation_email: ${message}`);
    console.error('[lms-email/payment-success] payment confirmation email failed', {
      orderId: order.id,
      source: params.source,
      error: message,
    });
  }

  const seenEntities = new Set<string>();
  const uniqueItems = orderItems.filter((item) => {
    if (!isCourseLikeAccessEmail(item.entity_type)) return false;
    const entityKey = `${item.entity_type}:${item.entity_id}`;
    if (seenEntities.has(entityKey)) return false;
    seenEntities.add(entityKey);
    return true;
  });

  const emailResults = await Promise.allSettled(
    uniqueItems.map(async (item) => {
      const entityKey = `${item.entity_type}:${item.entity_id}`;
      const presentation = await resolvePurchasedEntityPresentation({
        entityType: item.entity_type,
        entityId: item.entity_id,
        metadata: {
          ...((item.metadata as Record<string, unknown>) ?? {}),
          ...(params.metadata ?? {}),
        },
        collegeSlug: params.collegeSlug,
      });

      const enrollmentEmail = buildBatchEnrollmentSuccessEmail({
        purchaserName: order.purchaser_name ?? email,
        entityTitle: presentation.title,
        entityTypeLabel: presentation.typeLabel,
        accessUrl: presentation.accessUrl,
        dashboardUrl,
        supportEmail: supplier.supportEmail,
        programName: EMAIL_BRAND.programName,
        primaryCtaLabel: presentation.primaryCtaLabel,
        accessMessage: `Your access for ${presentation.title} has been activated successfully.`,
      });

      await queueAndMaybeProcessLmsEmail({
        eventType: 'batch_enrollment_success',
        userId: authUserId,
        studentId,
        orderId: order.id,
        toEmail: email,
        subject: enrollmentEmail.subject,
        htmlBody: enrollmentEmail.html,
        textBody: enrollmentEmail.text,
        category: 'batch_enrollment_success',
        idempotencyKey: `batch_enrollment_success:order:${order.id}:${item.entity_type}:${item.entity_id}`,
        metadata: {
          source: params.source,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
        },
      });
      console.info('[lms-email/payment-success] access email queued', {
        orderId: order.id,
        source: params.source,
        entityType: item.entity_type,
        entityId: item.entity_id,
      });
      return entityKey;
    }),
  );

  for (const r of emailResults) {
    if (r.status === 'fulfilled') {
      emailsQueued.push(`batch_enrollment_success:${r.value}`);
    } else {
      errors.push(`enrollment_email: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    }
  }

  const ok = errors.filter((e) => !e.startsWith('invoice:')).length === 0;
  if (!ok || errors.length > 0) {
    console.error('[lms-email/payment-success] side effects incomplete', {
      orderId: order.id,
      source: params.source,
      errors,
      emailsQueued,
      invoiceId,
    });
  }

  return {
    ok,
    invoiceId,
    invoiceCreated,
    emailsQueued,
    errors,
  };
}

/** Back-compat wrapper; access provisioning must run separately before this. */
async function _handleLmsPaymentSucceededTransactionalSideEffects(params: {
  orderId: string;
  source: string;
  authUserId?: string | null;
  studentId?: string | null;
  studentEmail?: string | null;
  collegeSlug?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const source =
    params.source === 'verify' || params.source === 'webhook' || params.source === 'manual_retry'
      ? params.source
      : 'verify';

  await ensurePaymentSuccessSideEffects({
    ...params,
    source,
  });
}

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSupplierConfig } from '@/lib/lms/billing/supplier-config';
import { createOrGetInvoiceForNotePaymentOrder } from '@/lib/lms/billing/invoices';
import { buildStudentDashboardUrl } from './dashboard-url';
import { resolvePurchasedEntityPresentation } from './entity-access';
import { buildPaymentConfirmationEmail } from './templates/payment-confirmation';
import { buildBatchEnrollmentSuccessEmail } from './templates/batch-enrollment-success';
import { EMAIL_BRAND } from './templates/email-brand';
import { queueAndMaybeProcessLmsEmail } from './processor';
import {
  buildNotesAccessConfirmationOutboxPayload,
  buildNotesPaymentConfirmationOutboxPayload,
} from './note-outbox-payload';

export type EnsureNotePaymentSuccessSideEffectsResult = {
  ok: boolean;
  skipped?: boolean;
  invoiceId?: string;
  emailsQueued: string[];
  errors: string[];
};

/**
 * Queue payment + access emails for paid note_collection purchases.
 * Reuses the shared LMS invoice + payment email templates/outbox.
 */
export async function ensureNotePaymentSuccessSideEffects(params: {
  notePaymentOrderId: string;
  source: 'verify' | 'webhook' | 'manual_retry';
  collegeSlug?: string;
}): Promise<EnsureNotePaymentSuccessSideEffectsResult> {
  const errors: string[] = [];
  const emailsQueued: string[] = [];
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from('note_payment_orders')
    .select(
      'id, student_id, note_collection_id, status, amount_minor, currency, gateway_payment_id, paid_at, metadata',
    )
    .eq('id', params.notePaymentOrderId)
    .maybeSingle();

  if (orderError || !order) {
    return { ok: false, skipped: true, emailsQueued, errors: ['note_order_not_found'] };
  }

  if (order.status !== 'paid') {
    return { ok: false, skipped: true, emailsQueued, errors: ['note_order_not_paid'] };
  }

  const amountRupees = Number(order.amount_minor) || 0;
  if (amountRupees <= 0) {
    return { ok: true, skipped: true, emailsQueued, errors: [] };
  }
  const totalMinorPaise = Math.round(amountRupees * 100);

  const { data: studentRow } = await admin
    .from('students')
    .select('id, user_id')
    .eq('id', order.student_id)
    .maybeSingle();

  const authUserId = (studentRow as { user_id?: string } | null)?.user_id;
  if (!authUserId) {
    return { ok: false, emailsQueued, errors: ['missing_auth_user'] };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', authUserId)
    .maybeSingle();

  const email = profile?.email?.trim();
  if (!email) {
    console.error('[lms-email/notes-payment] missing recipient email', {
      notePaymentOrderId: order.id,
      source: params.source,
    });
    return { ok: false, emailsQueued, errors: ['missing_recipient_email'] };
  }

  const presentation = await resolvePurchasedEntityPresentation({
    entityType: 'note_collection',
    entityId: order.note_collection_id,
    collegeSlug: params.collegeSlug,
  });

  const supplier = getSupplierConfig();
  const dashboardUrl = buildStudentDashboardUrl(params.collegeSlug);
  const purchaserName = profile?.full_name ?? email;

  let invoiceId: string | undefined;
  let invoiceNumber: string | undefined;
  let downloadUrl: string | undefined;

  try {
    const invoiceResult = await createOrGetInvoiceForNotePaymentOrder(order.id);
    invoiceId = invoiceResult.invoice.id;
    invoiceNumber = invoiceResult.invoice.invoice_number;
    downloadUrl = invoiceResult.downloadUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`invoice: ${message}`);
    console.error('[lms-email/notes-payment] invoice failed', {
      notePaymentOrderId: order.id,
      source: params.source,
      error: message,
    });
  }

  try {
    const paymentEmail = buildPaymentConfirmationEmail({
      purchaserName,
      entityName: presentation.title,
      entityLabel: presentation.typeLabel,
      purchaseTypeLabel: presentation.typeLabel,
      orderId: order.id,
      invoiceNumber: invoiceNumber ?? null,
      totalMinor: totalMinorPaise,
      paidAtLabel: new Date(order.paid_at ?? Date.now()).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      }),
      invoiceDownloadUrl: downloadUrl ?? null,
      dashboardUrl,
      primaryCtaUrl: presentation.accessUrl,
      primaryCtaLabel: presentation.primaryCtaLabel,
      paymentId: order.gateway_payment_id ?? undefined,
      supportEmail: supplier.supportEmail,
      accessMessage:
        'Your notes purchase is confirmed. Access should be available from your notes library shortly.',
    });

    const paymentOutbox = buildNotesPaymentConfirmationOutboxPayload({
      notePaymentOrderId: order.id,
      noteCollectionId: order.note_collection_id,
      source: params.source,
    });

    await queueAndMaybeProcessLmsEmail({
      eventType: 'payment_confirmation',
      userId: authUserId,
      studentId: order.student_id,
      orderId: paymentOutbox.orderId,
      notePaymentOrderId: paymentOutbox.notePaymentOrderId,
      invoiceId,
      toEmail: email,
      subject: paymentEmail.subject,
      htmlBody: paymentEmail.html,
      textBody: paymentEmail.text,
      category: 'payment_confirmation',
      idempotencyKey: paymentOutbox.idempotencyKey,
      metadata: paymentOutbox.metadata,
    });
    emailsQueued.push('payment_confirmation');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`payment_confirmation_email: ${message}`);
    console.error('[lms-email/notes-payment] payment confirmation failed', {
      notePaymentOrderId: order.id,
      source: params.source,
      error: message,
    });
  }

  try {
    const { data: entitlement } = await admin
      .from('student_note_entitlements')
      .select('id, valid_until')
      .eq('student_id', order.student_id)
      .eq('note_collection_id', order.note_collection_id)
      .eq('source_order_id', order.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!entitlement) {
      console.info('[lms-email/notes-payment] skipping access email — entitlement missing', {
        notePaymentOrderId: order.id,
        source: params.source,
      });
    } else {
      const validUntilLabel = entitlement.valid_until
        ? new Date(entitlement.valid_until as string).toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
          })
        : undefined;

      const accessEmail = buildBatchEnrollmentSuccessEmail({
        purchaserName,
        entityTitle: presentation.title,
        entityTypeLabel: presentation.typeLabel,
        accessUrl: presentation.accessUrl,
        dashboardUrl,
        supportEmail: supplier.supportEmail,
        programName: EMAIL_BRAND.programName,
        primaryCtaLabel: presentation.primaryCtaLabel,
        validUntilLabel,
        statusPill: 'ACCESS ACTIVATED',
        heroTitle: 'Notes Access Confirmed',
        summaryTitle: 'Access summary',
        statusLabel: 'Access Status',
        accessMessage: `Your notes access for ${presentation.title} has been activated successfully.`,
      });

      const accessOutbox = buildNotesAccessConfirmationOutboxPayload({
        notePaymentOrderId: order.id,
        noteCollectionId: order.note_collection_id,
        authUserId,
        source: params.source,
      });

      await queueAndMaybeProcessLmsEmail({
        eventType: 'batch_enrollment_success',
        userId: authUserId,
        studentId: order.student_id,
        orderId: accessOutbox.orderId,
        notePaymentOrderId: accessOutbox.notePaymentOrderId,
        toEmail: email,
        subject: accessEmail.subject,
        htmlBody: accessEmail.html,
        textBody: accessEmail.text,
        category: 'batch_enrollment_success',
        idempotencyKey: accessOutbox.idempotencyKey,
        metadata: accessOutbox.metadata,
      });
      emailsQueued.push('batch_enrollment_success');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`access_email: ${message}`);
    console.error('[lms-email/notes-payment] access email failed', {
      notePaymentOrderId: order.id,
      source: params.source,
      error: message,
    });
  }

  if (authUserId) {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(`student-payment-history-${authUserId}`, 'max');
  }

  return {
    ok: errors.filter((e) => !e.startsWith('invoice:')).length === 0,
    invoiceId,
    emailsQueued,
    errors,
  };
}

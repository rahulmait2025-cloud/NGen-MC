import 'server-only';

/*
 * This module uses createAdminClient (service role) to bypass RLS because
 * application-level auth checks are enforced at the calling sites.
 * RLS is not relied upon for authorization here.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { QueueLmsEmailInput, QueueLmsEmailResult } from './types';

/**
 * Queue a transactional email with booking/order-scoped idempotency.
 *
 * Behaviour:
 * - sent / queued / sending → skip insert (no duplicate delivery row)
 * - failed → re-arm the existing row for the shared processor (no second row)
 * - missing → insert queued
 *
 * Does not create a competing delivery path; retries go through processLmsEmailOutboxBatch.
 */
export async function queueLmsEmail(input: QueueLmsEmailInput): Promise<QueueLmsEmailResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('lms_email_outbox')
    .select('id, status, attempts')
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();

  if (existing?.id) {
    const status = String(existing.status ?? '');

    if (status === 'sent' || status === 'queued' || status === 'sending') {
      return { ok: true, outboxId: existing.id as string, skipped: true };
    }

    if (status === 'failed') {
      // Re-arm for the existing processor. Do not insert a second row
      // (would hit unique idempotency_key and become a permanent no-op).
      const attempts = typeof existing.attempts === 'number' ? existing.attempts : 0;
      const patch: Record<string, unknown> = {
        status: 'queued',
        next_attempt_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: null,
      };
      // Exhausted attempt budget: allow one more processor cycle when the
      // application explicitly re-queues (webhook/booking retry). Cron alone
      // still respects attempts < 5 until re-armed here.
      if (attempts >= 5) {
        patch.attempts = 0;
      }

      const { error: rearmError } = await admin
        .from('lms_email_outbox')
        .update(patch)
        .eq('id', existing.id)
        .eq('status', 'failed');

      if (rearmError) {
        console.error('[lms-email/outbox] failed row re-arm failed', {
          eventType: input.eventType,
          outboxId: existing.id,
          error: rearmError.message,
        });
        return { ok: false, skipped: false, error: rearmError.message };
      }

      return { ok: true, outboxId: existing.id as string, skipped: false };
    }

    // Unknown status — treat as present to avoid duplicates.
    return { ok: true, outboxId: existing.id as string, skipped: true };
  }

  // order_id FKs to public.orders — never store note_payment_orders.id there.
  const orderId = input.orderId ?? null;
  const notePaymentOrderId = input.notePaymentOrderId?.trim() || null;
  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
  };
  if (notePaymentOrderId) {
    metadata.note_payment_order_id = notePaymentOrderId;
  }

  const { data, error } = await admin
    .from('lms_email_outbox')
    .insert({
      event_type: input.eventType,
      user_id: input.userId ?? null,
      student_id: input.studentId ?? null,
      order_id: orderId,
      invoice_id: input.invoiceId ?? null,
      to_email: input.toEmail.trim(),
      subject: input.subject,
      html_body: input.htmlBody,
      text_body: input.textBody,
      category: input.category,
      status: 'queued',
      idempotency_key: input.idempotencyKey,
      metadata,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: dup } = await admin
        .from('lms_email_outbox')
        .select('id, status')
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle();

      // Race: another inserter won. If that row is failed, re-arm it.
      if (dup?.id && String(dup.status) === 'failed') {
        await admin
          .from('lms_email_outbox')
          .update({
            status: 'queued',
            next_attempt_at: new Date().toISOString(),
            locked_at: null,
            locked_by: null,
          })
          .eq('id', dup.id)
          .eq('status', 'failed');
        return { ok: true, outboxId: dup.id as string, skipped: false };
      }

      return { ok: true, outboxId: dup?.id as string | undefined, skipped: true };
    }
    console.error('[lms-email/outbox] queue failed', {
      eventType: input.eventType,
      orderId,
      notePaymentOrderId,
      error: error.message,
    });
    return { ok: false, skipped: false, error: error.message };
  }

  return { ok: true, outboxId: data.id as string, skipped: false };
}

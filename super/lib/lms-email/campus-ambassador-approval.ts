import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send-email';
import { buildCampusAmbassadorApprovalEmail } from './campus-ambassador-approval-content';

export { buildCampusAmbassadorApprovalEmail } from './campus-ambassador-approval-content';

async function triggerLmsOutboxWorker(): Promise<void> {
  const base = (
    process.env.NEXT_PUBLIC_LMS_URL ??
    process.env.NEXT_PUBLIC_STUDENT_APP_URL ??
    ''
  ).replace(/\/$/, '');
  const secret = process.env.CRON_SECRET?.trim();
  if (!base || !secret) return;

  try {
    await fetch(`${base}/api/cron/lms-transactional-email`, {
      method: 'POST',
      headers: {
        'x-cron-secret': secret,
        Authorization: `Bearer ${secret}`,
      },
    });
  } catch (err) {
    console.warn('[CA] LMS outbox worker trigger failed', err);
  }
}

async function sendQueuedApprovalEmail(params: {
  outboxId: string;
  toEmail: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const result = await sendEmail({
    to: params.toEmail,
    subject: params.subject,
    html: params.html,
    text: params.text,
    category: 'transactional_essential',
    idempotencyKey: params.idempotencyKey,
  });

  if (result.ok) {
    await admin
      .from('lms_email_outbox')
      .update({
        status: 'sent',
        provider: result.provider,
        provider_message_id: result.messageId ?? null,
        sent_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: null,
        attempts: 1,
      })
      .eq('id', params.outboxId)
      .eq('status', 'queued');
    return { ok: true };
  }

  await admin
    .from('lms_email_outbox')
    .update({
      status: 'failed',
      attempts: 1,
      last_error: result.errorMessage ?? result.errorCode ?? 'send_failed',
      next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
      locked_at: null,
      locked_by: null,
    })
    .eq('id', params.outboxId);

  return { ok: false, error: result.errorMessage ?? result.errorCode ?? 'send_failed' };
}

export async function queueCampusAmbassadorApprovalEmail(params: {
  applicationId: string;
  userId: string;
  fullName: string;
  email: string;
  collegeSlug?: string | null;
  couponCode?: string | null;
  /** Approval-transition timestamp (`applications.reviewed_at`). Required. */
  approvalLifecycleId: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!params.approvalLifecycleId?.trim()) {
    return { ok: false, error: 'approvalLifecycleId is required' };
  }

  const admin = createAdminClient();
  const content = buildCampusAmbassadorApprovalEmail(params);
  const idempotencyKey = `campus_ambassador_approval:application:${params.applicationId}:lifecycle:${params.approvalLifecycleId}`;
  const toEmail = params.email.trim().toLowerCase();

  const { data: existing } = await admin
    .from('lms_email_outbox')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing?.id) {
    if (existing.status === 'queued' || existing.status === 'failed') {
      const sendResult = await sendQueuedApprovalEmail({
        outboxId: existing.id,
        toEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
        idempotencyKey,
      });
      if (!sendResult.ok) {
        void triggerLmsOutboxWorker();
        return { ok: true, skipped: true, error: sendResult.error };
      }
    }
    return { ok: true, skipped: true };
  }

  const { data: inserted, error } = await admin
    .from('lms_email_outbox')
    .insert({
      event_type: 'campus_ambassador_approval',
      user_id: params.userId,
      to_email: toEmail,
      subject: content.subject,
      html_body: content.html,
      text_body: content.text,
      category: 'transactional_essential',
      status: 'queued',
      idempotency_key: idempotencyKey,
      metadata: {
        application_id: params.applicationId,
        coupon_code: params.couponCode ?? null,
        approval_lifecycle_id: params.approvalLifecycleId,
      },
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') return { ok: true, skipped: true };
    console.error('[CA] approval email queue failed', error.message);
    return { ok: false, error: error.message };
  }

  if (!inserted?.id) {
    return { ok: false, error: 'Outbox insert returned no id' };
  }

  const sendResult = await sendQueuedApprovalEmail({
    outboxId: inserted.id,
    toEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    idempotencyKey,
  });

  if (!sendResult.ok) {
    void triggerLmsOutboxWorker();
    console.error('[CA] approval email send failed; left queued for LMS worker', sendResult.error);
    // Approval itself succeeded; keep outbox for cron/retry
    return { ok: true, error: sendResult.error };
  }

  return { ok: true, skipped: false };
}

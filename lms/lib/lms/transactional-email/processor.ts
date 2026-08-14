import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send-email';
import { inspectEmailConfig } from '@/lib/email/config';
import type { EmailCategory } from '@/lib/email/types';
import type { ProcessLmsEmailOutboxResult } from './types';

const LOCK_TTL_MS = 5 * 60 * 1000;

function backoffMinutes(attempts: number): number {
  return Math.min(60, Math.pow(2, Math.max(0, attempts - 1)));
}

export async function processLmsEmailOutboxBatch(options?: {
  limit?: number;
  lockBy?: string;
}): Promise<ProcessLmsEmailOutboxResult> {
  const limit = Math.min(options?.limit ?? 25, 50);
  const lockBy = options?.lockBy ?? `worker:${Date.now()}`;
  const admin = createAdminClient();
  const inspected = inspectEmailConfig();

  if (!inspected.ready && !inspected.dryRun) {
    console.warn('[lms-email/processor] email config not ready', { issues: inspected.issues });
    return { processed: 0, sent: 0, failed: 0 };
  }

  const staleBefore = new Date(Date.now() - LOCK_TTL_MS).toISOString();
  await admin
    .from('lms_email_outbox')
    .update({ locked_at: null, locked_by: null, status: 'queued' })
    .eq('status', 'sending')
    .lt('locked_at', staleBefore);

  const { data: candidates, error: selectError } = await admin
    .from('lms_email_outbox')
    .select('id')
    .in('status', ['queued', 'failed'])
    .lte('next_attempt_at', new Date().toISOString())
    .lt('attempts', 5)
    .is('locked_at', null)
    .order('next_attempt_at', { ascending: true })
    .limit(limit);

  if (selectError || !candidates?.length) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  type EmailOutcome = { kind: 'sent' } | { kind: 'failed' } | { kind: 'skipped' };

  async function processOneEmail(row: { id: string }): Promise<EmailOutcome> {
    const outboxId = row.id as string;
    const nowIso = new Date().toISOString();

    try {
      const { data: locked } = await admin
        .from('lms_email_outbox')
        .update({ status: 'sending', locked_at: nowIso, locked_by: lockBy })
        .eq('id', outboxId)
        .in('status', ['queued', 'failed'])
        .is('locked_at', null)
        .select('id, event_type, order_id, to_email, subject, html_body, text_body, category, attempts, idempotency_key')
        .maybeSingle();

      if (!locked) return { kind: 'skipped' };

      const result = await sendEmail({
        to: locked.to_email as string,
        subject: locked.subject as string,
        html: locked.html_body as string,
        text: locked.text_body as string,
        category: locked.category as EmailCategory,
        idempotencyKey: locked.idempotency_key as string,
      });

      const attempts = (locked.attempts as number) + 1;

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
            attempts,
          })
          .eq('id', outboxId);
        return { kind: 'sent' };
      } else {
        const nextAttempt = new Date(Date.now() + backoffMinutes(attempts) * 60_000).toISOString();
        await admin
          .from('lms_email_outbox')
          .update({
            status: 'failed',
            attempts,
            last_error: result.errorMessage ?? result.errorCode ?? 'send_failed',
            next_attempt_at: nextAttempt,
            locked_at: null,
            locked_by: null,
          })
          .eq('id', outboxId);
        return { kind: 'failed' };
      }
    } catch (err) {
      const attempts = 1;
      const nextAttempt = new Date(Date.now() + backoffMinutes(attempts) * 60_000).toISOString();
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await admin
        .from('lms_email_outbox')
        .update({
          status: 'failed',
          attempts,
          last_error: msg,
          next_attempt_at: nextAttempt,
          locked_at: null,
          locked_by: null,
        })
        .eq('id', outboxId);
      return { kind: 'failed' };
    }
  }

  // Sequential batches: rate-limited email sending — batches processed sequentially to respect provider limits
  const CONCURRENCY = 5;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const chunk = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(processOneEmail));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.kind === 'sent') sent++;
        else if (r.value.kind === 'failed') failed++;
      } else {
        failed++;
      }
    }
  }

  return { processed: sent + failed, sent, failed };
}

export async function queueAndMaybeProcessLmsEmail(
  input: Parameters<typeof import('./outbox').queueLmsEmail>[0],
): Promise<void> {
  const { queueLmsEmail } = await import('./outbox');
  const queued = await queueLmsEmail(input);
  if (!queued.ok) return;
  try {
    await processLmsEmailOutboxBatch({ limit: 5, lockBy: 'inline' });
  } catch (err) {
    console.warn('[lms-email/processor] inline process failed', {
      eventType: input.eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

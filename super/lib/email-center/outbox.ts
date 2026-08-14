import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderCampaignContent } from './template-renderer';
import { getCampaignById } from './campaigns';
import { injectTrackingLinks } from './tracking';
import { createUnsubscribeToken } from './tokens';
import { getTemplateById } from './templates';
import {
  getSystemValuesForEmailMerge,
  buildTemplateSampleValues,
  mergeSendVariables,
  normalizeTemplateVariables,
} from './template-variables';
import { deriveRecipientName } from './recipient-name';
import { getEmailCenterAppBaseUrl } from './brand-links';
import { getCampaignEmailCategory } from '@/lib/email-center/email-category';
import { isEmailSuppressedForLane } from '@/lib/email-center/tokens';
import {
  buildCareerEmailShellMerge,
  usesCareerEmailShellMerge,
} from './career-launch-merge';
import {
  buildEmailHeaderDisplay,
  normalizeRecipientCollegeName,
  resolveEmailAudienceBrandMode,
} from './email-header-branding';
import { parseComposerState } from './custom-composer';
import {
  mergeSenderIntoComposerState,
  resolveCampaignSender,
  type EmailSenderSnapshot,
} from './sender-profiles';
import {
  summarizeEmailHtmlValidation,
  validateFinalEmailHtml,
} from './email-html-validation';

/** When migration 00332 is not applied, inserts omit sender columns. */
let outboxSenderColumnsAvailable: boolean | null = null;

type OutboxInsertRow = {
  campaign_id: string;
  recipient_id: string;
  to_email: string;
  subject: string;
  preview_text: string | null;
  html_body: string;
  text_body: string;
  category: string;
  status: string;
  idempotency_key: string;
  next_attempt_at: string;
  sender_profile_id?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
};

function stripOutboxSenderColumns(row: OutboxInsertRow): OutboxInsertRow {
  const {
    sender_profile_id: _a,
    from_name: _b,
    from_email: _c,
    reply_to: _d,
    ...rest
  } = row;
  return rest;
}

function looksLikeMissingSenderColumnError(message: string | undefined): boolean {
  if (!message) return false;
  return /sender_profile_id|from_name|from_email|reply_to|column/i.test(message);
}

export async function queueCampaignOutbox(
  campaignId: string
): Promise<{ ok: boolean; queuedCount: number; suppressedCount: number; error?: string }> {
  const admin = createAdminClient();

  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { ok: false, queuedCount: 0, suppressedCount: 0, error: 'Campaign not found' };

  if (campaign.status === 'sending' || campaign.status === 'sent' || campaign.status === 'cancelled') {
    return { ok: false, queuedCount: 0, suppressedCount: 0, error: `Campaign is already ${campaign.status}. Cannot queue again.` };
  }

  const emailCategory = getCampaignEmailCategory(campaign);

  const isCustomComposer =
    campaign.content_mode === 'custom_composer' || Boolean(parseComposerState(campaign.composer_state));

  let senderSnapshot: EmailSenderSnapshot | null = null;
  if (isCustomComposer) {
    const senderResolved = resolveCampaignSender(campaign.composer_state);
    if (!senderResolved.ok) {
      return { ok: false, queuedCount: 0, suppressedCount: 0, error: senderResolved.error };
    }
    senderSnapshot = senderResolved.snapshot;
    // Freeze send-time snapshot so retries keep the confirmed sender.
    const lockedState = mergeSenderIntoComposerState(
      (campaign.composer_state && typeof campaign.composer_state === 'object'
        ? (campaign.composer_state as Record<string, unknown>)
        : {}) as Record<string, unknown>,
      senderSnapshot.profileId,
      { lockSnapshot: true },
    );
    await admin
      .from('email_campaigns')
      .update({ composer_state: lockedState })
      .eq('id', campaignId);
    campaign.composer_state = lockedState;
  }

  const template = campaign.template_id ? await getTemplateById(campaign.template_id) : null;
  const templateVariables = normalizeTemplateVariables(template?.variables ?? []);
  const templateSampleValues = buildTemplateSampleValues(templateVariables);
  const campaignValues = (campaign.template_variable_values ?? {}) as Record<string, string>;

  const careerEmailShell = usesCareerEmailShellMerge(template?.slug);

  const sendAfterAt = new Date().toISOString();

  const { data: recipients, error: recError } = await admin
    .from('email_campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'snapshotted');

  if (recError) return { ok: false, queuedCount: 0, suppressedCount: 0, error: recError.message };
  if (!recipients || recipients.length === 0) {
    return { ok: false, queuedCount: 0, suppressedCount: 0, error: 'No snapshotted recipients to queue.' };
  }

  let collegeSlugById = new Map<string, string>();
  if (careerEmailShell) {
    const collegeIdsForSlug = [
      ...new Set(
        recipients
          .map((row: { college_id?: string | null }) => row.college_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ];
    if (collegeIdsForSlug.length > 0) {
      const { data: collegeRows, error: collegeSlugError } = await admin
        .from('colleges')
        .select('id, slug')
        .in('id', collegeIdsForSlug);
      if (collegeSlugError) {
        console.error('[email-center] college slug lookup:', collegeSlugError.message);
      } else {
        collegeSlugById = new Map(
          (collegeRows ?? []).map((c: { id: string; slug: string }) => [c.id, c.slug]),
        );
      }
    }
  }

  const outboxRows: OutboxInsertRow[] = [];

  const recipientIds: string[] = [];
  const suppressedRecipientIds: string[] = [];
  let suppressedCount = 0;

  const processedResults = await Promise.allSettled(
    recipients.map(async (r) => {
      const suppression = await isEmailSuppressedForLane(r.email, emailCategory);
      if (suppression.suppressed) {
        return { type: 'suppressed' as const, id: r.id };
      }

      const unsubscribeToken = await createUnsubscribeToken({
        email: r.email,
        campaignId,
        recipientId: r.id,
      });

      const unsubscribeUrl = `${getEmailCenterAppBaseUrl()}/email/preferences/${unsubscribeToken}`;

      const recipientValues = { ...(r.variables ?? {}) } as Record<string, string>;
      const derived = deriveRecipientName(
        {
          first_name: recipientValues.first_name ?? r.first_name,
          full_name: recipientValues.full_name ?? r.full_name,
          email: r.email,
        },
        { recipientType: r.recipient_type }
      );
      recipientValues.first_name = derived.first_name;
      recipientValues.full_name = derived.full_name;
      const resolvedCollegeName = normalizeRecipientCollegeName(
        r.college_name ?? recipientValues.college_name
      );
      recipientValues.college_name = resolvedCollegeName ?? '';

      const mergedVariables = mergeSendVariables({
        templateSampleValues,
        systemValues: getSystemValuesForEmailMerge(),
        campaignValues,
        recipientValues,
        unsubscribeUrl,
        recipientEmail: r.email,
        recipientFallback: 'there',
      });

      if (careerEmailShell && template?.slug) {
        const slug =
          (r.college_id && collegeSlugById.get(r.college_id)) ??
          String((recipientValues as { college_slug?: string }).college_slug ?? '');
        const programName = String(campaignValues.program_name ?? mergedVariables.program_name ?? '');
        const collegeName = resolvedCollegeName ?? '';
        Object.assign(
          mergedVariables,
          buildCareerEmailShellMerge({
            slug: template.slug,
            previewTextRaw: campaign.preview_text ?? template.preview_text_template ?? '',
            mergedVariables: mergedVariables as Record<string, string>,
            programName,
            collegeName,
            collegeSlug: slug,
          }),
        );
      } else if (
        campaign.content_mode === 'custom_composer'
        || parseComposerState(campaign.composer_state)
        || (!campaign.template_id && (campaign.html_body ?? '').includes('{{email_header_display}}'))
      ) {
        // Custom Email shell: branding by explicit audience context (manual = external).
        const brandMode = resolveEmailAudienceBrandMode({
          recipientType: r.recipient_type,
          audienceMode: (campaign.audience_config as { custom_audience_mode?: 'platform' | 'external' } | null)
            ?.custom_audience_mode,
        });
        mergedVariables.email_header_display = buildEmailHeaderDisplay(resolvedCollegeName, {
          audienceMode: brandMode,
        });
        mergedVariables.college_name =
          brandMode === 'external' ? '' : (resolvedCollegeName ?? '');
      }

      const rendered = renderCampaignContent(
        campaign.subject,
        campaign.preview_text,
        campaign.html_body,
        campaign.text_body,
        mergedVariables
      );

      const htmlCheck = validateFinalEmailHtml(rendered.html, {
        requireSocialDestinations: /Follow us on|instagram\.com/i.test(rendered.html),
      });
      if (!htmlCheck.ok) {
        console.error(
          '[email-center] final HTML validation failed:',
          summarizeEmailHtmlValidation(htmlCheck, { campaignId }),
        );
        throw new Error(
          `Email HTML validation failed (${htmlCheck.issues.map((i) => i.code).join(', ')})`,
        );
      }

      const tracked = await injectTrackingLinks(
        rendered.html,
        rendered.text,
        campaignId,
        r.id,
        r.email,
        unsubscribeUrl
      );

      const idempotencyKey = `email-center:${campaignId}:${r.id}`;

      return {
        type: 'queued' as const,
        id: r.id,
        row: {
          campaign_id: campaignId,
          recipient_id: r.id,
          to_email: r.email,
          subject: rendered.subject,
          preview_text: rendered.previewText || null,
          html_body: tracked.html,
          text_body: tracked.text,
          category: emailCategory,
          status: 'queued',
          idempotency_key: idempotencyKey,
          next_attempt_at: sendAfterAt,
          ...(senderSnapshot
            ? {
                sender_profile_id: senderSnapshot.profileId,
                from_name: senderSnapshot.fromName,
                from_email: senderSnapshot.fromEmail,
                reply_to: senderSnapshot.replyTo,
              }
            : {}),
        },
      };
    }),
  );

  for (const r of processedResults) {
    if (r.status === 'fulfilled') {
      if (r.value.type === 'suppressed') {
        suppressedCount++;
        suppressedRecipientIds.push(r.value.id);
      } else {
        outboxRows.push(r.value.row);
        recipientIds.push(r.value.id);
      }
    } else {
      console.error(`[email-center] render error:`, r.reason);
    }
  }

  if (suppressedRecipientIds.length > 0) {
    await admin
      .from('email_campaign_recipients')
      .update({
        status: 'suppressed',
        suppression_reason: 'preference_opt_out',
      })
      .in('id', suppressedRecipientIds);
  }

  if (outboxRows.length === 0) {
    const onlySuppressed = suppressedCount > 0 && suppressedCount === recipients.length;
    return {
      ok: false,
      queuedCount: 0,
      suppressedCount,
      error: onlySuppressed
        ? 'All snapshotted recipients are suppressed by email preferences.'
        : 'No recipients could be queued due to rendering errors or preference suppression.',
    };
  }

  const insertErrors: string[] = [];
  let insertedCount = 0;

  const insertBatches: typeof outboxRows[] = [];
  for (let i = 0; i < outboxRows.length; i += 50) {
    insertBatches.push(outboxRows.slice(i, i + 50));
  }

  const insertResults = await Promise.allSettled(
    insertBatches.map(async (batch) => {
      const payload =
        outboxSenderColumnsAvailable === false
          ? batch.map(stripOutboxSenderColumns)
          : batch;
      const first = await admin.from('email_outbox').insert(payload).select('id');
      if (
        first.error
        && outboxSenderColumnsAvailable !== false
        && looksLikeMissingSenderColumnError(first.error.message)
        && senderSnapshot
      ) {
        outboxSenderColumnsAvailable = false;
        return admin.from('email_outbox').insert(batch.map(stripOutboxSenderColumns)).select('id');
      }
      if (!first.error && senderSnapshot) {
        outboxSenderColumnsAvailable = true;
      }
      return first;
    }),
  );

  for (const r of insertResults) {
    if (r.status === 'fulfilled') {
      const { error, data } = r.value;
      const batchInserted = data?.length ?? 0;
      if (error) {
        if (error.message?.includes('email_outbox_idempotency_key')) {
          insertedCount += batchInserted;
        } else {
          insertErrors.push(error.message);
        }
      } else {
        insertedCount += batchInserted;
      }
    } else {
      insertErrors.push(r.reason?.message ?? 'Insert failed');
    }
  }

  await admin
    .from('email_campaign_recipients')
    .update({ status: 'queued' })
    .in('id', recipientIds);

  await admin
    .from('email_campaigns')
    .update({
      status: 'sending',
      queued_count: insertedCount,
      skipped_count: suppressedCount,
      queued_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (insertErrors.length > 0) {
    return {
      ok: true,
      queuedCount: insertedCount,
      suppressedCount,
      error: `Partial queue: ${insertErrors.join('; ')}`,
    };
  }

  return { ok: true, queuedCount: insertedCount, suppressedCount };
}

export async function pauseCampaign(campaignId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('email_campaigns')
    .update({ status: 'draft' })
    .eq('id', campaignId)
    .eq('status', 'sending');
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function cancelCampaign(campaignId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const [, campaignResult] = await Promise.allSettled([
    admin
      .from('email_outbox')
      .update({ status: 'cancelled' })
      .eq('campaign_id', campaignId)
      .in('status', ['queued', 'failed']),
    admin
      .from('email_campaigns')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('status', 'sending'),
  ]);

  if (campaignResult.status === 'rejected') {
    return { ok: false, error: campaignResult.reason?.message };
  }
  if (campaignResult.status === 'fulfilled' && campaignResult.value.error) {
    return { ok: false, error: campaignResult.value.error.message };
  }
  return { ok: true };
}

export async function retryFailedOutbox(campaignId: string): Promise<{ ok: boolean; retryCount: number; error?: string }> {
  const admin = createAdminClient();

  const { data: failedRows, error: fetchError } = await admin
    .from('email_outbox')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('status', 'failed');

  if (fetchError) return { ok: false, retryCount: 0, error: fetchError.message };
  if (!failedRows || failedRows.length === 0) return { ok: true, retryCount: 0 };

  const ids = failedRows.map((r) => r.id);

  const { error } = await admin
    .from('email_outbox')
    .update({
      status: 'queued',
      locked_at: null,
      locked_by: null,
      next_attempt_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) return { ok: false, retryCount: 0, error: error.message };
  return { ok: true, retryCount: ids.length };
}

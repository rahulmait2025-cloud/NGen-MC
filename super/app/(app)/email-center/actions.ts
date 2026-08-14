'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { revalidateEmailCenter } from '@/lib/email-center/cache';
import {
  createCampaign,
  updateCampaign,
  duplicateCampaign as duplicateCampaignService,
  getCampaignById,
} from '@/lib/email-center/campaigns';
import { sendTestEmail as sendTestEmailService } from '@/lib/email-center/test-send';
import {
  validateCreateCampaign,
  validateUpdateCampaign,
  validateSendTestEmail,
  validateDuplicateCampaign,
} from '@/lib/email-center/validation';
import { resolveAudiencePreview, audienceConfigSchema } from '@/lib/email-center/audience';
import type { AudiencePreviewResult } from '@/lib/email-center/audience';
import { snapshotRecipients } from '@/lib/email-center/recipients';
import { pauseCampaign, cancelCampaign, retryFailedOutbox } from '@/lib/email-center/outbox';
import { sendCampaignNow, continueSendingCampaign } from '@/lib/email-center/send-campaign-now';
import { requestCampaignApproval as requestApprovalService, approveCampaign as approveCampaignService, rejectCampaign as rejectCampaignService, cancelApprovalRequest as cancelApprovalRequestService } from '@/lib/email-center/approvals';
import {
  approvalActionSchema,
} from '@/lib/email-center/types';
import { stripRecipientKeysFromCampaignValues } from '@/lib/email-center/template-variables';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import {
  getCampaignEmailCategory,
  laneToLegacyCampaignType,
  normalizeEmailCenterLane,
} from '@/lib/email-center/email-category';
import {
  compileCustomEmail,
  parseComposerState,
  validateComposerState,
  type CampaignContentMode,
} from '@/lib/email-center/custom-composer';
import { sanitizeComposerBodyHtml } from '@/lib/email-center/composer-sanitize';
import { mapCampaignDraftError } from '@/lib/email-center/campaign-draft-save';
import {
  extractSenderProfileIdFromComposerState,
  mergeSenderIntoComposerState,
  resolveSenderProfileForSend,
} from '@/lib/email-center/sender-profiles';

function scheduleCampaignListRevalidation(campaignId?: string) {
  // Do NOT revalidate /email-center/compose here — that blocks the client Server Action
  // await on the current page and leaves Save & Continue stuck on "Rendering…".
  after(() => {
    revalidatePath('/email-center');
    revalidatePath('/email-center/campaigns');
    if (campaignId) {
      revalidatePath(`/email-center/campaigns/${campaignId}`);
    }
  });
}

function parseTemplateVariableValues(value: FormDataEntryValue | null): Record<string, string> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(String(value));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const output: Record<string, string> = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (val !== undefined && val !== null) {
          output[key] = String(val);
        }
      }
      return stripRecipientKeysFromCampaignValues(output);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function parseContentMode(value: FormDataEntryValue | null): CampaignContentMode | undefined {
  const raw = value != null ? String(value) : '';
  if (raw === 'template' || raw === 'custom_composer' || raw === 'legacy_html') return raw;
  return undefined;
}

function parseComposerStateFromForm(value: FormDataEntryValue | null): unknown | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  try {
    return JSON.parse(String(value));
  } catch {
    return undefined;
  }
}

async function prepareCustomComposerPayload(options: {
  contentMode: CampaignContentMode | undefined;
  composerStateRaw: unknown | undefined;
  subject: string;
  previewText: string | null;
  emailCategory: ReturnType<typeof normalizeEmailCenterLane>;
  htmlBodyFallback: string;
  textBodyFallback: string | null;
  requireNonEmptyBody?: boolean;
  /** When updating legacy campaigns, preserve existing compiled HTML instead of client payload. */
  existingHtmlBody?: string | null;
  existingTextBody?: string | null;
  allowLegacyHtmlWrite?: boolean;
}): Promise<
  | { ok: true; content_mode: CampaignContentMode; composer_state: Record<string, unknown> | null; html_body: string; text_body: string }
  | { ok: false; error: string }
> {
  const mode = options.contentMode;

  // Never invent legacy_html from the client on create; never trust client HTML for legacy updates.
  if (mode === 'legacy_html') {
    if (!options.allowLegacyHtmlWrite) {
      return {
        ok: false,
        error: 'Legacy HTML campaigns cannot be created or rewritten from the client. Convert to Custom Email or keep the existing snapshot.',
      };
    }
    return {
      ok: true,
      content_mode: 'legacy_html',
      composer_state: null,
      html_body: options.existingHtmlBody ?? options.htmlBodyFallback,
      text_body: options.existingTextBody ?? options.textBodyFallback ?? '',
    };
  }

  if (mode !== 'custom_composer') {
    return {
      ok: true,
      content_mode: mode ?? (options.composerStateRaw ? 'custom_composer' : 'template'),
      composer_state: null,
      // Template path still uses snapshotted template HTML from the client (pre-existing behaviour).
      html_body: options.htmlBodyFallback,
      text_body: options.textBodyFallback ?? '',
    };
  }

  const validation = validateComposerState(options.composerStateRaw, {
    subject: options.subject,
    previewText: options.previewText,
    emailCategory: options.emailCategory,
    requireNonEmptyBody: options.requireNonEmptyBody ?? false,
  });

  if (!validation.ok || !validation.state) {
    const firstError = validation.issues.find((i) => i.level === 'error');
    return { ok: false, error: firstError?.message ?? 'Invalid custom email content' };
  }

  let sanitizedBody: string;
  try {
    sanitizedBody = await sanitizeComposerBodyHtml(validation.state.body_html);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to sanitise email body' };
  }

  // Always recompile on the server — never persist client-compiled shell HTML.
  const compiled = compileCustomEmail({
    state: validation.state,
    subject: options.subject,
    previewText: options.previewText,
    emailCategory: options.emailCategory,
    sanitizedBodyHtml: sanitizedBody,
  });

  // Client may submit sender_profile_id only; reject arbitrary From values.
  const requestedSenderId = extractSenderProfileIdFromComposerState(options.composerStateRaw);
  const senderResolved = resolveSenderProfileForSend(requestedSenderId);
  if (!senderResolved.ok) {
    return { ok: false, error: senderResolved.error };
  }

  return {
    ok: true,
    content_mode: 'custom_composer',
    composer_state: mergeSenderIntoComposerState(
      compiled.composer_state as unknown as Record<string, unknown>,
      senderResolved.profile.id,
    ),
    html_body: compiled.html_body,
    text_body: compiled.text_body,
  };
}

export async function createCampaignDraftAction(
  formData: FormData
): Promise<{ ok: true; campaignId: string } | { ok: false; error: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const limited = await consumeRateLimit({
      key: `email-create:${auth.user.id}`,
      limit: 50,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) {
      return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
    }

    const emailCategory = normalizeEmailCenterLane(String(formData.get('email_category') ?? ''));
    const contentMode = parseContentMode(formData.get('content_mode'));
    if (contentMode === 'legacy_html') {
      return {
        ok: false,
        error: 'Cannot create a legacy HTML campaign. Use Custom Email or a predefined template.',
      };
    }
    const composerStateRaw = parseComposerStateFromForm(formData.get('composer_state'));
    const subject = String(formData.get('subject') ?? '');
    const previewText = formData.get('preview_text') ? String(formData.get('preview_text')) : null;

    const prepared = await prepareCustomComposerPayload({
      contentMode: contentMode ?? (!formData.get('template_id') ? 'custom_composer' : 'template'),
      composerStateRaw,
      subject,
      previewText,
      emailCategory,
      // Client-compiled HTML is ignored for custom_composer; server recompiles from composer_state.
      htmlBodyFallback: String(formData.get('html_body') ?? ''),
      textBodyFallback: formData.get('text_body') ? String(formData.get('text_body')) : null,
      requireNonEmptyBody: false,
    });
    if (!prepared.ok) {
      return { ok: false, error: prepared.error };
    }

    const data = {
      name: formData.get('name'),
      email_category: emailCategory,
      campaign_type: laneToLegacyCampaignType(emailCategory),
      template_id: formData.get('template_id') || null,
      content_mode: prepared.content_mode,
      composer_state: prepared.composer_state,
      subject,
      preview_text: previewText,
      html_body: prepared.html_body,
      text_body: prepared.text_body || null,
      template_variable_values: parseTemplateVariableValues(formData.get('template_variable_values')),
    };

    const parsed = validateCreateCampaign(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const campaign = await createCampaign(parsed.data, auth.user.id);
    scheduleCampaignListRevalidation(campaign.id);
    return { ok: true, campaignId: campaign.id };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : 'Failed to create campaign';
    console.error('[email-center] createCampaignDraftAction error:', mapCampaignDraftError(message));
    return { ok: false, error: mapCampaignDraftError(message) };
  }
}

export async function updateCampaignDraftAction(
  formData: FormData
): Promise<{ ok: true; campaignId: string } | { ok: false; error: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const limited = await consumeRateLimit({
      key: `email-update:${auth.user.id}`,
      limit: 80,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) {
      return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
    }

    const emailCategoryRaw = formData.get('email_category');
    const emailCategory =
      emailCategoryRaw != null && String(emailCategoryRaw).length > 0
        ? normalizeEmailCenterLane(String(emailCategoryRaw))
        : undefined;

    const contentMode = parseContentMode(formData.get('content_mode'));
    const composerStateRaw = parseComposerStateFromForm(formData.get('composer_state'));
    const subject = formData.get('subject') ? String(formData.get('subject')) : undefined;
    const previewText =
      formData.get('preview_text') === ''
        ? null
        : formData.get('preview_text')
          ? String(formData.get('preview_text'))
          : undefined;

    const campaignId = String(formData.get('id') ?? '');
    const existing = campaignId ? await getCampaignById(campaignId) : null;
    if (!existing) {
      return { ok: false, error: 'Campaign not found' };
    }

    let contentFields: {
      content_mode?: CampaignContentMode;
      composer_state?: Record<string, unknown> | null;
      html_body?: string;
      text_body?: string | null;
    } = {};

    const resolvedMode =
      contentMode
      ?? (composerStateRaw !== undefined ? 'custom_composer' : undefined)
      ?? (existing.content_mode as CampaignContentMode | undefined);

    if (resolvedMode === 'legacy_html' || (!contentMode && !composerStateRaw && existing.content_mode === 'legacy_html')) {
      // Keep legacy snapshots immutable from the client. Metadata (name/subject/category) may still update.
      contentFields = {
        content_mode: 'legacy_html',
        composer_state: null,
      };
      // Intentionally omit html_body / text_body so updateCampaign does not overwrite.
    } else if (resolvedMode === 'custom_composer' || composerStateRaw !== undefined) {
      const lane = emailCategory ?? getCampaignEmailCategory(existing);
      const prepared = await prepareCustomComposerPayload({
        contentMode: 'custom_composer',
        composerStateRaw,
        subject: subject ?? existing.subject,
        previewText: previewText === undefined ? existing.preview_text : previewText,
        emailCategory: lane,
        htmlBodyFallback: '',
        textBodyFallback: null,
        requireNonEmptyBody: false,
      });
      if (!prepared.ok) {
        return { ok: false, error: prepared.error };
      }
      contentFields = {
        content_mode: prepared.content_mode,
        composer_state: prepared.composer_state,
        html_body: prepared.html_body,
        text_body: prepared.text_body,
      };
    } else if (contentMode === 'template' || existing.template_id) {
      contentFields = {
        content_mode: 'template',
        composer_state: null,
        html_body: formData.get('html_body') ? String(formData.get('html_body')) : undefined,
        text_body: formData.get('text_body') === '' ? null : (formData.get('text_body') ? String(formData.get('text_body')) : undefined),
      };
    }

    const data = {
      id: formData.get('id'),
      name: formData.get('name') || undefined,
      email_category: emailCategory,
      campaign_type: emailCategory ? laneToLegacyCampaignType(emailCategory) : formData.get('campaign_type') || undefined,
      template_id: formData.get('template_id') === '' ? null : (formData.get('template_id') || undefined),
      subject,
      preview_text: previewText,
      template_variable_values: parseTemplateVariableValues(formData.get('template_variable_values')),
      ...contentFields,
    };

    const parsed = validateUpdateCampaign(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    await updateCampaign(parsed.data, auth.user.id);
    scheduleCampaignListRevalidation(parsed.data.id);
    return { ok: true, campaignId: parsed.data.id };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : 'Failed to update campaign';
    console.error('[email-center] updateCampaignDraftAction error:', mapCampaignDraftError(message));
    return { ok: false, error: mapCampaignDraftError(message) };
  }
}

export async function duplicateCampaignAction(
  campaignId: string
): Promise<{ ok: boolean; error?: string; newCampaignId?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const limited = await consumeRateLimit({
      key: `email-duplicate:${auth.user.id}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) {
      return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
    }

    const parsed = validateDuplicateCampaign({ campaign_id: campaignId });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const existing = await getCampaignById(campaignId);
    if (!existing) {
      return { ok: false, error: 'Campaign not found' };
    }

    const duplicated = await duplicateCampaignService(campaignId, auth.user.id);

    revalidatePath('/email-center');
    revalidatePath('/email-center/campaigns');

    return { ok: true, newCampaignId: duplicated.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to duplicate campaign';
    console.error('[email-center] duplicateCampaignAction error:', message);
    return { ok: false, error: message };
  }
}

export async function sendCampaignTestAction(
  campaignId: string,
  testEmail: string,
  previewVariables?: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const limited = await consumeRateLimit({
      key: `email-test:${auth.user.id}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) {
      return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
    }

    const parsed = validateSendTestEmail({
      campaign_id: campaignId,
      test_email: testEmail,
      preview_variables: previewVariables,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const result = await sendTestEmailService(
      parsed.data.campaign_id,
      parsed.data.test_email,
      auth.user.id,
      parsed.data.preview_variables
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    revalidatePath('/email-center');
    revalidatePath('/email-center/campaigns');
    revalidatePath(`/email-center/campaigns/${campaignId}`);

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send test email';
    console.error('[email-center] sendCampaignTestAction error:', message);
    return { ok: false, error: message };
  }
}

export async function previewAudienceAction(
  campaignId: string,
  configJson: string
): Promise<{ ok: boolean; preview?: AudiencePreviewResult; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = audienceConfigSchema.safeParse(JSON.parse(configJson));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid config' };

    const campaign = await getCampaignById(campaignId);
    const preview = await resolveAudiencePreview(
      parsed.data,
      campaign ? getCampaignEmailCategory(campaign) : 'growth_marketing',
    );
    return { ok: true, preview };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Preview failed' };
  }
}

export async function snapshotCampaignRecipientsAction(
  campaignId: string,
  configJson: string
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = audienceConfigSchema.safeParse(JSON.parse(configJson));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid config' };

    const result = await snapshotRecipients(campaignId, parsed.data);

    // Persist audience_config to campaign so it survives reloads
    if (result.ok) {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      await admin
        .from('email_campaigns')
        .update({ audience_config: parsed.data })
        .eq('id', campaignId);
    }

    revalidatePath('/email-center');
    revalidatePath(`/email-center/campaigns/${campaignId}`);

    return { ok: result.ok, count: result.count, error: result.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Snapshot failed' };
  }
}

export async function sendCampaignNowAction(
  campaignId: string,
  confirmSend: boolean,
  options?: { transactionalConfirmed?: boolean }
): Promise<{
  ok: boolean;
  sent?: number;
  failed?: number;
  skipped?: number;
  pending?: number;
  hasMore?: boolean;
  queuedCount?: number;
  suppressedCount?: number;
  error?: string;
}> {
  try {
    if (!confirmSend) {
      return { ok: false, error: 'Send confirmation is required. Set confirmSend=true to proceed.' };
    }

    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const limited = await consumeRateLimit({
      key: `email-send-now:${auth.user.id}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) {
      return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return { ok: false, error: 'Campaign not found' };
    }

    const lane = getCampaignEmailCategory(campaign);
    if (lane === 'transactional_essential' && !options?.transactionalConfirmed) {
      return {
        ok: false,
        error:
          'Transactional emails bypass normal marketing preferences. Confirm essential use before sending.',
      };
    }

    if (campaign.content_mode === 'custom_composer' || parseComposerState(campaign.composer_state)) {
      const validation = validateComposerState(campaign.composer_state, {
        subject: campaign.subject,
        previewText: campaign.preview_text,
        emailCategory: lane,
        transactionalConfirmed: options?.transactionalConfirmed,
        requireNonEmptyBody: true,
      });
      if (!validation.ok) {
        const firstError = validation.issues.find((i) => i.level === 'error');
        return { ok: false, error: firstError?.message ?? 'Custom email validation failed' };
      }
    }

    const result = await sendCampaignNow(campaignId);

    revalidateEmailCenter(campaignId);

    return {
      ok: result.ok,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      pending: result.pending,
      hasMore: result.hasMore,
      queuedCount: result.queuedCount,
      suppressedCount: result.suppressedCount,
      error: result.error,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

export async function continueSendingCampaignAction(
  campaignId: string
): Promise<{
  ok: boolean;
  sent?: number;
  failed?: number;
  skipped?: number;
  pending?: number;
  hasMore?: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const result = await continueSendingCampaign(campaignId);

    revalidateEmailCenter(campaignId);

    return {
      ok: result.ok,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      pending: result.pending,
      hasMore: result.hasMore,
      error: result.error,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Continue sending failed' };
  }
}

/** @deprecated Use sendCampaignNowAction instead. */
export async function queueCampaignSendAction(
  campaignId: string,
  confirmSend: boolean
): Promise<{ ok: boolean; queuedCount?: number; suppressedCount?: number; error?: string }> {
  const result = await sendCampaignNowAction(campaignId, confirmSend);
  return {
    ok: result.ok,
    queuedCount: result.queuedCount,
    suppressedCount: result.suppressedCount,
    error: result.error,
  };
}

export async function pauseCampaignAction(
  campaignId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const result = await pauseCampaign(campaignId);
    if (!result.ok) return { ok: false, error: result.error };

    revalidatePath('/email-center');
    revalidatePath(`/email-center/campaigns/${campaignId}`);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Pause failed' };
  }
}

export async function cancelCampaignAction(
  campaignId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const result = await cancelCampaign(campaignId);
    if (!result.ok) return { ok: false, error: result.error };

    revalidateEmailCenter(campaignId);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Cancel failed' };
  }
}

export async function retryFailedCampaignEmailsAction(
  campaignId: string
): Promise<{ ok: boolean; retryCount?: number; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const result = await retryFailedOutbox(campaignId);
    if (!result.ok) return { ok: false, error: result.error };

    if (result.retryCount > 0) {
      await continueSendingCampaign(campaignId);
    }

    revalidateEmailCenter(campaignId);

    return { ok: true, retryCount: result.retryCount };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Retry failed' };
  }
}

export async function listCollegesForAudienceAction(): Promise<{ ok: boolean; colleges?: { id: string; name: string }[]; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { data } = await admin.from('colleges').select('id, name').order('name');

    return { ok: true, colleges: data ?? [] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to list colleges' };
  }
}

export async function searchUsersForAudienceAction(
  query: string,
  role: 'student' | 'college_admin'
): Promise<{
  ok: boolean;
  users?: Array<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    college_id?: string | null;
    college_name?: string | null;
  }>;
  error?: string;
}> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const q = query.trim();
    if (q.length < 2) return { ok: true, users: [] };

    if (role === 'student') {
      const { data: profiles, error: profileError } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(30);

      if (profileError) return { ok: false, error: profileError.message };

      const profileRows = profiles ?? [];
      if (profileRows.length === 0) return { ok: true, users: [] };

      const userIds = profileRows.map((p) => p.id);
      const { data: students, error: studentError } = await admin
        .from('students')
        .select('id, user_id, college_id')
        .in('user_id', userIds);

      if (studentError) return { ok: false, error: studentError.message };

      const collegeIds = [...new Set((students ?? []).reduce<string[]>((acc, s) => {
        if (s.college_id) acc.push(s.college_id);
        return acc;
      }, []))] as string[];
      const collegeMap = new Map<string, string>();
      if (collegeIds.length > 0) {
        const { data: colleges } = await admin.from('colleges').select('id, name').in('id', collegeIds);
        for (const c of colleges ?? []) {
          collegeMap.set(c.id, c.name);
        }
      }

      const profileByUserId = new Map(profileRows.map((p) => [p.id, p]));
      const users = (students ?? []).map((s) => {
        const profile = profileByUserId.get(s.user_id);
        const email = profile?.email ?? '';
        const name = profile?.full_name?.trim() || email || 'Unknown';
        return {
          id: s.id,
          user_id: s.user_id,
          name,
          email,
          college_id: s.college_id,
          college_name: s.college_id ? collegeMap.get(s.college_id) ?? null : null,
        };
      });

      return { ok: true, users };
    }

    const { data, error } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(20);

    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      users: (data ?? []).map((u) => ({
        id: u.id,
        user_id: u.id,
        name: u.full_name ?? u.email ?? 'Unknown',
        email: u.email ?? '',
      })),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Search failed' };
  }
}

export async function requestCampaignApprovalAction(
  campaignId: string,
  note?: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = approvalActionSchema.safeParse({ campaign_id: campaignId, note: note ?? null });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

    const result = await requestApprovalService(parsed.data.campaign_id, parsed.data.note ?? null, auth.user.id);

    revalidatePath('/email-center');
    revalidatePath('/email-center/campaigns');
    revalidatePath(`/email-center/campaigns/${campaignId}`);

    return { ok: result.ok, error: result.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request approval failed' };
  }
}

export async function approveCampaignAction(
  campaignId: string,
  note?: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = approvalActionSchema.safeParse({ campaign_id: campaignId, note: note ?? null });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

    const result = await approveCampaignService(parsed.data.campaign_id, parsed.data.note ?? null, auth.user.id);

    revalidatePath('/email-center');
    revalidatePath('/email-center/campaigns');
    revalidatePath(`/email-center/campaigns/${campaignId}`);

    return { ok: result.ok, error: result.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Approve failed' };
  }
}

export async function rejectCampaignAction(
  campaignId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = approvalActionSchema.safeParse({ campaign_id: campaignId, reason });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

    const result = await rejectCampaignService(parsed.data.campaign_id, parsed.data.reason ?? '', auth.user.id);

    revalidatePath('/email-center');
    revalidatePath('/email-center/campaigns');
    revalidatePath(`/email-center/campaigns/${campaignId}`);

    return { ok: result.ok, error: result.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Reject failed' };
  }
}

export async function cancelApprovalRequestAction(
  campaignId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const result = await cancelApprovalRequestService(campaignId, auth.user.id);

    revalidatePath('/email-center');
    revalidatePath('/email-center/campaigns');
    revalidatePath(`/email-center/campaigns/${campaignId}`);

    return { ok: result.ok, error: result.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Cancel approval request failed' };
  }
}

export async function getEmailHistoryPageAction(
  limit: number,
  offset: number
): Promise<{ ok: boolean; rows?: import('@/lib/email-center/history').EmailSendHistoryRow[]; hasMore?: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { getEmailSendHistory } = await import('@/lib/email-center/history');
    const result = await getEmailSendHistory(limit, offset);

    return { ok: true, rows: result.rows, hasMore: result.hasMore };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load history' };
  }
}

async function _sanitizeHtmlAction(html: string): Promise<{ ok: boolean; sanitized: string }> {
  'use server';
  try {
    const { sanitizeHtml } = await import('@/lib/email-center/validation');
    return { ok: true, sanitized: await sanitizeHtml(html) };
  } catch (_err) {
    return { ok: false, sanitized: html };
  }
}

async function _sanitizeHtmlForPreviewAction(html: string): Promise<{ ok: boolean; sanitized: string }> {
  'use server';
  try {
    const { sanitizeHtmlForPreview } = await import('@/lib/email-center/validation');
    return { ok: true, sanitized: await sanitizeHtmlForPreview(html) };
  } catch (_err) {
    return { ok: false, sanitized: html };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolve college display names + slugs for Email Center preview (superadmin only). */
export async function getCollegeNamesForEmailPreviewAction(
  collegeIds: string[]
): Promise<{ ok: boolean; names?: Record<string, string>; slugs?: Record<string, string>; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const uniq = [...new Set(collegeIds.filter((id) => typeof id === 'string' && UUID_RE.test(id)))];
    if (uniq.length === 0) return { ok: true, names: {}, slugs: {} };

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { data, error } = await admin.from('colleges').select('id, name, slug').in('id', uniq);
    if (error) return { ok: false, error: error.message };

    const names: Record<string, string> = {};
    const slugs: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.id && row.name) names[row.id] = String(row.name);
      if (row.id && row.slug) slugs[row.id] = String(row.slug);
    }
    return { ok: true, names, slugs };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load colleges' };
  }
}

/** Working preferences unsubscribe URL for Email Center preview / test (token in email_unsubscribe_tokens). */
export async function getEmailPreviewUnsubscribeUrlAction(
  email: string,
  campaignId?: string | null
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { ok: false, error: 'Valid email required for unsubscribe preview' };
    }

    const { buildEmailPreferencesUnsubscribeUrl } = await import('@/lib/email-center/unsubscribe-url');
    const url = await buildEmailPreferencesUnsubscribeUrl({
      email: normalized,
      campaignId: campaignId ?? undefined,
    });
    return { ok: true, url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to build unsubscribe URL',
    };
  }
}

export async function repairStuckSendingCampaignAction(
  campaignId: string
): Promise<{ ok: boolean; sent?: number; hasMore?: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };

    const { repairStuckSendingCampaign } = await import('@/lib/email-center/send-campaign-now');
    const result = await repairStuckSendingCampaign(campaignId);

    revalidateEmailCenter(campaignId);

    return {
      ok: result.ok,
      sent: result.sent,
      hasMore: result.hasMore,
      error: result.error,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Repair failed',
    };
  }
}

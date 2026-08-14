import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { inspectEmailConfig } from '@/lib/email/config';
import { getCampaignById, updateCampaignTestSent } from './campaigns';
import { getTemplateById } from './templates';
import { renderCampaignContent } from './template-renderer';
import type { EmailCampaignTest } from './types';
import {
  getSystemValuesForEmailMerge,
  RECIPIENT_VARIABLE_KEYS,
  buildTemplateSampleValues,
  mergePreviewVariables,
  normalizeTemplateVariables,
  pickVariableValues,
} from './template-variables';
import { deriveRecipientName } from './recipient-name';
import { buildEmailPreferencesUnsubscribeUrl } from './unsubscribe-url';
import {
  buildCareerEmailShellMerge,
  usesCareerEmailShellMerge,
  usesCareerLaunchBranchMerge,
} from './career-launch-merge';
import { getCampaignEmailCategory } from '@/lib/email-center/email-category';
import { isEmailSuppressedForLane } from '@/lib/email-center/tokens';
import {
  compileCustomEmail,
  parseComposerState,
  validateComposerState,
} from '@/lib/email-center/custom-composer';
import { sanitizeComposerBodyHtml } from '@/lib/email-center/composer-sanitize';
import { buildEmailHeaderDisplay, normalizeRecipientCollegeName, resolveEmailAudienceBrandMode } from '@/lib/email-center/email-header-branding';
import {
  resolveCampaignSender,
} from '@/lib/email-center/sender-profiles';
import {
  summarizeEmailHtmlValidation,
  validateFinalEmailHtml,
} from '@/lib/email-center/email-html-validation';

export interface SendTestEmailResult {
  ok: boolean;
  error?: string;
  testRecord?: EmailCampaignTest;
}

/**
 * Build the provider payload for a campaign test send.
 * Custom Email path: composer_state → validate → sanitize → compile shell → merge → payload.
 * Template/legacy path: use stored campaign snapshots → merge → payload.
 * Tracking links are deliberately NOT injected for test sends.
 */
export async function buildCampaignTestSendPayload(
  campaignId: string,
  testEmail: string,
  previewVariables?: Record<string, string>
): Promise<
  | {
      ok: true;
      subject: string;
      previewText: string;
      html: string;
      text: string;
      trackingWrapped: false;
      from?: string;
      replyTo?: string;
      senderProfileId?: string;
    }
  | { ok: false; error: string }
> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { ok: false, error: 'Campaign not found' };
  }

  const lane = getCampaignEmailCategory(campaign);
  const suppression = await isEmailSuppressedForLane(testEmail, lane);
  if (suppression.suppressed) {
    return {
      ok: false,
      error: `Cannot send test email to ${testEmail}: suppressed (${suppression.reason ?? 'preferences'}).`,
    };
  }

  const template = campaign.template_id ? await getTemplateById(campaign.template_id) : null;
  const templateVariables = normalizeTemplateVariables(template?.variables ?? []);
  const templateSampleValues = buildTemplateSampleValues(templateVariables);
  const campaignValues = (campaign.template_variable_values ?? {}) as Record<string, string>;

  const allowedPreviewKeys = new Set([...RECIPIENT_VARIABLE_KEYS]);
  if (templateVariables.some((variable) => variable.key === 'unsubscribe_url')) {
    allowedPreviewKeys.add('unsubscribe_url');
  }
  if (usesCareerLaunchBranchMerge(template?.slug)) {
    allowedPreviewKeys.add('college_slug');
  }
  if (campaign.content_mode === 'custom_composer' || parseComposerState(campaign.composer_state)) {
    allowedPreviewKeys.add('unsubscribe_url');
  }

  const previewValues = pickVariableValues(previewVariables, allowedPreviewKeys);
  const derived = deriveRecipientName(
    {
      first_name: previewValues.first_name,
      full_name: previewValues.full_name,
      email: testEmail,
    },
    { recipientType: 'student' }
  );
  const recipientMerged = {
    ...previewValues,
    first_name: derived.first_name,
    full_name: derived.full_name,
  };

  let unsubscribeUrl: string | undefined;
  try {
    unsubscribeUrl = await buildEmailPreferencesUnsubscribeUrl({
      email: testEmail,
      campaignId,
    });
  } catch (err) {
    console.error('[email-center] test-send unsubscribe key:', err);
  }

  const mergedVariables = mergePreviewVariables({
    templateSampleValues,
    systemValues: {
      ...getSystemValuesForEmailMerge(),
      ...(unsubscribeUrl ? { unsubscribe_url: unsubscribeUrl } : {}),
    },
    campaignValues,
    recipientValues: recipientMerged,
    recipientEmail: testEmail,
  });

  const resolvedCollegeName = normalizeRecipientCollegeName(
    ((recipientMerged as Record<string, unknown>).college_name as string | undefined) ?? mergedVariables.college_name
  );
  mergedVariables.college_name = resolvedCollegeName ?? '';

  if (template?.slug && usesCareerEmailShellMerge(template.slug)) {
    const programName = String(campaignValues.program_name ?? mergedVariables.program_name ?? '');
    const collegeName = resolvedCollegeName ?? '';
    const collegeSlug = previewValues.college_slug ?? '';
    Object.assign(
      mergedVariables,
      buildCareerEmailShellMerge({
        slug: template.slug,
        previewTextRaw: campaign.preview_text ?? template.preview_text_template ?? '',
        mergedVariables: mergedVariables as Record<string, string>,
        programName,
        collegeName,
        collegeSlug,
      }),
    );
  } else if (
    campaign.content_mode === 'custom_composer'
    || parseComposerState(campaign.composer_state)
    || (!campaign.template_id && (campaign.html_body ?? '').includes('{{email_header_display}}'))
  ) {
    const audienceConfig = campaign.audience_config as
      | { type?: string; custom_audience_mode?: 'platform' | 'external' }
      | null
      | undefined;
    const brandMode = resolveEmailAudienceBrandMode({
      audienceMode: audienceConfig?.custom_audience_mode,
      audienceType: audienceConfig?.type,
    });
    // Test-send to an arbitrary address uses external branding when campaign is external
    // or when no platform college context is present for Custom Email.
    mergedVariables.email_header_display = buildEmailHeaderDisplay(
      brandMode === 'external' ? null : resolvedCollegeName,
      { audienceMode: brandMode },
    );
    if (brandMode === 'external') {
      mergedVariables.college_name = '';
    }
  } else {
    mergedVariables.email_header_display =
      mergedVariables.email_header_display || buildEmailHeaderDisplay(resolvedCollegeName);
  }

  const subjectSource = campaign.subject;
  const previewSource = campaign.preview_text;
  let htmlSource = campaign.html_body;
  let textSource = campaign.text_body;

  const composerState = parseComposerState(campaign.composer_state);
  if (campaign.content_mode === 'custom_composer' || composerState) {
    const validation = validateComposerState(composerState, {
      subject: campaign.subject,
      previewText: campaign.preview_text,
      emailCategory: lane,
      requireNonEmptyBody: true,
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

    const compiled = compileCustomEmail({
      state: validation.state,
      subject: campaign.subject,
      previewText: campaign.preview_text,
      emailCategory: lane,
      sanitizedBodyHtml: sanitizedBody,
    });
    htmlSource = compiled.html_body;
    textSource = compiled.text_body;
  }

  const rendered = renderCampaignContent(
    subjectSource,
    previewSource,
    htmlSource,
    textSource,
    mergedVariables
  );

  const isCustom =
    campaign.content_mode === 'custom_composer' || Boolean(parseComposerState(campaign.composer_state));

  let from: string | undefined;
  let replyTo: string | undefined;
  let senderProfileId: string | undefined;
  if (isCustom) {
    const sender = resolveCampaignSender(campaign.composer_state);
    if (!sender.ok) {
      return { ok: false, error: sender.error };
    }
    from = sender.fromHeader;
    replyTo = sender.snapshot.replyTo;
    senderProfileId = sender.profile.id;
  }

  const htmlCheck = validateFinalEmailHtml(rendered.html, {
    requireSocialDestinations: /Follow us on|instagram\.com/i.test(rendered.html),
  });
  if (!htmlCheck.ok) {
    console.error(
      '[email-center] test-send HTML validation failed:',
      summarizeEmailHtmlValidation(htmlCheck, { campaignId }),
    );
    return {
      ok: false,
      error: `Email HTML validation failed (${htmlCheck.issues.map((i) => i.code).join(', ')})`,
    };
  }

  return {
    ok: true,
    subject: rendered.subject,
    previewText: rendered.previewText,
    html: rendered.html,
    text: rendered.text,
    trackingWrapped: false,
    ...(from ? { from, replyTo, senderProfileId } : {}),
  };
}

export async function sendTestEmail(
  campaignId: string,
  testEmail: string,
  userId?: string,
  previewVariables?: Record<string, string>
): Promise<SendTestEmailResult> {
  const config = inspectEmailConfig();

  const payload = await buildCampaignTestSendPayload(campaignId, testEmail, previewVariables);
  if (!payload.ok) {
    return { ok: false, error: payload.error };
  }

  const admin = createAdminClient();
  let testRecordId: string | null = null;

  try {
    const result = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${payload.subject}`,
      html: payload.html,
      text: payload.text,
      category: 'test_email',
      ...(payload.from ? { from: payload.from } : {}),
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    });

    const { data: testData, error: testError } = await admin
      .from('email_campaign_tests')
      .insert({
        campaign_id: campaignId,
        sent_to: testEmail,
        provider: config.selectedProvider,
        message_id: result.messageId ?? null,
        status: result.ok ? 'sent' : 'failed',
        error_message: result.ok ? null : result.errorMessage ?? result.errorCode,
        created_by: userId ?? null,
      })
      .select()
      .single();

    if (testError) {
      console.error('[email-center] insert test record error:', testError.message);
    } else if (testData) {
      testRecordId = testData.id;
    }

    if (!result.ok) {
      return {
        ok: false,
        error: result.errorMessage ?? result.errorCode ?? 'Failed to send test email',
      };
    }

    await updateCampaignTestSent(campaignId, testEmail, userId);

    return {
      ok: true,
      testRecord: testData ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (testRecordId) {
      await admin
        .from('email_campaign_tests')
        .update({
          status: 'failed',
          error_message: message,
        })
        .eq('id', testRecordId);
    }

    return {
      ok: false,
      error: message,
    };
  }
}

export async function getCampaignTests(campaignId: string): Promise<EmailCampaignTest[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('email_campaign_tests')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[email-center] getCampaignTests error:', error.message);
    throw new Error(`Failed to get campaign tests: ${error.message}`);
  }

  return (data ?? []) as EmailCampaignTest[];
}

async function getSuppressionCount(): Promise<number> {
  const admin = createAdminClient();

  const { count, error } = await admin
    .from('email_suppressions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[email-center] getSuppressionCount error:', error.message);
    return 0;
  }

  return count ?? 0;
}

void getSuppressionCount;

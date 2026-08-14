import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAudiencePreview } from './audience';
import type { AudienceConfig } from './audience';
import { deriveRecipientName } from './recipient-name';
import { getCampaignEmailCategory } from '@/lib/email-center/email-category';
import { validateExternalEmailList } from '@/lib/email-center/external-emails';

export interface RecipientRow {
  id: string;
  campaign_id: string;
  recipient_type: string;
  source_table: string | null;
  source_id: string | null;
  auth_user_id: string | null;
  college_id: string | null;
  college_name: string | null;
  email: string;
  full_name: string | null;
  first_name: string | null;
  status: string;
  suppression_reason: string | null;
  created_at: string;
}

export async function snapshotRecipients(
  campaignId: string,
  audienceConfig: AudienceConfig
): Promise<{ ok: boolean; count: number; error?: string }> {
  const admin = createAdminClient();

  if (!audienceConfig) {
    return { ok: false, count: 0, error: 'Audience config is required. Please select an audience.' };
  }

  if (audienceConfig.type === 'manual_emails') {
    const validated = validateExternalEmailList(audienceConfig.manual_emails ?? '');
    if (!validated.ok) {
      return { ok: false, count: 0, error: validated.error };
    }
  }

  if (
    (audienceConfig.type === 'specific_college_students' || audienceConfig.type === 'specific_college_admins') &&
    (!audienceConfig.college_ids || audienceConfig.college_ids.length === 0)
  ) {
    return { ok: false, count: 0, error: 'Please select at least one college.' };
  }

  if (audienceConfig.type === 'individual_students') {
    const hasStudents =
      (audienceConfig.student_ids?.length ?? 0) > 0
      || (audienceConfig.selected_students?.length ?? 0) > 0;
    if (!hasStudents) {
      return { ok: false, count: 0, error: 'Please search for and select at least one student.' };
    }
  }

  if (audienceConfig.type === 'individual_college_admins') {
    const hasAdmins =
      (audienceConfig.admin_ids?.length ?? 0) > 0
      || (audienceConfig.selected_admins?.length ?? 0) > 0;
    if (!hasAdmins) {
      return { ok: false, count: 0, error: 'Please search for and select at least one college admin.' };
    }
  }

  const campaign = await admin
    .from('email_campaigns')
    .select('id, status, email_category, campaign_type, content_mode, composer_state, subject, preview_text')
    .eq('id', campaignId)
    .single();

  if (campaign.error || !campaign.data) {
    return { ok: false, count: 0, error: 'Campaign not found' };
  }

  const c = campaign.data;
  if (c.status === 'sending' || c.status === 'sent') {
    return { ok: false, count: 0, error: 'Cannot modify recipients of a campaign that is already sending or sent.' };
  }

  const isExternalAudience =
    audienceConfig.custom_audience_mode === 'external'
    || audienceConfig.type === 'manual_emails';
  if (isExternalAudience && (c.content_mode === 'custom_composer' || c.composer_state)) {
    const { parseComposerState, findUnsupportedVariables } = await import('./custom-composer');
    const composer = parseComposerState(c.composer_state);
    if (composer) {
      const unsupported = findUnsupportedVariables(
        composer,
        c.subject ?? '',
        c.preview_text ?? '',
        'external',
      );
      if (unsupported.length > 0) {
        return {
          ok: false,
          count: 0,
          error: `External audience does not support these variables: ${unsupported.map((k) => `{{${k}}}`).join(', ')}. Remove them from the Custom Email content.`,
        };
      }
    }
  }

  await admin.from('email_campaign_recipients').delete().eq('campaign_id', campaignId);

  const preview = await resolveAudiencePreview(
    audienceConfig,
    getCampaignEmailCategory(campaign.data),
  );

  if (preview.validCount === 0) {
    return { ok: false, count: 0, error: 'No valid recipients to snapshot.' };
  }

  const rows = preview.candidates.map((candidate) => {
    const derived = deriveRecipientName(
      {
        first_name: candidate.first_name,
        full_name: candidate.full_name,
        email: candidate.email,
      },
      { recipientType: candidate.recipient_type }
    );
    return {
    campaign_id: campaignId,
    recipient_type: candidate.recipient_type,
    source_table: candidate.source_table,
    source_id: candidate.source_id,
    auth_user_id: candidate.auth_user_id,
    college_id: candidate.college_id,
    college_name: candidate.college_name,
    email: candidate.email.toLowerCase().trim(),
    full_name: derived.full_name,
    first_name: derived.first_name,
    variables: {
      ...(candidate.variables ?? {}),
      first_name: derived.first_name,
      full_name: derived.full_name,
    },
    status: 'snapshotted' as const,
    suppression_reason: null,
  };
  });

  const errors: string[] = [];
  let inserted = 0;

  const insertBatches: typeof rows[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    insertBatches.push(rows.slice(i, i + 100));
  }

  const insertResults = await Promise.allSettled(
    insertBatches.map((batch) =>
      admin
        .from('email_campaign_recipients')
        .insert(batch)
        .select('id'),
    ),
  );

  for (let i = 0; i < insertResults.length; i++) {
    const r = insertResults[i];
    if (r.status === 'fulfilled') {
      if (r.value.error) {
        errors.push(`Batch ${i}: ${r.value.error.message}`);
      } else {
        inserted += r.value.count ?? insertBatches[i].length;
      }
    } else {
      errors.push(`Batch ${i}: ${r.reason?.message ?? 'Insert failed'}`);
    }
  }

  await admin.from('email_campaigns').update({ recipient_count: inserted }).eq('id', campaignId);

  if (errors.length > 0) {
    return { ok: true, count: inserted, error: `Partial insert. ${errors.join('; ')}` };
  }

  return { ok: true, count: inserted };
}

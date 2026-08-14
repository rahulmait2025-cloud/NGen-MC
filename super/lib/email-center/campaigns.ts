import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getSupabaseErrorMessage,
  isTransientSupabaseFetchError,
  logTransientSupabaseDegradation,
} from '@/lib/supabase/fetch-resilience';
import { emailCenterNoStore } from './cache';
import {
  getCampaignEmailCategory,
  laneToLegacyCampaignType,
  normalizeEmailCenterLane,
} from '@/lib/email-center/email-category';
import type {
  EmailCampaign,
  EmailCampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
} from './types';

export async function listCampaigns(
  options?: {
    status?: EmailCampaignStatus;
    limit?: number;
    offset?: number;
  }
): Promise<{ campaigns: EmailCampaign[]; total: number }> {
  emailCenterNoStore();
  const admin = createAdminClient();

  let query = admin.from('email_campaigns').select('*', { count: 'exact' });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  query = query.order('updated_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1);
  }

  try {
    const { data, count, error } = await query;

    if (error) {
      const message = error.message ?? getSupabaseErrorMessage(error);
      if (isTransientSupabaseFetchError(message)) {
        logTransientSupabaseDegradation('listCampaigns', error);
        throw new Error('Database connection failed. Please refresh and try again.');
      }
      console.error('[email-center] listCampaigns error:', message);
      throw new Error(`Failed to list campaigns: ${message}`);
    }

    return {
      campaigns: (data ?? []) as EmailCampaign[],
      total: count ?? 0,
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Failed to list campaigns')) {
      throw err;
    }
    if (err instanceof Error && err.message.includes('Database connection failed')) {
      throw err;
    }
    const message = getSupabaseErrorMessage(err);
    if (isTransientSupabaseFetchError(message)) {
      logTransientSupabaseDegradation('listCampaigns', err);
      throw new Error('Database connection failed. Please refresh and try again.');
    }
    console.error('[email-center] listCampaigns error:', message);
    throw new Error(`Failed to list campaigns: ${message}`);
  }
}

export async function getCampaignById(id: string): Promise<EmailCampaign | null> {
  emailCenterNoStore();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    const message = error.message ?? getSupabaseErrorMessage(error);
    if (isTransientSupabaseFetchError(message)) {
      logTransientSupabaseDegradation('getCampaignById', error);
      throw new Error('Database connection failed. Please refresh and try again.');
    }
    console.error('[email-center] getCampaignById error:', message);
    throw new Error(`Failed to get campaign: ${message}`);
  }

  return data as EmailCampaign;
}

export async function createCampaign(
  input: CreateCampaignInput,
  userId?: string
): Promise<EmailCampaign> {
  const admin = createAdminClient();

  const emailCategory = normalizeEmailCenterLane(input.email_category);
  const campaignType = input.campaign_type ?? laneToLegacyCampaignType(emailCategory);

  const { data, error } = await admin
    .from('email_campaigns')
    .insert({
      name: input.name,
      campaign_type: campaignType,
      email_category: emailCategory,
      template_id: input.template_id ?? null,
      content_mode: input.content_mode ?? (input.template_id ? 'template' : 'custom_composer'),
      composer_state: input.composer_state ?? null,
      subject: input.subject,
      preview_text: input.preview_text ?? null,
      html_body: input.html_body,
      text_body: input.text_body ?? null,
      audience_config: input.audience_config ?? {},
      template_variable_values: input.template_variable_values ?? {},
      status: 'draft',
      created_by: userId ?? null,
      updated_by: userId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[email-center] createCampaign error:', error.message);
    throw new Error(`Failed to create campaign: ${error.message}`);
  }

  return data as EmailCampaign;
}

export async function updateCampaign(
  input: UpdateCampaignInput,
  userId?: string
): Promise<EmailCampaign> {
  const admin = createAdminClient();

  const existing = await getCampaignById(input.id);
  if (!existing) {
    throw new Error('Campaign not found');
  }

  const isLocked = ['sending', 'sent', 'cancelled'].includes(existing.status)
    || existing.approval_status === 'approved';

  if (isLocked) {
    const hasContentChanges = input.subject !== undefined
      || input.html_body !== undefined
      || input.text_body !== undefined
      || input.template_id !== undefined
      || input.audience_config !== undefined
      || input.template_variable_values !== undefined
      || input.content_mode !== undefined
      || input.composer_state !== undefined;
    if (hasContentChanges) {
      throw new Error('Campaign is locked. Content/subject/template/audience cannot be edited because campaign is approved, sending, or sent. Duplicate the campaign to create a new editable version.');
    }
  }

  const updateData: Record<string, unknown> = {
    updated_by: userId ?? null,
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.email_category !== undefined) {
    const emailCategory = normalizeEmailCenterLane(input.email_category);
    updateData.email_category = emailCategory;
    updateData.campaign_type = input.campaign_type ?? laneToLegacyCampaignType(emailCategory);
  } else if (input.campaign_type !== undefined) {
    updateData.campaign_type = input.campaign_type;
  }
  if (input.template_id !== undefined) updateData.template_id = input.template_id;
  if (input.content_mode !== undefined) updateData.content_mode = input.content_mode;
  if (input.composer_state !== undefined) updateData.composer_state = input.composer_state;
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.preview_text !== undefined) updateData.preview_text = input.preview_text;
  if (input.html_body !== undefined) updateData.html_body = input.html_body;
  if (input.text_body !== undefined) updateData.text_body = input.text_body;
  if (input.audience_config !== undefined) updateData.audience_config = input.audience_config;
  if (input.template_variable_values !== undefined) updateData.template_variable_values = input.template_variable_values;

  const { data, error } = await admin
    .from('email_campaigns')
    .update(updateData)
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    console.error('[email-center] updateCampaign error:', error.message);
    throw new Error(`Failed to update campaign: ${error.message}`);
  }

  return data as EmailCampaign;
}

export async function duplicateCampaign(
  campaignId: string,
  userId?: string
): Promise<EmailCampaign> {
  const admin = createAdminClient();

  const existing = await getCampaignById(campaignId);
  if (!existing) {
    throw new Error('Campaign not found');
  }

  const { data, error } = await admin
    .from('email_campaigns')
    .insert({
      name: `${existing.name} (Copy)`,
      campaign_type: existing.campaign_type,
      email_category: getCampaignEmailCategory(existing),
      template_id: existing.template_id,
      content_mode: existing.content_mode ?? (existing.template_id ? 'template' : 'legacy_html'),
      composer_state: existing.composer_state ?? null,
      subject: existing.subject,
      preview_text: existing.preview_text,
      html_body: existing.html_body,
      text_body: existing.text_body,
      audience_config: existing.audience_config,
      template_variable_values: existing.template_variable_values ?? {},
      status: 'draft',
      created_by: userId ?? null,
      updated_by: userId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[email-center] duplicateCampaign error:', error.message);
    throw new Error(`Failed to duplicate campaign: ${error.message}`);
  }

  return data as EmailCampaign;
}

export async function updateCampaignTestSent(
  campaignId: string,
  testEmail: string,
  userId?: string
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('email_campaigns')
    .update({
      test_last_sent_to: testEmail,
      test_last_sent_at: new Date().toISOString(),
      status: 'test_sent',
      updated_by: userId ?? null,
    })
    .eq('id', campaignId);

  if (error) {
    console.error('[email-center] updateCampaignTestSent error:', error.message);
    throw new Error(`Failed to update campaign test status: ${error.message}`);
  }
}
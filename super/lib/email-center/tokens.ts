import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPreferenceKeyForLane,
  laneRespectsGlobalUnsubscribe,
  normalizeEmailCenterLane,
} from '@/lib/email-center/email-category';
import crypto from 'crypto';

const TOKEN_LENGTH = 32;
const UNSUBSCRIBE_TOKEN_EXPIRY_HOURS = 72;

export interface TrackingTokenPayload {
  campaignId: string;
  recipientId: string;
  outboxId?: string;
  email: string;
  type: 'click' | 'open' | 'unsubscribe';
}

export interface UnsubscribeTokenData {
  email: string;
  campaignId?: string;
  recipientId?: string;
}

function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

 
function _createTrackingToken(): string {
  return generateSecureToken();
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createUnsubscribeToken(data: UnsubscribeTokenData): Promise<string> {
  const admin = createAdminClient();
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + UNSUBSCRIBE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from('email_unsubscribe_tokens').insert({
    email: data.email.toLowerCase().trim(),
    token_hash: tokenHash,
    campaign_id: data.campaignId || null,
    recipient_id: data.recipientId || null,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('[email-center] createUnsubscribeToken error:', error.message);
    throw new Error('Failed to create unsubscribe token');
  }

  return token;
}

 
async function _verifyUnsubscribeToken(
  token: string
): Promise<{ valid: boolean; data?: UnsubscribeTokenData; error?: string }> {
  const admin = createAdminClient();
  const tokenHash = hashToken(token);

  const { data, error } = await admin
    .from('email_unsubscribe_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid token' };
  }

  if (data.used_at) {
    return { valid: false, error: 'Token already used' };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  return {
    valid: true,
    data: {
      email: data.email,
      campaignId: data.campaign_id,
      recipientId: data.recipient_id,
    },
  };
}

 
async function _markUnsubscribeTokenUsed(token: string): Promise<void> {
  const admin = createAdminClient();
  const tokenHash = hashToken(token);

  await admin
    .from('email_unsubscribe_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);
}

 
async function _lookupTrackingToken(
  token: string,
  type: 'click' | 'open'
): Promise<{ campaignId: string; recipientId: string; outboxId?: string } | null> {
  const admin = createAdminClient();
  const table = type === 'click' ? 'email_click_links' : 'email_open_tokens';

  const { data, error } = await admin
    .from(table)
    .select('campaign_id, recipient_id, outbox_id')
    .eq('tracking_token', token)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    campaignId: data.campaign_id,
    recipientId: data.recipient_id,
    outboxId: data.outbox_id,
  };
}

export async function getEmailPreferences(
  email: string
): Promise<{
  marketing: boolean;
  announcements: boolean;
  productUpdates: boolean;
  notices: boolean;
  operational: boolean;
  global: boolean;
} | null> {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await admin
    .from('email_preferences')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    marketing: data.marketing_opt_out,
    announcements: data.announcements_opt_out,
    productUpdates: data.product_updates_opt_out,
    notices: data.notices_opt_out,
    operational: data.operational_opt_out,
    global: data.global_unsubscribe,
  };
}

async function _upsertEmailPreferences(
  email: string,
  preferences: {
    marketing?: boolean;
    announcements?: boolean;
    productUpdates?: boolean;
    notices?: boolean;
    operational?: boolean;
    global?: boolean;
    reason?: string;
  }
): Promise<void> {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();

  const existing = await admin
    .from('email_preferences')
    .select('id')
    .eq('email', normalizedEmail)
    .single();

  if (existing.data) {
    const updateData: Record<string, unknown> = { updated_at: now };

    if (preferences.marketing !== undefined) updateData.marketing_opt_out = preferences.marketing;
    if (preferences.announcements !== undefined) updateData.announcements_opt_out = preferences.announcements;
    if (preferences.productUpdates !== undefined) updateData.product_updates_opt_out = preferences.productUpdates;
    if (preferences.notices !== undefined) updateData.notices_opt_out = preferences.notices;
    if (preferences.operational !== undefined) updateData.operational_opt_out = preferences.operational;
    if (preferences.global !== undefined) {
      updateData.global_unsubscribe = preferences.global;
      if (preferences.global) {
        updateData.unsubscribed_at = now;
        updateData.unsubscribe_reason = preferences.reason || 'user_unsubscribe';
      }
    }

    await admin
      .from('email_preferences')
      .update(updateData)
      .eq('email', normalizedEmail);
  } else {
    const insertData = {
      email: normalizedEmail,
      marketing_opt_out: preferences.marketing ?? false,
      announcements_opt_out: preferences.announcements ?? false,
      product_updates_opt_out: preferences.productUpdates ?? false,
      notices_opt_out: preferences.notices ?? false,
      operational_opt_out: preferences.operational ?? false,
      global_unsubscribe: preferences.global ?? false,
      unsubscribed_at: preferences.global ? now : null,
      unsubscribe_reason: preferences.reason || null,
    };

    await admin.from('email_preferences').insert(insertData);
  }

  if (preferences.global) {
    await admin.from('email_suppressions').upsert({
      email: normalizedEmail,
      reason: preferences.reason || 'unsubscribed',
      source: 'preference_page',
    });
  }
}

export async function isEmailSuppressedForLane(
  email: string,
  laneInput?: string | null,
): Promise<{ suppressed: boolean; reason?: string }> {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();
  const lane = normalizeEmailCenterLane(laneInput);

  if (lane === 'transactional_essential') {
    return { suppressed: false };
  }

  const { data: sup } = await admin
    .from('email_suppressions')
    .select('reason')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (sup) {
    return { suppressed: true, reason: sup.reason ?? 'suppressed' };
  }

  const { data: pref } = await admin
    .from('email_preferences')
    .select(
      'global_unsubscribe, marketing_opt_out, announcements_opt_out, product_updates_opt_out, notices_opt_out',
    )
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (pref) {
    if (laneRespectsGlobalUnsubscribe(lane) && pref.global_unsubscribe) {
      return { suppressed: true, reason: 'global_unsubscribe' };
    }

    const optOutField = getPreferenceKeyForLane(lane);
    if (optOutField && pref[optOutField]) {
      return { suppressed: true, reason: optOutField };
    }
  }

  return { suppressed: false };
}

/** @deprecated Use isEmailSuppressedForLane with an Email Center lane. */
async function _isEmailSuppressedForCategory(
  email: string,
  category?: string,
): Promise<{ suppressed: boolean; reason?: string }> {
  return isEmailSuppressedForLane(email, category);
}
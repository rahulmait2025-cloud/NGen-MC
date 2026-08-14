import { createAdminClient } from '@/lib/supabase/admin';
import type { NormalizedEmailEvent, EmailEventType } from './types';

export async function ingestEvent(event: NormalizedEmailEvent): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  if (event.providerEventId) {
    const { data: existing } = await admin
      .from('email_events')
      .select('id')
      .eq('provider', event.provider)
      .eq('provider_event_id', event.providerEventId)
      .single();

    if (existing) {
      return { ok: true };
    }
  }

  if (event.providerMessageId) {
    const { data: existing } = await admin
      .from('email_events')
      .select('id')
      .eq('provider', event.provider)
      .eq('provider_message_id', event.providerMessageId)
      .eq('event_type', event.eventType)
      .single();

    if (existing) {
      return { ok: true };
    }
  }

  let outboxId: string | null = null;
  let recipientId: string | null = null;
  let campaignId: string | null = null;

  if (event.providerMessageId) {
    const { data: outbox } = await admin
      .from('email_outbox')
      .select('id, campaign_id, recipient_id')
      .eq('provider_message_id', event.providerMessageId)
      .single();

    if (outbox) {
      outboxId = outbox.id;
      recipientId = outbox.recipient_id;
      campaignId = outbox.campaign_id;
    }
  }

  if (!outboxId && event.email) {
    const { data: recipient } = await admin
      .from('email_campaign_recipients')
      .select('id, campaign_id')
      .eq('email', event.email.toLowerCase())
      .single();

    if (recipient) {
      recipientId = recipient.id;
      campaignId = recipient.campaign_id;
    }
  }

  const insertData = {
    campaign_id: campaignId,
    recipient_id: recipientId,
    outbox_id: outboxId,
    provider: event.provider,
    provider_event_id: event.providerEventId,
    provider_message_id: event.providerMessageId,
    event_type: event.eventType,
    event_timestamp: event.timestamp.toISOString(),
    email: event.email,
    url: event.url,
    user_agent: event.userAgent,
    raw_event: event.rawEvent,
  };

  const { error } = await admin.from('email_events').insert(insertData);

  if (error) {
    console.error('[webhooks] ingestEvent insert error:', error.message);
    return { ok: false, error: error.message };
  }

  await updateCampaignCounters(campaignId, recipientId, event.eventType);

  if (['bounced', 'complained', 'unsubscribed'].includes(event.eventType)) {
    await upsertSuppression(event.email, event.eventType);
  }

  return { ok: true };
}

async function updateCampaignCounters(
  campaignId: string | null,
  recipientId: string | null,
  eventType: EmailEventType
): Promise<void> {
  if (!campaignId || !recipientId) return;

  const admin = createAdminClient();
const countColumnMap: Partial<Record<EmailEventType, string>> = {
  delivered: 'delivered_count',
  opened: 'opened_count',
  clicked: 'clicked_count',
  bounced: 'bounced_count',
  complained: 'complained_count',
  unsubscribed: 'unsubscribed_count',
};

  const column = countColumnMap[eventType];
  if (!column) return;

  if (eventType === 'opened' || eventType === 'clicked') {
    const { data: existing } = await admin
      .from('email_events')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('recipient_id', recipientId)
      .eq('event_type', eventType)
      .single();

    if (existing) {
      return;
    }
  } else {
    const email = await getEmailFromRecipient(recipientId);
    if (!email) return;

    const { data: existing } = await admin
      .from('email_events')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('email', email.toLowerCase())
      .eq('event_type', eventType)
      .single();

    if (existing) {
      return;
    }
  }

  const { data: current } = await admin
    .from('email_campaigns')
    .select(column)
    .eq('id', campaignId)
    .single();

  const currentValue = current ? (current[column as keyof typeof current] as number) || 0 : 0;

  await admin
    .from('email_campaigns')
    .update({ [column]: currentValue + 1 })
    .eq('id', campaignId);
}

async function getEmailFromRecipient(recipientId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('email_campaign_recipients')
    .select('email')
    .eq('id', recipientId)
    .single();
  return data?.email || null;
}

async function upsertSuppression(
  email: string | null,
  eventType: EmailEventType
): Promise<void> {
  if (!email) return;

  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

const reasonMap: Partial<Record<EmailEventType, string>> = {
  bounced: 'bounced',
  complained: 'complained',
  unsubscribed: 'unsubscribed',
};

  const reason = reasonMap[eventType];
  if (!reason) return;

  await admin.from('email_suppressions').upsert({
    email: normalizedEmail,
    reason: reason,
    source: 'webhook',
  });

  await admin.from('email_preferences').upsert({
    email: normalizedEmail,
    global_unsubscribe: true,
    unsubscribed_at: new Date().toISOString(),
    unsubscribe_reason: reason,
  });
}
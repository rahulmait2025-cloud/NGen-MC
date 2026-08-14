import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { trackDevLog } from '@/lib/email-center/tracking-route-utils';

export interface EmailClickLinkRow {
  id: string;
  campaign_id: string;
  recipient_id: string | null;
  outbox_id: string | null;
  original_url: string;
  tracking_token: string;
  click_count: number;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
}

export interface EmailOpenTokenRow {
  id: string;
  campaign_id: string;
  recipient_id: string;
  outbox_id: string | null;
  tracking_token: string;
  open_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
}

// Atomic increment via raw SQL to eliminate the read-modify-write race condition.
// Falls back to increment_column RPC if exec_sql is unavailable.
async function incrementCampaignUniqueCounter(
  campaignId: string,
  column: 'opened_count' | 'clicked_count',
): Promise<void> {
  const admin = createAdminClient();

  // Try atomic increment via exec_sql RPC first
  const { error } = await admin.rpc('exec_sql', {
    query: `UPDATE email_campaigns SET ${column} = ${column} + 1 WHERE id = '${campaignId}'`,
  });

  if (error) {
    // Fallback: try increment_column RPC if available
    const { error: rpcError } = await admin.rpc('increment_column', {
      table_name: 'email_campaigns',
      column_name: column,
      row_id: campaignId,
    });

    if (rpcError) {
      // Last resort: read-modify-write (has race condition under concurrency)
      console.warn(
        '[email-center] Atomic increment RPCs unavailable, falling back to read-modify-write',
        { exec_sql: error.message, increment_column: rpcError.message },
      );
      const { data: current } = await admin
        .from('email_campaigns')
        .select('opened_count, clicked_count')
        .eq('id', campaignId)
        .single();
      const currentCount = (current?.[column] as number | undefined) ?? 0;
      await admin
        .from('email_campaigns')
        .update({ [column]: currentCount + 1 })
        .eq('id', campaignId);
    }
  }

  trackDevLog(column === 'clicked_count' ? 'click' : 'open', 'aggregate updated', {
    campaignId,
    column,
  });
}

export async function recordEmailClickEvent(params: {
  link: EmailClickLinkRow;
  userAgent: string;
  ipHash: string | null;
  skipAnalytics?: boolean;
}): Promise<void> {
  const { link, userAgent, ipHash, skipAnalytics } = params;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (skipAnalytics) {
    trackDevLog('click', 'duplicate ignored', { reason: 'prefetch', linkId: link.id });
    return;
  }

  const { data: claimed, error: claimError } = await admin
    .from('email_click_links')
    .update({
      click_count: (link.click_count ?? 0) + 1,
      first_clicked_at: now,
      last_clicked_at: now,
    })
    .eq('id', link.id)
    .is('first_clicked_at', null)
    .select('id')
    .maybeSingle();

  if (claimError) {
    trackDevLog('click', 'event insert failure', { error: claimError.message, stage: 'claim' });
    return;
  }

  if (!claimed) {
    const { error: bumpError } = await admin
      .from('email_click_links')
      .update({
        click_count: (link.click_count ?? 0) + 1,
        last_clicked_at: now,
      })
      .eq('id', link.id);

    if (bumpError) {
      trackDevLog('click', 'event insert failure', { error: bumpError.message, stage: 'bump' });
    } else {
      trackDevLog('click', 'duplicate ignored', {
        campaignId: link.campaign_id,
        recipientId: link.recipient_id,
        url: link.original_url,
      });
    }
    return;
  }

  const { error: insertError } = await admin.from('email_events').insert({
    campaign_id: link.campaign_id,
    recipient_id: link.recipient_id,
    outbox_id: link.outbox_id,
    provider: 'internal',
    event_type: 'clicked',
    url: link.original_url,
    user_agent: userAgent,
    ip_hash: ipHash,
  });

  if (insertError) {
    trackDevLog('click', 'event insert failure', { error: insertError.message });
    return;
  }

  trackDevLog('click', 'unique event inserted', {
    campaignId: link.campaign_id,
    recipientId: link.recipient_id,
    url: link.original_url,
    eventType: 'clicked',
  });

  await incrementCampaignUniqueCounter(link.campaign_id, 'clicked_count');
}

export async function recordEmailOpenEvent(params: {
  tokenRow: EmailOpenTokenRow;
  skipAnalytics?: boolean;
}): Promise<void> {
  const { tokenRow, skipAnalytics } = params;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (skipAnalytics) {
    trackDevLog('open', 'duplicate ignored', { reason: 'prefetch', tokenId: tokenRow.id });
    return;
  }

  const { data: claimed, error: claimError } = await admin
    .from('email_open_tokens')
    .update({
      open_count: (tokenRow.open_count ?? 0) + 1,
      first_opened_at: now,
      last_opened_at: now,
    })
    .eq('id', tokenRow.id)
    .is('first_opened_at', null)
    .select('id')
    .maybeSingle();

  if (claimError) {
    trackDevLog('open', 'event insert failure', { error: claimError.message, stage: 'claim' });
    return;
  }

  if (!claimed) {
    const { error: bumpError } = await admin
      .from('email_open_tokens')
      .update({
        open_count: (tokenRow.open_count ?? 0) + 1,
        last_opened_at: now,
      })
      .eq('id', tokenRow.id);

    if (bumpError) {
      trackDevLog('open', 'event insert failure', { error: bumpError.message, stage: 'bump' });
    } else {
      trackDevLog('open', 'duplicate ignored', {
        campaignId: tokenRow.campaign_id,
        recipientId: tokenRow.recipient_id,
      });
    }
    return;
  }

  const { error: insertError } = await admin.from('email_events').insert({
    campaign_id: tokenRow.campaign_id,
    recipient_id: tokenRow.recipient_id,
    outbox_id: tokenRow.outbox_id,
    provider: 'internal',
    event_type: 'opened',
  });

  if (insertError) {
    trackDevLog('open', 'event insert failure', { error: insertError.message });
    return;
  }

  trackDevLog('open', 'unique event inserted', {
    campaignId: tokenRow.campaign_id,
    recipientId: tokenRow.recipient_id,
    eventType: 'opened',
  });

  await incrementCampaignUniqueCounter(tokenRow.campaign_id, 'opened_count');
}

export async function countUniqueCampaignEngagement(campaignId: string): Promise<{
  uniqueOpened: number;
  uniqueClicked: number;
}> {
  const admin = createAdminClient();

  const [openTokens, clickLinks] = await Promise.all([
    admin
      .from('email_open_tokens')
      .select('recipient_id, first_opened_at')
      .eq('campaign_id', campaignId),
    admin
      .from('email_click_links')
      .select('recipient_id, original_url, first_clicked_at')
      .eq('campaign_id', campaignId),
  ]);

  const uniqueOpened = (openTokens.data ?? []).reduce((acc, row) => {
    if (row.first_opened_at != null && row.recipient_id) acc.add(row.recipient_id as string);
    return acc;
  }, new Set<string>()).size;

  const uniqueClickKeys = new Set<string>();
  for (const row of clickLinks.data ?? []) {
    if (row.first_clicked_at == null || !row.recipient_id) continue;
    uniqueClickKeys.add(`${row.recipient_id}\0${row.original_url}`);
  }

  return {
    uniqueOpened,
    uniqueClicked: uniqueClickKeys.size,
  };
}

/** Delivered = outbox handoff to provider (sent) or provider delivered webhook status. */
export async function countCampaignOutboxDelivered(campaignId: string): Promise<number> {
  const admin = createAdminClient();

  const { count, error } = await admin
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['sent', 'delivered']);

  if (error) {
    console.error('[email-center] countCampaignOutboxDelivered error:', error.message);
    return 0;
  }

  return count ?? 0;
}

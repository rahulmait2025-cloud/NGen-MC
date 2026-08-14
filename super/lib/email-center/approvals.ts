import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCampaignById } from './campaigns';

export interface ApprovalResult {
  ok: boolean;
  error?: string;
}

export interface ApprovalEvent {
  id: string;
  campaign_id: string;
  event_type: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

async function insertApprovalEvent(
  campaignId: string,
  eventType: string,
  actorId: string | null,
  note: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  await admin.from('email_campaign_approval_events').insert({
    campaign_id: campaignId,
    event_type: eventType,
    actor_id: actorId,
    note: note,
    metadata: metadata ?? {},
  });
}

export async function requestCampaignApproval(
  campaignId: string,
  note: string | null,
  actorId?: string
): Promise<ApprovalResult> {
  const admin = createAdminClient();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { ok: false, error: 'Campaign not found.' };

  if (campaign.approval_status === 'approved') {
    return { ok: false, error: 'Campaign is already approved.' };
  }
  if (campaign.approval_status === 'pending_review') {
    return { ok: false, error: 'Approval request is already pending.' };
  }

  const { error } = await admin
    .from('email_campaigns')
    .update({
      approval_status: 'pending_review',
      approval_requested_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (error) return { ok: false, error: error.message };

  await insertApprovalEvent(campaignId, 'requested', actorId ?? null, note);

  return { ok: true };
}

export async function approveCampaign(
  campaignId: string,
  note: string | null,
  actorId?: string
): Promise<ApprovalResult> {
  const admin = createAdminClient();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { ok: false, error: 'Campaign not found.' };

  if (campaign.approval_status !== 'pending_review') {
    return { ok: false, error: `Approval status is ${campaign.approval_status}. Cannot approve.` };
  }

  const { error } = await admin
    .from('email_campaigns')
    .update({
      approval_status: 'approved',
      approved_by: actorId ?? null,
      approved_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (error) return { ok: false, error: error.message };

  await insertApprovalEvent(campaignId, 'approved', actorId ?? null, note);

  return { ok: true };
}

export async function rejectCampaign(
  campaignId: string,
  reason: string,
  actorId?: string
): Promise<ApprovalResult> {
  const admin = createAdminClient();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { ok: false, error: 'Campaign not found.' };

  if (campaign.approval_status !== 'pending_review') {
    return { ok: false, error: `Approval status is ${campaign.approval_status}. Cannot reject.` };
  }

  if (!reason?.trim()) return { ok: false, error: 'Rejection reason is required.' };

  const { error } = await admin
    .from('email_campaigns')
    .update({
      approval_status: 'rejected',
      rejected_by: actorId ?? null,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', campaignId);

  if (error) return { ok: false, error: error.message };

  await insertApprovalEvent(campaignId, 'rejected', actorId ?? null, reason);

  return { ok: true };
}

export async function cancelApprovalRequest(
  campaignId: string,
  actorId?: string
): Promise<ApprovalResult> {
  const admin = createAdminClient();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { ok: false, error: 'Campaign not found.' };

  if (campaign.approval_status !== 'pending_review') {
    return { ok: false, error: `Approval status is ${campaign.approval_status}. No pending request to cancel.` };
  }

  const { error } = await admin
    .from('email_campaigns')
    .update({
      approval_status: 'not_required',
      approval_requested_at: null,
    })
    .eq('id', campaignId);

  if (error) return { ok: false, error: error.message };

  await insertApprovalEvent(campaignId, 'cancelled', actorId ?? null, 'Approval request cancelled');

  return { ok: true };
}
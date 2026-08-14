import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createCampaign } from '@/lib/email-center/campaigns';
import { queueCampaignOutbox } from '@/lib/email-center/outbox';
import {
  resolveMentorshipSessionRecipients,
  saveMentorshipAudienceTargets,
  saveMentorshipRecipientSnapshot,
} from '@/lib/services/mentorship-audience-resolver';
import type { MentorshipAudienceTargetInput } from '@/lib/services/mentorship-audience-types';

const MENTORSHIP_TEMPLATE_SLUG = 'founder-mentorship-session-invite';
const MENTORSHIP_TEMPLATE_NAME = 'Founder Mentorship Session Invite';

async function resolveMentorshipInviteTemplate(admin: ReturnType<typeof createAdminClient>) {
  const { data: bySlug } = await admin
    .from('email_templates')
    .select('id, slug, subject_template, preview_text_template, html_template, text_template')
    .eq('slug', MENTORSHIP_TEMPLATE_SLUG)
    .eq('is_active', true)
    .maybeSingle();

  if (bySlug) return bySlug;

  const { data: byName } = await admin
    .from('email_templates')
    .select('id, slug, subject_template, preview_text_template, html_template, text_template')
    .ilike('name', MENTORSHIP_TEMPLATE_NAME)
    .eq('is_active', true)
    .maybeSingle();

  return byName ?? null;
}

export interface ScheduleMentorshipInput {
  title: string;
  meetingUrl: string;
  sessionDate: string;
  sessionDay: string;
  startTimeIst: string;
  endTimeIst: string;
  description?: string | null;
  createdBy?: string | null;
  audienceTargets?: MentorshipAudienceTargetInput[];
}

export interface MentorshipSessionRecord {
  id: string;
  title: string;
  meeting_url: string;
  session_date: string;
  session_day: string;
  start_time_ist: string;
  end_time_ist: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function validateMentorshipSessionInput(input: Omit<ScheduleMentorshipInput, 'createdBy'>) {
  if (!input.title.trim()) throw new Error('Title is required.');
  if (!isValidMeetingUrl(input.meetingUrl.trim())) throw new Error('Enter a valid meeting URL.');
  if (!input.sessionDate) throw new Error('Session date is required.');
  if (!input.startTimeIst || !input.endTimeIst) throw new Error('Start and end time are required.');
  if (input.endTimeIst <= input.startTimeIst) {
    throw new Error('End time must be after start time.');
  }

  const sessionDateIso = normalizeSessionDateToIso(input.sessionDate);
  const sessionDate = new Date(`${sessionDateIso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (sessionDate < today) {
    throw new Error('Session date cannot be in the past.');
  }
}

async function checkSessionOverlap(
  sessionDate: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: string,
): Promise<void> {
  const admin = createAdminClient();
  let query = admin
    .from('job_ready_bootcamp_mentorship_sessions')
    .select('id, title, start_time_ist, end_time_ist')
    .eq('session_date', sessionDate)
    .eq('status', 'scheduled');

  if (excludeSessionId) {
    query = query.neq('id', excludeSessionId);
  }

  const { data: existing, error } = await query;
  if (error) throw new Error(error.message);

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  for (const session of existing ?? []) {
    const existStart = timeToMinutes(String(session.start_time_ist));
    const existEnd = timeToMinutes(String(session.end_time_ist));
    if (newStart < existEnd && newEnd > existStart) {
      const trim = (t: string) => t.slice(0, 5);
      throw new Error(
        `Time overlaps with "${session.title}" (${trim(String(session.start_time_ist))} – ${trim(String(session.end_time_ist))}). Choose a different time slot.`,
      );
    }
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

function isValidMeetingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Accept ISO (yyyy-MM-dd) or US (MM/dd/yyyy) and store as ISO for Postgres date columns. */
function normalizeSessionDateToIso(dateStr: string): string {
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  throw new Error('Invalid session date format.');
}

function formatSessionTimeIst(start: string, end: string): string {
  const trim = (t: string) => t.slice(0, 5);
  return `${trim(start)} – ${trim(end)} IST`;
}

function escapeMentorshipEmailHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#039;';
      default:
        return char;
    }
  });
}

/** Pre-rendered HTML/text blocks — empty when no description so the template stays unchanged. */
function buildMentorshipSessionDescriptionEmailBlocks(description: string | null | undefined): {
  session_description: string;
  has_session_description: string;
  session_description_html_block: string;
  session_description_text_block: string;
} {
  const sessionDescription = description?.trim() || null;

  if (!sessionDescription) {
    return {
      session_description: '',
      has_session_description: 'false',
      session_description_html_block: '',
      session_description_text_block: '',
    };
  }

  const escaped = escapeMentorshipEmailHtml(sessionDescription);
  const htmlBody = escaped.replace(/\r\n/g, '\n').replace(/\n/g, '<br />');

  const session_description_html_block =
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#0F172A;">Session Notes</p><p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">'
    + htmlBody
    + '</p></td></tr></table>';

  const session_description_text_block = `\n\nSession Notes:\n${sessionDescription}\n`;

  return {
    session_description: sessionDescription,
    has_session_description: 'true',
    session_description_html_block,
    session_description_text_block,
  };
}

export async function listMentorshipSessions(options?: {
  page?: number;
  limit?: number;
}): Promise<{ sessions: MentorshipSessionRecord[]; total: number }> {
  const admin = createAdminClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const [{ count }, { data, error }] = await Promise.all([
    admin
      .from('job_ready_bootcamp_mentorship_sessions')
      .select('*', { count: 'exact', head: true }),
    admin
      .from('job_ready_bootcamp_mentorship_sessions')
      .select('*')
      .order('session_date', { ascending: false })
      .order('start_time_ist', { ascending: false })
      .range(from, to),
  ]);

  if (error) throw new Error(error.message);
  return { sessions: (data ?? []) as MentorshipSessionRecord[], total: count ?? 0 };
}

async function getMentorshipSessionById(sessionId: string): Promise<MentorshipSessionRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_ready_bootcamp_mentorship_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as MentorshipSessionRecord | null) ?? null;
}

export async function scheduleMentorshipSession(
  input: ScheduleMentorshipInput,
): Promise<{
  sessionId: string;
  emailsQueued: number;
  emailsSent: number;
  emailsFailed: number;
  emailsSuppressed: number;
  enrolledCount: number;
  recipientCount: number;
  emailError?: string;
}> {
  validateMentorshipSessionInput(input);

  if (!input.audienceTargets?.length) {
    throw new Error('Select at least one audience target.');
  }

  const sessionDateIso = normalizeSessionDateToIso(input.sessionDate);

  await checkSessionOverlap(sessionDateIso, input.startTimeIst, input.endTimeIst);

  const resolvedRecipients = await resolveMentorshipSessionRecipients(input.audienceTargets);
  if (resolvedRecipients.length === 0) {
    throw new Error('No active students matched the selected audience.');
  }

  const admin = createAdminClient();

  const { data: session, error: sessionError } = await admin
    .from('job_ready_bootcamp_mentorship_sessions')
    .insert({
      title: input.title.trim(),
      meeting_url: input.meetingUrl.trim(),
      session_date: sessionDateIso,
      session_day: input.sessionDay.trim(),
      start_time_ist: input.startTimeIst,
      end_time_ist: input.endTimeIst,
      description: input.description?.trim() || null,
      status: 'scheduled',
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? 'Failed to save mentorship session.');
  }

  await saveMentorshipAudienceTargets(session.id, input.audienceTargets);
  await saveMentorshipRecipientSnapshot(session.id, resolvedRecipients);

  let emailsQueued = 0;
  let emailsSent = 0;
  let emailsFailed = 0;
  let emailsSuppressed = 0;
  const recipientCount = resolvedRecipients.length;
  let emailError: string | undefined;

  try {
    const emailResult = await queueMentorshipInviteEmails({
      sessionId: session.id,
      sessionTitle: input.title.trim(),
      sessionDate: sessionDateIso,
      sessionDay: input.sessionDay.trim(),
      sessionTimeIst: formatSessionTimeIst(input.startTimeIst, input.endTimeIst),
      meetingUrl: input.meetingUrl.trim(),
      sessionDescription: input.description?.trim() || null,
      createdBy: input.createdBy ?? null,
      recipients: resolvedRecipients,
    });
    emailsQueued = emailResult.queuedCount;
    emailsSent = emailResult.sentCount;
    emailsFailed = emailResult.failedCount;
    emailsSuppressed = emailResult.suppressedCount;

    if (emailResult.sendError) {
      emailError = emailResult.sendError;
    } else if (emailsFailed > 0 && emailsSent === 0) {
      emailError = `Failed to send emails to ${emailsFailed} enrolled student${emailsFailed === 1 ? '' : 's'}.`;
    } else if (emailsFailed > 0) {
      emailError = `Sent ${emailsSent} email${emailsSent === 1 ? '' : 's'}; ${emailsFailed} failed.`;
    }
  } catch (error) {
    emailError = error instanceof Error ? error.message : 'Failed to queue mentorship emails.';
    console.error('[mentorship] email dispatch failed after session save', {
      sessionId: session.id,
      sessionTitle: input.title.trim(),
      error: emailError,
    });
  }

  return {
    sessionId: session.id,
    emailsQueued,
    emailsSent,
    emailsFailed,
    emailsSuppressed,
    enrolledCount: recipientCount,
    recipientCount,
    emailError,
  };
}

export async function updateMentorshipSession(
  sessionId: string,
  input: Omit<ScheduleMentorshipInput, 'createdBy'>,
): Promise<{ sessionId: string; audienceUpdated: boolean; recipientCount: number }> {
  validateMentorshipSessionInput(input);

  const admin = createAdminClient();
  const existing = await getMentorshipSessionById(sessionId);
  if (!existing) throw new Error('Mentorship session not found.');
  if (existing.status !== 'scheduled') {
    throw new Error('Only scheduled sessions can be edited.');
  }

  const sessionDateIso = normalizeSessionDateToIso(input.sessionDate);

  await checkSessionOverlap(sessionDateIso, input.startTimeIst, input.endTimeIst, sessionId);

  const { data, error } = await admin
    .from('job_ready_bootcamp_mentorship_sessions')
    .update({
      title: input.title.trim(),
      meeting_url: input.meetingUrl.trim(),
      session_date: sessionDateIso,
      session_day: input.sessionDay.trim(),
      start_time_ist: input.startTimeIst,
      end_time_ist: input.endTimeIst,
      description: input.description?.trim() || null,
    })
    .eq('id', sessionId)
    .eq('status', 'scheduled')
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update mentorship session.');
  }

  let audienceUpdated = false;
  let recipientCount = 0;

  if (input.audienceTargets?.length) {
    const { data: sentRows } = await admin
      .from('job_ready_bootcamp_mentorship_recipients')
      .select('id')
      .eq('session_id', sessionId)
      .in('email_status', ['sent', 'queued']);

    if ((sentRows ?? []).length > 0) {
      throw new Error(
        'Emails were already sent for this session. Audience cannot be changed.',
      );
    }

    const resolvedRecipients = await resolveMentorshipSessionRecipients(input.audienceTargets);
    if (resolvedRecipients.length === 0) {
      throw new Error('No active students matched the selected audience.');
    }

    await saveMentorshipAudienceTargets(sessionId, input.audienceTargets);
    await saveMentorshipRecipientSnapshot(sessionId, resolvedRecipients, { replaceExisting: true });
    audienceUpdated = true;
    recipientCount = resolvedRecipients.length;
  }

  return { sessionId: data.id, audienceUpdated, recipientCount };
}

export async function cancelMentorshipSession(sessionId: string): Promise<void> {
  const admin = createAdminClient();
  const existing = await getMentorshipSessionById(sessionId);
  if (!existing) throw new Error('Mentorship session not found.');
  if (existing.status !== 'scheduled') {
    throw new Error('Only scheduled sessions can be removed.');
  }

  const { error } = await admin
    .from('job_ready_bootcamp_mentorship_sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId)
    .eq('status', 'scheduled');

  if (error) throw new Error(error.message);
}

export async function deleteMentorshipSession(sessionId: string): Promise<void> {
  const admin = createAdminClient();
  const existing = await getMentorshipSessionById(sessionId);
  if (!existing) throw new Error('Mentorship session not found.');

  const { error } = await admin
    .from('job_ready_bootcamp_mentorship_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}

export async function bulkDeleteMentorshipSessions(sessionIds: string[]): Promise<{ deleted: number }> {
  const admin = createAdminClient();
  if (sessionIds.length === 0) return { deleted: 0 };

  const { error, count } = await admin
    .from('job_ready_bootcamp_mentorship_sessions')
    .delete({ count: 'exact' })
    .in('id', sessionIds);

  if (error) throw new Error(error.message);
  return { deleted: count ?? 0 };
}

async function dispatchMentorshipCampaign(campaignId: string): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  error?: string;
}> {
  const { processEmailOutboxBatchForCampaign } = await import('@/lib/email-center/send-processor');

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let lastError: string | undefined;
  let done = false;
  let iterations = 0;
  const maxIterations = 200;

  while (!done && iterations < maxIterations) {
    iterations += 1;
    const result = await processEmailOutboxBatchForCampaign({
      campaignId,
      batchSize: 25,
      lockToken: `mentorship:${campaignId}:${Date.now()}`,
    });

    if (result.error) {
      lastError = result.error;
      break;
    }

    totalSent += result.sent ?? 0;
    totalFailed += result.failed ?? 0;
    totalSkipped += result.skipped ?? 0;
    done = result.done;
  }

  if (!done && iterations >= maxIterations) {
    lastError = lastError ?? 'Mentorship email dispatch exceeded the maximum batch attempts.';
  }

  if (!lastError && totalSent === 0 && totalFailed === 0 && totalSkipped === 0) {
    lastError = 'No mentorship emails were dispatched from the outbox.';
  } else if (!lastError && totalSent === 0 && totalFailed > 0) {
    lastError = `Failed to send emails to ${totalFailed} recipient${totalFailed === 1 ? '' : 's'}.`;
  } else if (!lastError && totalSent === 0 && totalSkipped > 0) {
    lastError = `All ${totalSkipped} recipient${totalSkipped === 1 ? '' : 's'} were suppressed by email preferences.`;
  }

  return { sent: totalSent, failed: totalFailed, skipped: totalSkipped, error: lastError };
}

async function queueMentorshipInviteEmails(params: {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  sessionDay: string;
  sessionTimeIst: string;
  meetingUrl: string;
  sessionDescription?: string | null;
  createdBy: string | null;
  recipients: Array<{
    studentId: string;
    email: string;
    fullName: string;
    firstName: string;
    authUserId: string;
    collegeId: string | null;
    collegeName: string | null;
  }>;
}): Promise<{
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  sendError?: string;
}> {
  const admin = createAdminClient();

  const template = await resolveMentorshipInviteTemplate(admin);

  if (!template) {
    throw new Error(
      'Email template not found (slug: founder-mentorship-session-invite or name: Founder Mentorship Session Invite).',
    );
  }

  const recipients = params.recipients;
  if (recipients.length === 0) {
    return { queuedCount: 0, sentCount: 0, failedCount: 0, suppressedCount: 0 };
  }

  const descriptionBlocks = buildMentorshipSessionDescriptionEmailBlocks(params.sessionDescription);

  const campaign = await createCampaign(
    {
      name: `Mentorship: ${params.sessionTitle} (${params.sessionDate})`,
      email_category: 'transactional_essential',
      template_id: template.id,
      subject: template.subject_template,
      preview_text: template.preview_text_template,
      html_body: template.html_template,
      text_body: template.text_template,
      template_variable_values: {
        mentor_name: 'CTO Bhaiya',
        session_title: params.sessionTitle,
        session_date: `${params.sessionDay}, ${params.sessionDate}`,
        session_day: params.sessionDay,
        session_time: params.sessionTimeIst,
        session_time_ist: params.sessionTimeIst,
        meeting_url: params.meetingUrl,
        zoom_meeting_url: params.meetingUrl,
        program_name: 'Job Ready Bootcamp',
        bootcamp_name: 'Job Ready Bootcamp',
        cta_label: 'Join Session',
        cta_url: params.meetingUrl,
        ...descriptionBlocks,
      },
      audience_config: {
        type: 'manual_emails',
        manual_emails: recipients.map((r) => r.email).join(','),
        mentorship_session_id: params.sessionId,
      },
    },
    params.createdBy ?? undefined,
  );

  const recipientRows = recipients.map((recipient) => ({
    campaign_id: campaign.id,
    recipient_type: 'student',
    source_table: 'students',
    source_id: recipient.studentId,
    auth_user_id: recipient.authUserId,
    college_id: recipient.collegeId,
    college_name: recipient.collegeName,
    email: recipient.email,
    full_name: recipient.fullName,
    first_name: recipient.firstName,
    variables: {
      first_name: recipient.firstName,
      full_name: recipient.fullName,
      student_name: recipient.fullName,
      session_title: params.sessionTitle,
      session_date: `${params.sessionDay}, ${params.sessionDate}`,
      session_day: params.sessionDay,
      session_time: params.sessionTimeIst,
      session_time_ist: params.sessionTimeIst,
      meeting_url: params.meetingUrl,
      zoom_meeting_url: params.meetingUrl,
      program_name: 'Job Ready Bootcamp',
      bootcamp_name: 'Job Ready Bootcamp',
      mentor_name: 'CTO Bhaiya',
      college_name: recipient.collegeName ?? 'Your College',
      ...descriptionBlocks,
    },
    status: 'snapshotted' as const,
    suppression_reason: null,
  }));

  const recipientBatches: typeof recipientRows[] = [];
  for (let i = 0; i < recipientRows.length; i += 100) {
    recipientBatches.push(recipientRows.slice(i, i + 100));
  }

  const batchResults = await Promise.allSettled(
    recipientBatches.map((batch) =>
      admin.from('email_campaign_recipients').insert(batch),
    ),
  );

  for (const r of batchResults) {
    if (r.status === 'rejected') throw new Error(`Failed to snapshot recipients: ${r.reason?.message}`);
    if (r.value.error) throw new Error(`Failed to snapshot recipients: ${r.value.error.message}`);
  }

  await Promise.all([
    admin
      .from('email_campaigns')
      .update({ recipient_count: recipientRows.length, status: 'draft' })
      .eq('id', campaign.id),
    admin
      .from('job_ready_bootcamp_mentorship_recipients')
      .update({ email_status: 'queued' })
      .eq('session_id', params.sessionId)
      .eq('email_status', 'pending'),
  ]);

  const queueResult = await queueCampaignOutbox(campaign.id);
  if (!queueResult.ok) {
    await admin
      .from('job_ready_bootcamp_mentorship_recipients')
      .update({ email_status: 'failed' })
      .eq('session_id', params.sessionId)
      .eq('email_status', 'queued');

    throw new Error(queueResult.error ?? 'Failed to queue mentorship emails.');
  }

  const { count: outboxRowCount } = await admin
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  const effectiveQueuedCount = Math.max(queueResult.queuedCount, outboxRowCount ?? 0);

  if (effectiveQueuedCount === 0) {
    await admin
      .from('job_ready_bootcamp_mentorship_recipients')
      .update({ email_status: 'suppressed' })
      .eq('session_id', params.sessionId)
      .in('email_status', ['pending', 'queued']);

    return {
      queuedCount: 0,
      sentCount: 0,
      failedCount: 0,
      suppressedCount: queueResult.suppressedCount,
      sendError:
        queueResult.suppressedCount > 0
          ? 'All recipients were suppressed by email preferences.'
          : 'No mentorship emails could be queued.',
    };
  }

  const sendResult = await dispatchMentorshipCampaign(campaign.id);
  const nowIso = new Date().toISOString();

  if (sendResult.error || sendResult.sent === 0) {
    const nextStatus = sendResult.skipped > 0 && sendResult.failed === 0 ? 'suppressed' : 'failed';

    await admin
      .from('job_ready_bootcamp_mentorship_recipients')
      .update({ email_status: nextStatus })
      .eq('session_id', params.sessionId)
      .in('email_status', ['pending', 'queued']);

    if (sendResult.error || sendResult.failed > 0) {
      console.error('[mentorship] email send failed after queue', {
        campaignId: campaign.id,
        sessionId: params.sessionId,
        sent: sendResult.sent,
        failed: sendResult.failed,
        skipped: sendResult.skipped,
        error: sendResult.error,
      });
    }
  } else {
    await admin
      .from('job_ready_bootcamp_mentorship_recipients')
      .update({ email_status: 'sent', email_sent_at: nowIso })
      .eq('session_id', params.sessionId)
      .in('email_status', ['pending', 'queued']);
  }

  return {
    queuedCount: effectiveQueuedCount,
    sentCount: sendResult.sent,
    failedCount: sendResult.failed,
    suppressedCount: queueResult.suppressedCount,
    sendError: sendResult.error,
  };
}

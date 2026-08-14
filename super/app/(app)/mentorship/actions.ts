'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth/session';
import {
  listMentorshipSessions,
  scheduleMentorshipSession,
  updateMentorshipSession,
  cancelMentorshipSession,
  deleteMentorshipSession,
  bulkDeleteMentorshipSessions,
} from '@/lib/services/job-ready-bootcamp-mentorship';
import type { MentorshipAudienceTargetInput } from '@/lib/services/mentorship-audience-types';

function parseAudienceTargets(raw: string | null): MentorshipAudienceTargetInput[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as MentorshipAudienceTargetInput[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item
        && typeof item.targetType === 'string'
        && (item.targetType === 'all_bootcamp_enrolled' || typeof item.targetId === 'string'),
    );
  } catch {
    return [];
  }
}

function parseMentorshipFormData(formData: FormData) {
  return {
    title: String(formData.get('title') ?? ''),
    meetingUrl: String(formData.get('meeting_url') ?? ''),
    sessionDate: String(formData.get('session_date') ?? ''),
    sessionDay: String(formData.get('session_day') ?? ''),
    startTimeIst: String(formData.get('start_time_ist') ?? ''),
    endTimeIst: String(formData.get('end_time_ist') ?? ''),
    description: String(formData.get('description') ?? ''),
    audienceTargets: parseAudienceTargets(String(formData.get('audience_targets') ?? '')),
  };
}

export async function scheduleMentorshipSessionAction(formData: FormData) {
  const { session } = await getSession();
  if (!session?.user) {
    return { ok: false as const, error: 'Unauthorized' };
  }

  try {
    const result = await scheduleMentorshipSession({
      ...parseMentorshipFormData(formData),
      createdBy: session.user.id,
    });

    revalidatePath('/mentorship');

    return {
      ok: true as const,
      sessionId: result.sessionId,
      emailsQueued: result.emailsQueued,
      emailsSent: result.emailsSent,
      emailsFailed: result.emailsFailed,
      emailsSuppressed: result.emailsSuppressed,
      enrolledCount: result.recipientCount,
      recipientCount: result.recipientCount,
      emailError: result.emailError,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to schedule session';
    return { ok: false as const, error: message };
  }
}

export async function updateMentorshipSessionAction(formData: FormData) {
  const { session } = await getSession();
  if (!session?.user) {
    return { ok: false as const, error: 'Unauthorized' };
  }

  const sessionId = String(formData.get('session_id') ?? '');
  if (!sessionId) {
    return { ok: false as const, error: 'Session id is required.' };
  }

  try {
    const result = await updateMentorshipSession(sessionId, parseMentorshipFormData(formData));
    revalidatePath('/mentorship');
    return { ok: true as const, sessionId: result.sessionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update session';
    return { ok: false as const, error: message };
  }
}

export async function cancelMentorshipSessionAction(sessionId: string) {
  const { session } = await getSession();
  if (!session?.user) {
    return { ok: false as const, error: 'Unauthorized' };
  }

  if (!sessionId) {
    return { ok: false as const, error: 'Session id is required.' };
  }

  try {
    await cancelMentorshipSession(sessionId);
    revalidatePath('/mentorship');
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove session';
    return { ok: false as const, error: message };
  }
}

export async function deleteMentorshipSessionAction(sessionId: string) {
  const { session } = await getSession();
  if (!session?.user) {
    return { ok: false as const, error: 'Unauthorized' };
  }

  if (!sessionId) {
    return { ok: false as const, error: 'Session id is required.' };
  }

  try {
    await deleteMentorshipSession(sessionId);
    revalidatePath('/mentorship');
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete session';
    return { ok: false as const, error: message };
  }
}

export async function bulkDeleteMentorshipSessionsAction(sessionIds: string[]) {
  const { session } = await getSession();
  if (!session?.user) {
    return { ok: false as const, error: 'Unauthorized' };
  }

  if (!sessionIds.length) {
    return { ok: false as const, error: 'No sessions selected.' };
  }

  try {
    const result = await bulkDeleteMentorshipSessions(sessionIds);
    revalidatePath('/mentorship');
    return { ok: true as const, deleted: result.deleted };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete sessions';
    return { ok: false as const, error: message };
  }
}

async function _loadMentorshipSessionsAction(page: number = 1) {
  const { sessions, total } = await listMentorshipSessions({ page, limit: 20 });
  return { ok: true as const, sessions, total, page };
}

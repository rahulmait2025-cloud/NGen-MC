import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface MentorshipSessionRow {
  id: string;
  title: string;
  session_date: string;
  session_day: string;
  start_time_ist: string;
  end_time_ist: string;
  description: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  your_students_count: number;
}

export interface MentorshipRecipientRow {
  student_id: string;
  full_name: string | null;
  email: string | null;
  email_status: 'pending' | 'queued' | 'sent' | 'failed' | 'suppressed' | 'skipped';
  source_type: string | null;
  email_sent_at: string | null;
}

export async function listMentorshipSessionsForCollege(
  collegeId: string,
): Promise<MentorshipSessionRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('mentorship-sessions');
  const sb = createServiceRoleClient();

  const { data, error } = await sb
    .from('job_ready_bootcamp_mentorship_recipients')
    .select(`
      session_id,
      session:job_ready_bootcamp_mentorship_sessions (
        id,
        title,
        session_date,
        session_day,
        start_time_ist,
        end_time_ist,
        description,
        status
      )
    `)
    .eq('college_id', collegeId);

  if (error) {
    console.error('Failed to list mentorship sessions for college:', error);
    return [];
  }

  const sessionMap = new Map<string, MentorshipSessionRow>();

  for (const row of data ?? []) {
    const session = row.session as unknown as {
      id: string;
      title: string;
      session_date: string;
      session_day: string;
      start_time_ist: string;
      end_time_ist: string;
      description: string | null;
      status: 'scheduled' | 'completed' | 'cancelled';
    } | null;

    if (!session) continue;

    if (sessionMap.has(session.id)) {
      const existing = sessionMap.get(session.id)!;
      existing.your_students_count += 1;
    } else {
      sessionMap.set(session.id, {
        id: session.id,
        title: session.title,
        session_date: session.session_date,
        session_day: session.session_day,
        start_time_ist: session.start_time_ist,
        end_time_ist: session.end_time_ist,
        description: session.description,
        status: session.status,
        your_students_count: 1,
      });
    }
  }

  const sessions = Array.from(sessionMap.values());
  sessions.sort((a, b) => {
    if (a.session_date !== b.session_date) return a.session_date > b.session_date ? -1 : 1;
    return a.start_time_ist > b.start_time_ist ? -1 : 1;
  });

  return sessions;
}

export async function listMentorshipRecipientsForSession(
  sessionId: string,
  collegeId: string,
): Promise<MentorshipRecipientRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('mentorship-recipients');
  const sb = createServiceRoleClient();

  const { data, error } = await sb
    .from('job_ready_bootcamp_mentorship_recipients')
    .select(`
      student_id,
      email_status,
      source_type,
      email_sent_at,
      students!inner(
        user_id,
        profiles!inner(full_name, email)
      )
    `)
    .eq('session_id', sessionId)
    .eq('college_id', collegeId);

  if (error) {
    console.error('Failed to list mentorship recipients:', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const students = row.students as Record<string, unknown> | undefined;
    const profiles = students?.profiles as Record<string, unknown> | undefined;
    return {
      student_id: row.student_id as string,
      full_name: (profiles?.full_name as string) ?? null,
      email: (profiles?.email as string) ?? null,
      email_status: row.email_status as MentorshipRecipientRow['email_status'],
      source_type: row.source_type as string | null,
      email_sent_at: row.email_sent_at as string | null,
    };
  });
}

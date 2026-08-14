import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { STREAK_TIMEZONE } from '@/lib/streak/daily-streak';
import { toActivityCalendarDay, getTodayCalendarDay } from '@/lib/activity/heatmap-utils';

export type LearningActivityKind =
  | 'site_visit'
  | 'video_watched'
  | 'assignment_done'
  | 'quiz_taken';

export type StudentLearningActivity = {
  id: string;
  kind: LearningActivityKind;
  title: string;
  subtitle: string | null;
  occurredAt: string;
  calendarDay: string;
};

const HEATMAP_HISTORY_YEARS = 5;

function earliestFetchDay(timeZone: string): string {
  const currentYear = parseInt(getTodayCalendarDay(timeZone).slice(0, 4), 10);
  const startYear = currentYear - (HEATMAP_HISTORY_YEARS - 1);
  return `${startYear}-01-01`;
}

function dayStartIso(calendarDay: string): string {
  return `${calendarDay}T00:00:00.000Z`;
}

function uniqueTruthyIds<T>(rows: T[] | null | undefined, getId: (row: T) => string | null): string[] {
  const ids = new Set<string>();
  for (const row of rows ?? []) {
    const id = getId(row);
    if (id) ids.add(id);
  }
  return [...ids];
}

async function loadItemTitles(
  itemIds: string[],
): Promise<Map<string, { title: string; item_type: string }>> {
  const map = new Map<string, { title: string; item_type: string }>();
  if (itemIds.length === 0) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from('master_course_items')
    .select('id, title, item_type')
    .in('id', itemIds);

  for (const row of data ?? []) {
    map.set(row.id, { title: row.title, item_type: row.item_type });
  }
  return map;
}

/**
 * Meaningful student activities only: daily visit, video watch, assignment, quiz.
 * Sorted newest first.
 */
export async function getStudentLearningActivities(
  studentId: string,
  options?: { timeZone?: string },
): Promise<StudentLearningActivity[]> {
  const timeZone = options?.timeZone ?? STREAK_TIMEZONE;
  const sinceDay = earliestFetchDay(timeZone);
  const sinceIso = dayStartIso(sinceDay);
  const admin = createAdminClient();
  const activities: StudentLearningActivity[] = [];

  const [visitResult, sessionResult, progressResult, attemptResult] = await Promise.all([
    admin
      .from('student_daily_visits')
      .select('id, visit_date, created_at')
      .eq('student_id', studentId)
      .gte('visit_date', sinceDay),
    admin
      .from('video_watch_sessions')
      .select('id, started_at, created_at, total_video_seconds_watched, lesson_id')
      .eq('student_id', studentId)
      .gt('total_video_seconds_watched', 0)
      .gte('created_at', sinceIso),
    admin
      .from('student_progress')
      .select('id, completed_at, item_id')
      .eq('student_id', studentId)
      .eq('completed', true)
      .not('completed_at', 'is', null)
      .gte('completed_at', sinceIso),
    admin
      .from('assessment_attempts')
      .select('id, end_time, updated_at, created_at, status, assignment_id')
      .eq('student_id', studentId)
      .in('status', ['submitted', 'auto_submitted', 'time_expired'])
      .gte('created_at', sinceIso),
  ]);

  const visitRows = visitResult.data;
  const sessionRows = sessionResult.data;
  const progressRows = progressResult.data;
  const attemptRows = attemptResult.data;

  for (const row of visitRows ?? []) {
    if (!row.visit_date) continue;
    activities.push({
      id: `visit-${row.id}`,
      kind: 'site_visit',
      title: 'Opened website',
      subtitle: 'Daily platform visit',
      occurredAt: row.created_at ?? dayStartIso(row.visit_date),
      calendarDay: row.visit_date,
    });
  }

  const sessionItemIds = uniqueTruthyIds(sessionRows, (row) => row.lesson_id);
  const progressItemIds = uniqueTruthyIds(progressRows, (row) => row.item_id);
  const [sessionItems, progressItems] = await Promise.all([
    loadItemTitles(sessionItemIds),
    loadItemTitles(progressItemIds),
  ]);

  for (const row of sessionRows ?? []) {
    const occurredAt = row.started_at ?? row.created_at;
    const day = toActivityCalendarDay(occurredAt, timeZone);
    if (!day) continue;
    const item = row.lesson_id ? sessionItems.get(row.lesson_id) : undefined;
    activities.push({
      id: `video-${row.id}`,
      kind: 'video_watched',
      title: item?.title ? `Watched: ${item.title}` : 'Watched a video',
      subtitle: 'Video lesson',
      occurredAt,
      calendarDay: day,
    });
  }

  for (const row of progressRows ?? []) {
    if (!row.completed_at || !row.item_id) continue;
    const item = progressItems.get(row.item_id);
    if (!item) continue;

    let kind: LearningActivityKind | null = null;
    if (item.item_type === 'assignment_placeholder') kind = 'assignment_done';
    if (item.item_type === 'quiz_placeholder') kind = 'quiz_taken';
    if (!kind) continue;

    const day = toActivityCalendarDay(row.completed_at, timeZone);
    if (!day) continue;

    activities.push({
      id: `progress-${row.id}`,
      kind,
      title:
        kind === 'assignment_done'
          ? item.title
            ? `Completed: ${item.title}`
            : 'Completed assignment'
          : item.title
            ? `Quiz: ${item.title}`
            : 'Took a quiz',
      subtitle: kind === 'assignment_done' ? 'Assignment' : 'Quiz',
      occurredAt: row.completed_at,
      calendarDay: day,
    });
  }

  const assignmentIds = uniqueTruthyIds(attemptRows, (row) => row.assignment_id);
  const assessmentTitles = new Map<string, string>();

  if (assignmentIds.length > 0) {
    const { data: assignmentRows } = await admin
      .from('assessment_assignments')
      .select('id, assessment_id')
      .in('id', assignmentIds);

    const assessmentIds = uniqueTruthyIds(assignmentRows, (row) => row.assessment_id);

    if (assessmentIds.length > 0) {
      const { data: assessmentRows } = await admin
        .from('assessments')
        .select('id, title')
        .in('id', assessmentIds);

      const titleByAssessmentId = new Map(
        (assessmentRows ?? []).map((a) => [a.id, a.title as string]),
      );

      for (const assignment of assignmentRows ?? []) {
        const title = titleByAssessmentId.get(assignment.assessment_id);
        if (title) assessmentTitles.set(assignment.id, title);
      }
    }
  }

  for (const row of attemptRows ?? []) {
    const occurredAt = row.end_time ?? row.updated_at ?? row.created_at;
    const day = toActivityCalendarDay(occurredAt, timeZone);
    if (!day) continue;
    const assessmentTitle = assessmentTitles.get(row.assignment_id);
    activities.push({
      id: `quiz-attempt-${row.id}`,
      kind: 'quiz_taken',
      title: assessmentTitle ? `Quiz: ${assessmentTitle}` : 'Took a quiz',
      subtitle: 'Assessment',
      occurredAt,
      calendarDay: day,
    });
  }

  activities.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return activities;
}

/** Per-day counts for heatmap — one point per meaningful activity. */
export function buildHeatmapCountsFromActivities(
  activities: StudentLearningActivity[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const activity of activities) {
    counts[activity.calendarDay] = (counts[activity.calendarDay] ?? 0) + 1;
  }
  return counts;
}

async function _getStudentLearningHeatmapCounts(
  studentId: string,
  options?: { timeZone?: string },
): Promise<Record<string, number>> {
  const activities = await getStudentLearningActivities(studentId, options);
  return buildHeatmapCountsFromActivities(activities);
}

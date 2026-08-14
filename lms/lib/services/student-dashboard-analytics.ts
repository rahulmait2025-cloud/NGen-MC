import 'server-only';

import { cache } from 'react';
import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { StudentLearningContext } from '@/lib/services/student-courses';
import {
  APPLICATION_TIMEZONE,
  addLocalDays,
  getLocalWeekBoundsUtc,
  getTodayApplicationLocalDate,
  localDateTimeToUtc,
  startOfLocalMonth,
  startOfNextLocalMonth,
  toApplicationLocalDate,
} from '@/lib/time/application-timezone';

export type DashboardDailyActivity = {
  localDate: string;
  weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  watchedSeconds: number;
  distinctLessons: number;
};

export type StudentDashboardAnalytics = {
  lifetimeWatchedSeconds: number;
  weeklyWatchedSeconds: number;
  weeklyDistinctLessons: number;
  dailyActivity: DashboardDailyActivity[];
  completedLessons: number;
  enrolledCourses: number;
  currentStreak: number;
  bestStreak: number;
  activeDaysThisMonth: number;
  activeDates: string[];
  todayLocalDate: string;
  weekStartLocalDate: string;
  nextWeekStartLocalDate: string;
  timeZone: string;
};

type SegmentRow = {
  lesson_id: string | null;
  start_second: number | null;
  end_second: number | null;
  created_at: string | null;
  segment_started_at?: string | null;
  segment_ended_at?: string | null;
};

type VideoProgressCompletionRow = {
  lesson_id: string | null;
  completed: boolean | null;
  completion_percentage: number | null;
};

type StudentProgressRow = {
  item_id: string | null;
  completed: boolean | null;
};

const VIDEO_COMPLETION_PERCENTAGE_THRESHOLD = 66;

type StudentStreakRow = {
  current_streak: number | null;
  longest_streak: number | null;
  last_visit_date: string | null;
};

type DashboardSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type DayBucket = {
  localDate: string;
  weekday: DashboardDailyActivity['weekday'];
  watchedSeconds: number;
  lessonIds: Set<string>;
};

const WEEKDAYS: DashboardDailyActivity['weekday'][] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function studentDashboardAnalyticsTag(studentId: string, tenantKey: string | null): string {
  return `student-dashboard-analytics-${studentId}-${tenantKey ?? 'global'}`;
}

export function revalidateStudentDashboardAnalytics(studentId: string, tenantKey: string | null): void {
  revalidateTag(studentDashboardAnalyticsTag(studentId, tenantKey), 'max');
}

export const getStudentDashboardAnalytics = cache(async function getStudentDashboardAnalytics(
  context: StudentLearningContext,
): Promise<StudentDashboardAnalytics> {
  const supabase = await createClient();
  const timeZone = APPLICATION_TIMEZONE;
  const todayLocalDate = getTodayApplicationLocalDate(timeZone);
  const { weekStartLocalDate, nextWeekStartLocalDate, weekStartUtc, nextWeekStartUtc } =
    getLocalWeekBoundsUtc(todayLocalDate, timeZone);

  const [enrolledCourses, lifetimeProgressRows, videoProgressRows, studentProgressRows, weeklySegments, visitRows, streakRow] = await Promise.all([
    loadEnrolledCourseCount(supabase, context),
    loadLifetimeVideoProgressRows(supabase, context.studentId),
    loadVideoProgressRows(supabase, context.studentId),
    loadStudentProgressRows(supabase, context.studentId),
    loadWeeklySegmentRows(supabase, context.studentId, weekStartUtc, nextWeekStartUtc),
    loadVisitDates(supabase, context.studentId),
    loadStreakRow(supabase, context.studentId),
  ]);

  const lifetimeWatchedSeconds = lifetimeProgressRows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.total_video_seconds_watched ?? 0)),
    0,
  );

  const completedItemIds = new Set<string>();
  for (const row of studentProgressRows) {
    if (row.completed && row.item_id) completedItemIds.add(row.item_id);
  }
  for (const row of videoProgressRows) {
    if (
      row.lesson_id &&
      ((row.completed ?? false) || Number(row.completion_percentage ?? 0) >= VIDEO_COMPLETION_PERCENTAGE_THRESHOLD)
    ) {
      completedItemIds.add(row.lesson_id);
    }
  }

  const dailyBuckets = createWeekBuckets(weekStartLocalDate);
  allocateSegmentsToBuckets(weeklySegments, dailyBuckets, timeZone);

  const dailyActivity = Array.from(dailyBuckets.values()).map((bucket) => ({
    localDate: bucket.localDate,
    weekday: bucket.weekday,
    watchedSeconds: Math.round(bucket.watchedSeconds * 100) / 100,
    distinctLessons: bucket.lessonIds.size,
  }));

  const weeklyWatchedSeconds = Math.round(
    dailyActivity.reduce((sum, day) => sum + day.watchedSeconds, 0) * 100,
  ) / 100;
  const weeklyDistinctLessons = new Set(
    dailyActivity.flatMap((day) => {
      const bucket = dailyBuckets.get(day.localDate);
      return bucket ? Array.from(bucket.lessonIds) : [];
    }),
  ).size;

  const activeDateSet = new Set<string>();
  for (const row of visitRows) {
    if (row.visit_date) activeDateSet.add(row.visit_date);
  }
  const activeDates = [...activeDateSet].sort();
  const { currentStreak, bestStreak } = resolveStreak(streakRow, todayLocalDate, activeDates);
  const monthStart = startOfLocalMonth(todayLocalDate);
  const nextMonthStart = startOfNextLocalMonth(todayLocalDate);
  const activeDaysThisMonth = activeDates.filter((date) => date >= monthStart && date < nextMonthStart).length;

  return {
    lifetimeWatchedSeconds: Math.round(lifetimeWatchedSeconds * 100) / 100,
    weeklyWatchedSeconds,
    weeklyDistinctLessons,
    dailyActivity,
    completedLessons: completedItemIds.size,
    enrolledCourses,
    currentStreak,
    bestStreak,
    activeDaysThisMonth,
    activeDates,
    todayLocalDate,
    weekStartLocalDate,
    nextWeekStartLocalDate,
    timeZone,
  };
});

/**
 * Canonical distinct learning-product count for the dashboard card.
 *
 * Intentionally does NOT use `get_student_entitled_courses` for counting:
 * that RPC unions the global free catalog (`is_free` / `pricing_model=free` /
 * `course_kind=free_course`) for `p_is_global` students, which is catalog
 * browse access — not enrollment. Counting from that RPC would inflate the
 * card for every published free course.
 *
 * Count sources:
 * 1. Active `student_entitlements` → distinct published master courses
 * 2. Active `student_content_entitlements` type master_course / variant
 * 3. Active college `content_assignments` type master_course (college students)
 * 4. +1 Job Ready Bootcamp when enrolled and feature flag on (pillar courses excluded)
 * 5. +1 per distinct active bundle entitlement (purchased or college-granted SCE)
 *    after published/active bundle filter; bundle component courses excluded
 */
async function loadEnrolledCourseCount(
  _supabase: DashboardSupabaseClient,
  context: StudentLearningContext,
): Promise<number> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const { normUuid } = await import('@/lib/utils');
  const { isEntitlementActive, isAssignmentActive } = await import(
    '@/lib/services/access-helpers'
  );
  const {
    isStudentEnrolledInJobReadyBootcamp,
    getBootcampPillarCourseIdSet,
  } = await import('@/lib/services/job-ready-bootcamp');
  const { isJobReadyBootcampFeatureEnabled } = await import(
    '@/lib/services/job-ready-bootcamp-feature'
  );

  const admin = createAdminClient();

  const collegeAssignmentsPromise =
    context.collegeId && !context.isGlobal
      ? admin
          .from('content_assignments')
          .select('assigned_entity_id, assigned_entity_type, status, start_date, end_date')
          .eq('assignment_type', 'college')
          .eq('target_id', context.collegeId)
          .eq('assigned_entity_type', 'master_course')
          .eq('status', 'active')
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null });

  const [
    courseEntitlementsResult,
    contentEntitlementsResult,
    collegeAssignmentsResult,
    bootcampPillarIds,
    isBootcampEnrolled,
    bootcampFeatureEnabled,
  ] = await Promise.all([
    admin
      .from('student_entitlements')
      .select('master_course_id, status, valid_from, valid_until')
      .eq('student_id', context.studentId)
      .eq('status', 'active'),
    admin
      .from('student_content_entitlements')
      .select('assigned_entity_type, assigned_entity_id, status, valid_from, valid_until')
      .eq('student_id', context.studentId)
      .eq('status', 'active')
      .in('assigned_entity_type', ['master_course', 'variant', 'bundle']),
    collegeAssignmentsPromise,
    getBootcampPillarCourseIdSet(),
    isStudentEnrolledInJobReadyBootcamp(context.studentId, context.collegeId),
    isJobReadyBootcampFeatureEnabled(),
  ]);

  if (courseEntitlementsResult.error) {
    console.warn('[dashboard-analytics] student_entitlements query failed', {
      message: courseEntitlementsResult.error.message,
    });
  }
  if (contentEntitlementsResult.error) {
    console.warn('[dashboard-analytics] student_content_entitlements query failed', {
      message: contentEntitlementsResult.error.message,
    });
  }

  const standaloneCourseIds = new Set<string>();
  const activeBundleIds = new Set<string>();
  const variantIds: string[] = [];

  for (const row of courseEntitlementsResult.data ?? []) {
    if (
      !isEntitlementActive({
        status: row.status,
        valid_from: row.valid_from,
        valid_until: row.valid_until,
      })
    ) {
      continue;
    }
    if (row.master_course_id) standaloneCourseIds.add(normUuid(row.master_course_id));
  }

  for (const row of contentEntitlementsResult.data ?? []) {
    if (
      !isEntitlementActive({
        status: row.status as string | null,
        valid_from: (row as { valid_from?: string | null }).valid_from,
        valid_until: (row as { valid_until?: string | null }).valid_until,
      })
    ) {
      continue;
    }
    const entityId = row.assigned_entity_id as string | null;
    if (!entityId) continue;
    if (row.assigned_entity_type === 'master_course') {
      standaloneCourseIds.add(normUuid(entityId));
    } else if (row.assigned_entity_type === 'variant') {
      variantIds.push(entityId);
    } else if (row.assigned_entity_type === 'bundle') {
      activeBundleIds.add(entityId);
    }
  }

  if (variantIds.length > 0) {
    const { data: variants } = await admin
      .from('course_variants')
      .select('id, master_course_id')
      .in('id', variantIds);
    for (const v of variants ?? []) {
      if (v.master_course_id) standaloneCourseIds.add(normUuid(v.master_course_id as string));
    }
  }

  for (const row of collegeAssignmentsResult.data ?? []) {
    if (
      !isAssignmentActive({
        status: row.status as string | null,
        start_date: row.start_date as string | null,
        end_date: row.end_date as string | null,
      })
    ) {
      continue;
    }
    const courseId = row.assigned_entity_id as string | null;
    if (courseId) standaloneCourseIds.add(normUuid(courseId));
  }

  // Drop unpublished / deleted courses and bootcamp pillar components.
  const pillarIdSet = bootcampPillarIds;
  const candidateIds = Array.from(standaloneCourseIds).filter((id) => !pillarIdSet.has(id));
  let publishedStandaloneCount = 0;
  if (candidateIds.length > 0) {
    const { data: publishedCourses } = await admin
      .from('master_courses')
      .select('id')
      .in('id', candidateIds)
      .eq('publish_status', 'published');
    publishedStandaloneCount = (publishedCourses ?? []).length;
  }

  let bundleProductCount = 0;
  if (activeBundleIds.size > 0) {
    const { data: bundles } = await admin
      .from('course_bundles')
      .select('id')
      .in('id', Array.from(activeBundleIds))
      .eq('publish_status', 'published')
      .eq('lifecycle_status', 'active');
    bundleProductCount = (bundles ?? []).length;
  }

  const bootcampCount = isBootcampEnrolled && bootcampFeatureEnabled ? 1 : 0;

  return publishedStandaloneCount + bootcampCount + bundleProductCount;
}

async function loadVideoProgressRows(
  supabase: DashboardSupabaseClient,
  studentId: string,
): Promise<VideoProgressCompletionRow[]> {
  const { data } = await supabase
    .from('student_video_progress')
    .select('lesson_id, completed, completion_percentage')
    .eq('student_id', studentId);
  return (data ?? []) as VideoProgressCompletionRow[];
}

async function loadLifetimeVideoProgressRows(
  supabase: DashboardSupabaseClient,
  studentId: string,
) {
  const { data } = await supabase
    .from('student_video_progress')
    .select('total_video_seconds_watched')
    .eq('student_id', studentId);
  return (data ?? []) as { total_video_seconds_watched: number | null }[];
}

async function loadStudentProgressRows(
  supabase: DashboardSupabaseClient,
  studentId: string,
) {
  const { data } = await supabase
    .from('student_progress')
    .select('item_id, completed')
    .eq('student_id', studentId);
  return (data ?? []) as StudentProgressRow[];
}

async function loadWeeklySegmentRows(
  supabase: DashboardSupabaseClient,
  studentId: string,
  weekStartUtc: Date,
  nextWeekStartUtc: Date,
): Promise<SegmentRow[]> {
  const lookbackUtc = new Date(weekStartUtc.getTime() - 24 * 60 * 60 * 1000);
  const { data } = await supabase
    .from('video_watch_segments')
    .select('lesson_id, start_second, end_second, created_at, segment_started_at, segment_ended_at')
    .eq('student_id', studentId)
    .gte('created_at', lookbackUtc.toISOString())
    .lt('created_at', nextWeekStartUtc.toISOString());

  const rows = (data ?? []) as SegmentRow[];
  return rows.filter((row) => {
    const watchedSeconds = getSegmentWatchedSeconds(row);
    if (!row.lesson_id || watchedSeconds <= 0) return false;
    const startedAt = parseSegmentDate(row.segment_started_at ?? row.created_at);
    const endedAt = parseSegmentDate(row.segment_ended_at ?? row.created_at);
    if (!startedAt || !endedAt) return false;
    return endedAt >= weekStartUtc && startedAt < nextWeekStartUtc;
  });
}

async function loadVisitDates(supabase: DashboardSupabaseClient, studentId: string) {
  const { data } = await supabase
    .from('student_daily_visits')
    .select('visit_date')
    .eq('student_id', studentId);
  return (data ?? []) as { visit_date: string }[];
}

async function loadStreakRow(
  supabase: DashboardSupabaseClient,
  studentId: string,
): Promise<StudentStreakRow | null> {
  const { data } = await supabase
    .from('student_streaks')
    .select('current_streak, longest_streak, last_visit_date')
    .eq('student_id', studentId)
    .maybeSingle();
  return (data as StudentStreakRow | null) ?? null;
}

function createWeekBuckets(weekStartLocalDate: string): Map<string, DayBucket> {
  const buckets = new Map<string, DayBucket>();
  for (let i = 0; i < 7; i++) {
    const localDate = addLocalDays(weekStartLocalDate, i);
    buckets.set(localDate, {
      localDate,
      weekday: WEEKDAYS[i],
      watchedSeconds: 0,
      lessonIds: new Set<string>(),
    });
  }
  return buckets;
}

function allocateSegmentsToBuckets(
  rows: SegmentRow[],
  buckets: Map<string, DayBucket>,
  timeZone: string,
): void {
  for (const row of rows) {
    const lessonId = row.lesson_id;
    if (!lessonId) continue;
    const watchedSeconds = getSegmentWatchedSeconds(row);
    if (watchedSeconds <= 0) continue;

    const startedAt = parseSegmentDate(row.segment_started_at ?? null);
    const endedAt = parseSegmentDate(row.segment_ended_at ?? null);
    if (!startedAt || !endedAt || endedAt <= startedAt) {
      const fallbackDate = row.created_at ? toApplicationLocalDate(new Date(row.created_at), timeZone) : null;
      const fallbackBucket = fallbackDate ? buckets.get(fallbackDate) : undefined;
      if (fallbackBucket) {
        fallbackBucket.watchedSeconds += watchedSeconds;
        fallbackBucket.lessonIds.add(lessonId);
      }
      continue;
    }

    const totalWallMs = endedAt.getTime() - startedAt.getTime();
    const startLocalDate = toApplicationLocalDate(startedAt, timeZone);
    const endLocalDate = toApplicationLocalDate(endedAt, timeZone);
    let cursor = startLocalDate;

    while (cursor <= endLocalDate) {
      const bucket = buckets.get(cursor);
      const nextLocalDate = addLocalDays(cursor, 1);
      const localStartUtc = localDateTimeToUtc(cursor, timeZone);
      const localEndUtc = localDateTimeToUtc(nextLocalDate, timeZone);
      const overlapStart = Math.max(startedAt.getTime(), localStartUtc.getTime());
      const overlapEnd = Math.min(endedAt.getTime(), localEndUtc.getTime());

      if (bucket && overlapEnd > overlapStart) {
        const allocatedSeconds = watchedSeconds * ((overlapEnd - overlapStart) / totalWallMs);
        if (allocatedSeconds > 0) {
          bucket.watchedSeconds += allocatedSeconds;
          bucket.lessonIds.add(lessonId);
        }
      }

      cursor = nextLocalDate;
    }
  }
}

function getSegmentWatchedSeconds(row: SegmentRow): number {
  const start = Number(row.start_second ?? 0);
  const end = Number(row.end_second ?? 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return end - start;
}

function parseSegmentDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveStreak(
  streakRow: StudentStreakRow | null,
  todayLocalDate: string,
  activeDates: string[],
) {
  if (!streakRow) return calculateStreaks(activeDates, todayLocalDate);

  const yesterday = addLocalDays(todayLocalDate, -1);
  const lastVisitDate = streakRow.last_visit_date;
  const storedCurrent = Math.max(0, Number(streakRow.current_streak ?? 0));
  const currentStreak = lastVisitDate === todayLocalDate || lastVisitDate === yesterday ? storedCurrent : 0;
  const bestStreak = Math.max(Math.max(0, Number(streakRow.longest_streak ?? 0)), currentStreak);
  return { currentStreak, bestStreak };
}

function calculateStreaks(activeDates: string[], todayLocalDate: string) {
  const uniqueDates = [...new Set(activeDates)].sort();
  const activeSet = new Set(uniqueDates);
  let bestStreak = 0;
  let run = 0;
  let previous: string | null = null;

  for (const date of uniqueDates) {
    if (previous && addLocalDays(previous, 1) === date) {
      run += 1;
    } else {
      run = 1;
    }
    bestStreak = Math.max(bestStreak, run);
    previous = date;
  }

  let currentStreak = 0;
  let cursor = activeSet.has(todayLocalDate) ? todayLocalDate : addLocalDays(todayLocalDate, -1);
  while (activeSet.has(cursor)) {
    currentStreak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return { currentStreak, bestStreak };
}

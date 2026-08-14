import 'server-only';

import { cache } from 'react';
import type { StudentLearningContext } from '@/lib/services/student-courses';
import { createClient } from '@/lib/supabase/server';
import type { StudentPurchasedBundle } from '@/lib/services/student-purchased-bundles';
import type { MentorshipSessionRow } from '@/lib/services/job-ready-bootcamp';
import type { BookingWithDetails } from '@/lib/services/paid-mentorship';
import { getBookingSessionEndsAt } from '@/lib/services/paid-mentorship';
import type { Todo } from '@/lib/actions/student-todos';
import type { ContinueLearningCard } from '@/app/c/[collegeSlug]/student/(authenticated)/home/_components/landing-data-types';
import { formatDecimalHours } from '@/lib/format/learning-time';
import {
  getStudentDashboardAnalytics,
  type DashboardDailyActivity,
} from '@/lib/services/student-dashboard-analytics';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { buildBundleHref, buildBundleLearnHref } from '@/lib/utils/bundle-routes';

const VIDEO_COMPLETION_PERCENTAGE_THRESHOLD = 66;

// ─── View-model types ────────────────────────────────────────────────────────

export interface DashboardSummaryMetric {
  label: string;
  value: string;
  unit: string;
}

export interface DashboardCourseRow {
  id: string;
  title: string;
  pillarTitle: string;
  progressPercentage: number;
  moduleCount: number;
  videoCount: number;
  learnHref: string;
  sourceLabel?: string | null;
  daysUntilExpiry?: number | null;
}

export type TodoList = Todo[];

export interface DashboardTodoData {
  daily: TodoList;
  weekly: TodoList;
  monthly: TodoList;
}

export interface DashboardStreakData {
  currentStreak: number;
  longestStreak: number;
  visitDates: string[];
  activeDaysThisMonth: number;
  todayLocalDate: string;
}

export interface DashboardWeeklyAnalyticsData {
  weeklyWatchedSeconds: number;
  weeklyDistinctLessons: number;
  dailyActivity: DashboardDailyActivity[];
}

export interface DashboardBundleMentorshipData {
  purchasedBundles: StudentPurchasedBundle[];
  upcomingMentorshipSessions: MentorshipSessionRow[];
  upcomingPaidBookings: BookingWithDetails[];
}

export interface DashboardAnalyticsPresentationData {
  metrics: DashboardSummaryMetric[];
  streak: DashboardStreakData;
  weekly: DashboardWeeklyAnalyticsData;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatWatchTime(totalWatchSeconds: number): {
  value: string;
  unit: string;
} {
  if (totalWatchSeconds === 0) {
    return { value: '0', unit: 'm' };
  }
  if (totalWatchSeconds < 60) {
    return { value: '<1', unit: 'm' };
  }
  if (totalWatchSeconds < 3600) {
    return { value: `${Math.round(totalWatchSeconds / 60)}`, unit: 'min' };
  }
  return { value: formatDecimalHours(totalWatchSeconds, 1), unit: 'hrs' };
}

// ─── Adapters ────────────────────────────────────────────────────────────────

const _listStudentTodosRaw = cache(async function _listStudentTodosRaw(studentId: string): Promise<TodoList> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('student_todos')
    .select('id, text, completed, sort_order, created_at, category')
    .eq('student_id', studentId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  return (data ?? []) as TodoList;
});

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Summary metrics (hours watched, courses enrolled, lessons completed, day streak).
 * Combines analytics overview + streak in parallel.
 */
export const getDashboardSummaryMetrics = cache(async function getDashboardSummaryMetrics(
  context: StudentLearningContext,
): Promise<DashboardSummaryMetric[]> {
  const analytics = await getStudentDashboardAnalytics(context);

  const metrics: DashboardSummaryMetric[] = [];
  const watch = formatWatchTime(analytics.lifetimeWatchedSeconds);
  metrics.push({ label: 'Hours watched', value: watch.value, unit: watch.unit });
  metrics.push({
    label: 'Courses enrolled',
    value: `${analytics.enrolledCourses}`,
    unit: '',
  });
  metrics.push({
    label: 'Lessons completed',
    value: `${analytics.completedLessons}`,
    unit: '',
  });
  metrics.push({
    label: 'Day streak',
    value: `${analytics.currentStreak}`,
    unit: 'days',
  });

  return metrics;
});

/**
 * Streak data: current/longest streak + visit dates for the calendar.
 */
export const getDashboardStreakData = cache(async function getDashboardStreakData(
  context: StudentLearningContext,
): Promise<DashboardStreakData> {
  const analytics = await getStudentDashboardAnalytics(context);

  return {
    currentStreak: analytics.currentStreak,
    longestStreak: analytics.bestStreak,
    visitDates: analytics.activeDates,
    activeDaysThisMonth: analytics.activeDaysThisMonth,
    todayLocalDate: analytics.todayLocalDate,
  };
});

/**
 * Weekly analytics: per-day watched hours for the bar chart.
 */
export const getDashboardWeeklyAnalytics = cache(async function getDashboardWeeklyAnalytics(
  context: StudentLearningContext,
): Promise<DashboardWeeklyAnalyticsData> {
  return getStudentDashboardAnalytics(context)
    .then((analytics) => ({
      weeklyWatchedSeconds: analytics.weeklyWatchedSeconds,
      weeklyDistinctLessons: analytics.weeklyDistinctLessons,
      dailyActivity: analytics.dailyActivity,
    }))
    .catch(() => ({
      weeklyWatchedSeconds: 0,
      weeklyDistinctLessons: 0,
      dailyActivity: [],
    }));
});

export const getDashboardAnalyticsPresentation = cache(async function getDashboardAnalyticsPresentation(
  context: StudentLearningContext,
): Promise<DashboardAnalyticsPresentationData> {
  const analytics = await getStudentDashboardAnalytics(context);
  const watch = formatWatchTime(analytics.lifetimeWatchedSeconds);

  return {
    metrics: [
      { label: 'Hours watched', value: watch.value, unit: watch.unit },
      { label: 'Courses enrolled', value: `${analytics.enrolledCourses}`, unit: '' },
      { label: 'Lessons completed', value: `${analytics.completedLessons}`, unit: '' },
      { label: 'Day streak', value: `${analytics.currentStreak}`, unit: 'days' },
    ],
    streak: {
      currentStreak: analytics.currentStreak,
      longestStreak: analytics.bestStreak,
      visitDates: analytics.activeDates,
      activeDaysThisMonth: analytics.activeDaysThisMonth,
      todayLocalDate: analytics.todayLocalDate,
    },
    weekly: {
      weeklyWatchedSeconds: analytics.weeklyWatchedSeconds,
      weeklyDistinctLessons: analytics.weeklyDistinctLessons,
      dailyActivity: analytics.dailyActivity,
    },
  };
});

/**
 * Continue-learning card: the "resume where you left off" hero card.
 */
export const getDashboardContinueLearning = cache(async function getDashboardContinueLearning(
  collegeSlug: string,
  context: StudentLearningContext,
): Promise<ContinueLearningCard | null> {
  return loadDashboardContinueLearning(collegeSlug, context);
});

/**
 * Courses section: accessible items + expiring courses map.
 */
export const getDashboardCoursesData = cache(async function getDashboardCoursesData(
  collegeSlug: string,
  context: StudentLearningContext,
): Promise<{ courses: DashboardCourseRow[] }> {
  return loadDashboardCourses(collegeSlug, context);
});

/**
 * Todo list grouped by category.
 * Replaces the inline Supabase query that previously leaked into page.tsx.
 */
export const getDashboardTodos = cache(async function getDashboardTodos(
  studentId: string,
): Promise<DashboardTodoData> {
  const rawTodos = await _listStudentTodosRaw(studentId);

  const todosByCategory: DashboardTodoData = { daily: [], weekly: [], monthly: [] };
  for (const todo of rawTodos) {
    const cat = todo.category as string;
    if (cat === 'daily') todosByCategory.daily.push(todo);
    else if (cat === 'weekly') todosByCategory.weekly.push(todo);
    else if (cat === 'monthly') todosByCategory.monthly.push(todo);
  }
  return todosByCategory;
});

/**
 * Purchased bundles + mentorship sessions + paid bookings.
 */
export const getDashboardBundlesAndMentorshipData = cache(async function getDashboardBundlesAndMentorshipData(
  collegeSlug: string,
  studentId: string,
  userId: string,
  collegeId: string | null,
): Promise<DashboardBundleMentorshipData> {
  const context = { studentId, userId, collegeId };
  const [purchasedBundles, upcomingMentorshipSessions, paidMentorshipModule] = await Promise.all([
    loadDashboardPurchasedBundles(collegeSlug, context),
    loadDashboardMentorshipSessions(studentId, 5),
    loadDashboardPaidMentorshipBookings(userId, studentId),
  ]);

  return {
    purchasedBundles,
    upcomingMentorshipSessions,
    upcomingPaidBookings: paidMentorshipModule,
  };
});

async function loadDashboardCourses(
  collegeSlug: string,
  context: StudentLearningContext,
): Promise<{ courses: DashboardCourseRow[] }> {
  const supabase = await createClient();
  let entitlementQuery = supabase
    .from('student_entitlements')
    .select('master_course_id, source_type, college_id, valid_until')
    .eq('student_id', context.studentId)
    .eq('status', 'active');

  if (context.collegeId) {
    entitlementQuery = entitlementQuery.or(`college_id.is.null,college_id.eq.${context.collegeId}`);
  }

  const { data: entitlementRows } = await entitlementQuery;
  const courseIds = [...new Set((entitlementRows ?? []).flatMap((row) => row.master_course_id ? [row.master_course_id as string] : []))];
  if (courseIds.length === 0) return { courses: [] };

  const [coursesResult, itemsResult] = await Promise.all([
    supabase
      .from('master_courses')
      .select('id, title, slug, pillar_id')
      .in('id', courseIds)
      .eq('publish_status', 'published'),
    supabase
      .from('master_course_items')
      .select('id, master_course_id, module_id, item_type')
      .in('master_course_id', courseIds)
      .eq('publish_status', 'published'),
  ]);

  const itemsByCourse = new Map<string, { total: number; videos: number; modules: Set<string> }>();
  const itemToCourse = new Map<string, string>();
  for (const item of itemsResult.data ?? []) {
    const courseId = item.master_course_id as string | null;
    const itemId = item.id as string | null;
    if (!courseId || !itemId) continue;
    itemToCourse.set(itemId, courseId);
    const entry = itemsByCourse.get(courseId) ?? { total: 0, videos: 0, modules: new Set<string>() };
    entry.total += 1;
    if (item.item_type === 'video') entry.videos += 1;
    if (item.module_id) entry.modules.add(item.module_id as string);
    itemsByCourse.set(courseId, entry);
  }

  const videoItemIds: string[] = [];
  const otherItemIds: string[] = [];
  for (const item of itemsResult.data ?? []) {
    const itemId = item.id as string | null;
    if (!itemId) continue;
    if (item.item_type === 'video') {
      videoItemIds.push(itemId);
    } else {
      otherItemIds.push(itemId);
    }
  }

  const completedItemIds = new Set<string>();
  await Promise.all([
    videoItemIds.length > 0
      ? supabase
          .from('student_video_progress')
          .select('lesson_id, completed, completion_percentage')
          .eq('student_id', context.studentId)
          .in('lesson_id', videoItemIds)
          .then(({ data }) => {
            for (const row of data ?? []) {
              if (
                row.lesson_id &&
                ((row.completed ?? false) || Number(row.completion_percentage ?? 0) >= VIDEO_COMPLETION_PERCENTAGE_THRESHOLD)
              ) {
                completedItemIds.add(row.lesson_id as string);
              }
            }
          })
      : Promise.resolve(),
    otherItemIds.length > 0
      ? supabase
          .from('student_progress')
          .select('item_id')
          .eq('student_id', context.studentId)
          .eq('completed', true)
          .in('item_id', otherItemIds)
          .then(({ data }) => {
            for (const row of data ?? []) {
              if (row.item_id) completedItemIds.add(row.item_id as string);
            }
          })
      : Promise.resolve(),
  ]);

  const completedByCourse = new Map<string, number>();
  for (const itemId of completedItemIds) {
    const courseId = itemToCourse.get(itemId);
    if (courseId) {
      completedByCourse.set(courseId, (completedByCourse.get(courseId) ?? 0) + 1);
    }
  }

  const sourceByCourse = new Map<string, string | null>();
  const expiryByCourse = new Map<string, number | null>();
  const now = Date.now();
  for (const row of entitlementRows ?? []) {
    if (!row.master_course_id) continue;
    const courseId = row.master_course_id as string;
    sourceByCourse.set(courseId, sourceLabelForEntitlement(row.source_type as string | null));
    if (row.valid_until) {
      const ms = new Date(row.valid_until as string).getTime() - now;
      expiryByCourse.set(courseId, Number.isFinite(ms) ? Math.ceil(ms / 86_400_000) : null);
    }
  }

  const courses: DashboardCourseRow[] = (coursesResult.data ?? []).map((course) => {
    const courseId = course.id as string;
    const counts = itemsByCourse.get(courseId) ?? { total: 0, videos: 0, modules: new Set<string>() };
    const completed = completedByCourse.get(courseId) ?? 0;
    return {
      id: courseId,
      title: (course.title as string | null) ?? 'Course',
      pillarTitle: 'Course',
      progressPercentage: counts.total > 0 ? Math.round((completed / counts.total) * 100) : 0,
      moduleCount: counts.modules.size,
      videoCount: counts.videos,
      learnHref: buildLearnHref(collegeSlug, (course.slug as string | null) || courseId),
      sourceLabel: sourceByCourse.get(courseId) ?? null,
      daysUntilExpiry: expiryByCourse.get(courseId) ?? null,
    };
  });

  return { courses };
}

async function loadDashboardContinueLearning(
  collegeSlug: string,
  context: StudentLearningContext,
): Promise<ContinueLearningCard | null> {
  const supabase = await createClient();
  const { data: progressRows } = await supabase
    .from('student_progress')
    .select('item_id, watched_seconds, total_seconds, updated_at')
    .eq('student_id', context.studentId)
    .gt('watched_seconds', 0)
    .order('updated_at', { ascending: false })
    .limit(10);

  const target = progressRows?.find((row) => row.item_id) ?? null;
  if (!target?.item_id) return null;

  const { data: item } = await supabase
    .from('master_course_items')
    .select('id, title, slug, master_course_id')
    .eq('id', target.item_id as string)
    .maybeSingle();
  if (!item?.master_course_id) return null;

  const { data: course } = await supabase
    .from('master_courses')
    .select('id, title, slug')
    .eq('id', item.master_course_id as string)
    .maybeSingle();

  const totalSeconds = Math.max(0, Number(target.total_seconds ?? 0));
  const watchedSeconds = Math.max(0, Number(target.watched_seconds ?? 0));
  return {
    courseTitle: (course?.title as string | null) ?? 'Your course',
    lessonTitle: (item.title as string | null) ?? 'Continue your lesson',
    progressPercentage: totalSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100)) : null,
    resumeHref: buildLearnHref(collegeSlug, (course?.slug as string | null) || (item.master_course_id as string), {
      itemSlug: item.slug as string | null,
      itemId: item.id as string,
    }),
    lastWatchedAt: (target.updated_at as string | null) ?? null,
  };
}

async function loadDashboardPurchasedBundles(
  collegeSlug: string,
  context: { studentId: string; userId: string; collegeId: string | null },
): Promise<StudentPurchasedBundle[]> {
  const supabase = await createClient();
  const { data: entitlementRows } = await supabase
    .from('student_content_entitlements')
    .select('id, assigned_entity_id, source_type, valid_until, created_at, metadata')
    .eq('student_id', context.studentId)
    .eq('assigned_entity_type', 'bundle')
    .eq('status', 'active');

  const bundleIds = [...new Set((entitlementRows ?? []).flatMap((row) => row.assigned_entity_id ? [row.assigned_entity_id as string] : []))];
  if (bundleIds.length === 0) return [];

  const { data: bundleRows } = await supabase
    .from('course_bundles')
    .select('id, title, slug, description, publish_status, lifecycle_status, landing_card_title, landing_card_description, landing_badge_label')
    .in('id', bundleIds)
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active');

  const entitlementByBundle = new Map((entitlementRows ?? []).map((row) => [row.assigned_entity_id as string, row]));
  return (bundleRows ?? []).map((bundle) => {
    const entitlement = entitlementByBundle.get(bundle.id as string);
    const title = (bundle.title as string | null) ?? 'Bundle';
    return {
      id: bundle.id as string,
      entitlementId: (entitlement?.id as string | null) ?? null,
      slug: bundle.slug as string,
      title,
      cardTitle: (bundle.landing_card_title as string | null)?.trim() || title,
      description: (bundle.landing_card_description as string | null)?.trim() || (bundle.description as string | null) || 'Your guided learning bundle path.',
      badgeLabel: (bundle.landing_badge_label as string | null)?.trim() || 'Bundle',
      accessLabel: 'Premium',
      sourceLabel: 'Purchased Bundle',
      sourceType: (entitlement?.source_type as string | null) ?? 'bundle',
      validUntil: (entitlement?.valid_until as string | null) ?? null,
      enrolledAt: (entitlement?.created_at as string | null) ?? new Date().toISOString(),
      courseCount: 0,
      progressPercentage: 0,
      continueHref: buildBundleLearnHref(collegeSlug, bundle.slug as string),
      detailHref: buildBundleHref(collegeSlug, bundle.slug as string),
      connectedCourses: [],
    } satisfies StudentPurchasedBundle;
  });
}

async function loadDashboardMentorshipSessions(studentId: string, limit: number): Promise<MentorshipSessionRow[]> {
  const { listUpcomingMentorshipSessionsForStudent } = await import('@/lib/services/job-ready-bootcamp');
  return listUpcomingMentorshipSessionsForStudent(studentId, limit);
}

async function loadDashboardPaidMentorshipBookings(userId: string, studentId: string): Promise<BookingWithDetails[]> {
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from('paid_mentorship_bookings')
    .select('id, user_id, student_id, college_id, category_id, session_date, start_time_ist, end_time_ist, achievement_goal, skill_level, additional_notes, whatsapp_number, custom_answers, meeting_url, status, reschedule_count, rescheduled_from, coupon_code, discount_amount_minor, original_price_minor, selling_price_minor, final_amount_minor, currency, order_id, expires_at, completed_at, cancelled_at, created_at, updated_at')
    .eq('user_id', userId)
    .eq('student_id', studentId)
    .in('status', ['confirmed', 'rescheduled'])
    .order('session_date', { ascending: true })
    .order('start_time_ist', { ascending: true });

  const nowMs = Date.now();
  const rows = ((bookings ?? []) as BookingWithDetails[]).filter(
    (booking) => getBookingSessionEndsAt(booking.session_date, booking.end_time_ist).getTime() > nowMs,
  );
  const categoryIds = [...new Set(rows.flatMap((booking) => booking.category_id ? [booking.category_id] : []))];
  if (categoryIds.length === 0) return rows;

  const { data: categories } = await supabase
    .from('paid_mentorship_categories')
    .select('id, title, description, custom_questions, is_active, sort_order')
    .in('id', categoryIds);

  const categoryMap = new Map((categories ?? []).map((category) => [category.id as string, category]));
  return rows.map((booking) => ({
    ...booking,
    category: categoryMap.get(booking.category_id) as BookingWithDetails['category'],
  }));
}

function sourceLabelForEntitlement(sourceType: string | null): string | null {
  if (sourceType === 'b2c_direct') return 'Purchased Course';
  if (sourceType === 'b2b_college' || sourceType === 'college_assignment') return 'College Assigned';
  if (sourceType === 'free_course') return 'Free Enrollment';
  return sourceType ? 'Course Access' : null;
}

// ─── Backward-compat alias (deprecated — use named exports above) ───────────

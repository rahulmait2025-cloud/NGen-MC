import 'server-only';

import { cache } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { isAssignmentActive } from '@/lib/services/access-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  StudentVideoProgressRow,
  VideoWatchSessionsRow,
  VCourseWatchSummaryRow,
} from '@/types/database';

const VIDEO_ANALYTICS_SCHEMA_HINT =
  'Video analytics is unavailable: the student_video_progress table is missing in Supabase. Student watch data is stored in student_video_progress and video_watch_sessions when students use the LMS.';

export class VideoAnalyticsSchemaNotReadyError extends Error {
  constructor(message = VIDEO_ANALYTICS_SCHEMA_HINT) {
    super(message);
    this.name = 'VideoAnalyticsSchemaNotReadyError';
  }
}

let videoAnalyticsSchemaReady: boolean | null = null;

function isMissingRelationError(message: string): boolean {
  return (
    message.includes('Could not find the table') ||
    message.includes('does not exist') ||
    message.includes('PGRST205')
  );
}

/** Returns false when student_video_progress (LMS watch storage) is not in this Supabase project. */
export async function isCollegeVideoAnalyticsSchemaReady(): Promise<boolean> {
  if (videoAnalyticsSchemaReady === true) {
    return true;
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('student_video_progress').select('student_id').limit(1);
    if (error && isMissingRelationError(error.message)) {
      return false;
    }
    videoAnalyticsSchemaReady = true;
    return true;
  } catch {
    return false;
  }
}

async function assertCollegeVideoAnalyticsSchema(): Promise<void> {
  const ready = await isCollegeVideoAnalyticsSchemaReady();
  if (!ready) {
    throw new VideoAnalyticsSchemaNotReadyError();
  }
}

/** Lecture counts as watched only at >= 90% completion or explicit completed flag. */
const WATCHED_LECTURE_MIN_COMPLETION_PCT = 90;

/** Student is active if last_watched_at is within this many days. */
const ACTIVE_STUDENT_DAYS = 7;

export type CollegeVideoAnalyticsSortBy =
  | 'watch_time'
  | 'lectures_watched'
  | 'completed_lectures'
  | 'completion_pct'
  | 'last_active';

export type CollegeVideoAnalyticsSortDir = 'asc' | 'desc';

export type CollegeVideoAnalyticsStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'completed_lecture';

export interface CollegeVideoAnalyticsFilters {
  courseId?: string | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
  sortBy?: CollegeVideoAnalyticsSortBy;
  sortDir?: CollegeVideoAnalyticsSortDir;
  status?: CollegeVideoAnalyticsStatusFilter;
}

export interface CollegeVideoAnalyticsCourseOption {
  id: string;
  title: string;
}

export interface CollegeVideoAnalyticsOverview {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalWatchSeconds: number;
  totalWatchHours: number;
  totalLecturesWatched: number;
  totalCompletedLectures: number;
  averageCompletionPercentage: number;
}

export interface CollegeStudentVideoStat {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  totalWatchSeconds: number;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  coursesStarted: number;
  coursesCompleted: number;
  lastWatchedAt: string | null;
}

export interface CollegeStudentLeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  totalWatchSeconds: number;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  lastWatchedAt: string | null;
}

export interface CollegeModuleVideoItem {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  videoDurationSeconds: number;
  uniqueWatchedSeconds: number;
  totalVideoSecondsWatched: number;
  repeatWatchedSeconds: number;
  completionPercentage: number;
  completed: boolean;
  lastWatchedAt: string | null;
}

export interface CollegeStudentCourseVideoProgress {
  courseId: string;
  courseTitle: string;
  totalWatchSeconds: number;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
}

export interface CollegeStudentVideoDetailBundle {
  summary: CollegeStudentVideoStat;
  courses: CollegeStudentCourseVideoProgress[];
  selectedCourseId: string | null;
  modules: CollegeModuleWiseStudentAnalytics[];
}

export interface CollegeDailyWatchActivityRow {
  date: string;
  dayLabel: string;
  watchedHours: number;
  lecturesWatched: number;
}

export interface CollegeWeeklyWatchActivityRow {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  watchedHours: number;
  lecturesWatched: number;
}

export type CollegeStudentLearningStatusKey =
  | 'not_started'
  | 'started'
  | 'active'
  | 'completed_lecture';

export interface CollegeStudentLearningStatusSlice {
  status: CollegeStudentLearningStatusKey;
  label: string;
  count: number;
}

export interface CollegeVideoAnalyticsChartData {
  weekStart: string;
  month: string;
  dailyWeek: CollegeDailyWatchActivityRow[];
  weeklyMonth: CollegeWeeklyWatchActivityRow[];
  learningStatus: CollegeStudentLearningStatusSlice[];
}

export interface CollegeModuleWiseStudentAnalytics {
  moduleId: string;
  moduleTitle: string;
  totalVideos: number;
  watchedVideos: number;
  completedVideos: number;
  totalWatchSeconds: number;
  videos: CollegeModuleVideoItem[];
}

interface CollegeStudentRecord {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

type ProgressSlice = Pick<
  StudentVideoProgressRow,
  | 'student_id'
  | 'course_id'
  | 'module_id'
  | 'lesson_id'
  | 'unique_watched_seconds'
  | 'total_video_seconds_watched'
  | 'completion_percentage'
  | 'completed'
  | 'last_watched_at'
>;

type DetailProgressSlice = Pick<
  StudentVideoProgressRow,
  | 'student_id'
  | 'course_id'
  | 'module_id'
  | 'lesson_id'
  | 'unique_watched_seconds'
  | 'total_video_seconds_watched'
  | 'repeat_watched_seconds'
  | 'video_duration_seconds'
  | 'completion_percentage'
  | 'completed'
  | 'last_watched_at'
>;

type SessionSlice = Pick<
  VideoWatchSessionsRow,
  | 'student_id'
  | 'course_id'
  | 'module_id'
  | 'lesson_id'
  | 'unique_watched_seconds'
  | 'completion_percentage'
  | 'completed'
  | 'started_at'
>;

function roundHours(seconds: number): number {
  return Number((seconds / 3600).toFixed(2));
}

function isLectureWatched(row: { completed: boolean; completion_percentage: number }): boolean {
  return row.completed === true || Number(row.completion_percentage) >= WATCHED_LECTURE_MIN_COMPLETION_PCT;
}

function isLectureCompleted(row: { completed: boolean }): boolean {
  return row.completed === true;
}

function parseDateRange(filters?: CollegeVideoAnalyticsFilters): { from: Date | null; to: Date | null } {
  const from = filters?.from ? new Date(filters.from) : null;
  const to = filters?.to ? new Date(filters.to) : null;
  if (from && !Number.isNaN(from.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(filters!.from!.slice(0, 10))) {
    from.setUTCHours(0, 0, 0, 0);
  }
  if (to && !Number.isNaN(to.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(filters!.to!.slice(0, 10))) {
    to.setUTCHours(23, 59, 59, 999);
  }
  return {
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    to: to && !Number.isNaN(to.getTime()) ? to : null,
  };
}

function hasDateRangeFilter(filters?: CollegeVideoAnalyticsFilters): boolean {
  const { from, to } = parseDateRange(filters);
  return from !== null || to !== null;
}

interface LegacyProgressRow {
  student_id: string;
  item_id: string;
  watched_seconds: number;
  total_video_seconds_watched: number;
  total_seconds: number;
  completed: boolean;
  updated_at: string;
}

interface _RawVideoProgressRow {
  student_id: string;
  lesson_id: string;
  unique_watched_seconds: number;
  total_video_seconds_watched: number;
  video_duration_seconds: number;
  completed: boolean;
  last_watched_at: string;
}

interface LegacySessionRow {
  student_id: string;
  item_id: string | null;
  created_at: string;
  watched_duration_seconds: number;
}

interface _RawVideoSessionRow {
  student_id: string;
  lesson_id: string | null;
  created_at: string;
  total_video_seconds_watched: number;
}

interface ItemContext {
  id: string;
  master_course_id: string;
  module_id: string;
  duration_seconds: number | null;
}

function legacyCompletionFields(
  watchedSeconds: number,
  totalSeconds: number,
  completed: boolean,
): { completion_percentage: number; completed: boolean } {
  const pct =
    totalSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100)) : 0;
  const done = completed || pct >= WATCHED_LECTURE_MIN_COMPLETION_PCT;
  return { completion_percentage: pct, completed: done };
}

async function _fetchItemContextMap(itemIds: string[]): Promise<Map<string, ItemContext>> {
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('master_course_items')
    .select('id, master_course_id, module_id, duration_seconds')
    .in('id', uniqueIds);

  if (error) {
    throw new Error(`[college-video-analytics] master_course_items: ${error.message}`);
  }

  return new Map((data ?? []).map((item) => [item.id, item as ItemContext]));
}

async function _fetchPublishedItemIdsForCourse(courseId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('master_course_items')
    .select('id')
    .eq('master_course_id', courseId)
    .eq('publish_status', 'published');

  if (error) {
    throw new Error(`[college-video-analytics] master_course_items course: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id);
}

async function fetchPublishedLessonCountsByCourse(
  courseIds: string[],
): Promise<Map<string, number>> {
  if (courseIds.length === 0) {
    return new Map();
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('master_course_items')
    .select('master_course_id')
    .in('master_course_id', courseIds)
    .eq('publish_status', 'published');

  if (error) {
    throw new Error(`[college-video-analytics] master_course_items counts: ${error.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const cid = row.master_course_id;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return counts;
}

function _mapLegacyProgressToSlices(
  rows: LegacyProgressRow[],
  itemMap: Map<string, ItemContext>,
): ProgressSlice[] {
  const slices: ProgressSlice[] = [];

  for (const row of rows) {
    const item = itemMap.get(row.item_id);
    if (!item) {
      continue;
    }

    const watched = Number(row.watched_seconds) || 0;
    const total = Number(row.total_seconds) || Number(item.duration_seconds) || 0;
    const { completion_percentage, completed } = legacyCompletionFields(
      watched,
      total,
      row.completed,
    );

    slices.push({
      student_id: row.student_id,
      course_id: item.master_course_id,
      module_id: item.module_id,
      lesson_id: item.id,
      unique_watched_seconds: watched,
      total_video_seconds_watched: Number(row.total_video_seconds_watched) || 0,
      completion_percentage,
      completed,
      last_watched_at: row.updated_at,
    });
  }

  return slices;
}

function _mapLegacyProgressToDetailSlices(
  rows: LegacyProgressRow[],
  itemMap: Map<string, ItemContext>,
): DetailProgressSlice[] {
  const slices: DetailProgressSlice[] = [];

  for (const row of rows) {
    const item = itemMap.get(row.item_id);
    if (!item) {
      continue;
    }

    const watched = Number(row.watched_seconds) || 0;
    const total = Number(row.total_seconds) || Number(item.duration_seconds) || 0;
    const { completion_percentage, completed } = legacyCompletionFields(
      watched,
      total,
      row.completed,
    );

    slices.push({
      student_id: row.student_id,
      course_id: item.master_course_id,
      module_id: item.module_id,
      lesson_id: item.id,
      unique_watched_seconds: watched,
      total_video_seconds_watched: Number(row.total_video_seconds_watched) || 0,
      repeat_watched_seconds: Math.max(0, (Number(row.total_video_seconds_watched) || 0) - watched),
      video_duration_seconds: total,
      completion_percentage,
      completed,
      last_watched_at: row.updated_at,
    });
  }

  return slices;
}

function _mapLegacySessionsToSlices(
  rows: LegacySessionRow[],
  itemMap: Map<string, ItemContext>,
  progressLookup: Map<string, { completion_percentage: number; completed: boolean }>,
): SessionSlice[] {
  const slices: SessionSlice[] = [];

  for (const row of rows) {
    if (!row.item_id) {
      continue;
    }
    const item = itemMap.get(row.item_id);
    if (!item) {
      continue;
    }

    const watched = Number(row.watched_duration_seconds) || 0;
    const total = Number(item.duration_seconds) || 0;
    const progressKey = `${row.student_id}:${row.item_id}`;
    const fromProgress = progressLookup.get(progressKey);
    const { completion_percentage, completed } =
      fromProgress ?? legacyCompletionFields(watched, total, false);

    slices.push({
      student_id: row.student_id,
      course_id: item.master_course_id,
      module_id: item.module_id,
      lesson_id: item.id,
      unique_watched_seconds: watched,
      completion_percentage,
      completed,
      started_at: row.created_at,
    });
  }

  return slices;
}

function buildCourseSummariesFromProgress(
  progressRows: ProgressSlice[],
  lessonCountsByCourse: Map<string, number>,
): VCourseWatchSummaryRow[] {
  const byStudentCourse = new Map<
    string,
    { completedLessons: Set<string>; watchedLessons: Set<string> }
  >();

  for (const row of progressRows) {
    const key = `${row.student_id}:${row.course_id}`;
    const entry = byStudentCourse.get(key) ?? {
      completedLessons: new Set<string>(),
      watchedLessons: new Set<string>(),
    };

    if (isLectureWatched(row)) {
      entry.watchedLessons.add(row.lesson_id);
    }
    if (isLectureCompleted(row)) {
      entry.completedLessons.add(row.lesson_id);
    }
    byStudentCourse.set(key, entry);
  }

  const summaries: VCourseWatchSummaryRow[] = [];

  for (const [key, entry] of byStudentCourse) {
    const [studentId, courseId] = key.split(':');
    const totalLessons = lessonCountsByCourse.get(courseId) ?? 0;
    const completedLessons = entry.completedLessons.size;

    let courseStatus: VCourseWatchSummaryRow['course_status'] = 'not_started';
    if (totalLessons > 0 && completedLessons >= totalLessons) {
      courseStatus = 'completed';
    } else if (entry.watchedLessons.size > 0) {
      courseStatus = 'started';
    }

    summaries.push({
      student_id: studentId,
      course_id: courseId,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      course_status: courseStatus,
    });
  }

  return summaries;
}

async function fetchCollegeStudents(collegeId: string): Promise<CollegeStudentRecord[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('students')
    .select('id, user_id')
    .eq('college_id', collegeId);

  if (error) {
    throw new Error(`[college-video-analytics] students: ${error.message}`);
  }

  const userIds = (data ?? []).map((s) => s.user_id).filter(Boolean);
  let profiles: { id: string; full_name: string | null; email: string | null }[] = [];
  if (userIds.length > 0) {
    const { data: profs, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    if (profilesError) {
      throw new Error(`[college-video-analytics] profiles: ${profilesError.message}`);
    }
    profiles = profs ?? [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return (data ?? []).map((s: { id: string; user_id: string }) => {
    const profile = profileMap.get(s.user_id);
    return {
      id: s.id,
      user_id: s.user_id,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    };
  });
}

async function fetchProgressForStudents(
  studentIds: string[],
  filters?: CollegeVideoAnalyticsFilters,
): Promise<ProgressSlice[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();
  let query = supabase
    .from('student_video_progress')
    .select('student_id, course_id, module_id, lesson_id, unique_watched_seconds, total_video_seconds_watched, video_duration_seconds, completed, last_watched_at')
    .in('student_id', studentIds);

  if (filters?.courseId) {
    query = query.eq('course_id', filters.courseId);
  }

  const { from, to } = parseDateRange(filters);
  if (from) {
    query = query.gte('last_watched_at', from.toISOString());
  }
  if (to) {
    query = query.lte('last_watched_at', to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`[college-video-analytics] student_video_progress: ${error.message}`);
  }

  return (data ?? []).map((r) => {
    const uniqueSec = Number(r.unique_watched_seconds) || 0;
    const totalSec = Number(r.video_duration_seconds) || 0;
    const pct = totalSec > 0 ? Math.min(100, Math.round((uniqueSec / totalSec) * 100)) : 0;
    const done = r.completed || pct >= WATCHED_LECTURE_MIN_COMPLETION_PCT;

    return {
      student_id: r.student_id,
      course_id: r.course_id,
      module_id: r.module_id,
      lesson_id: r.lesson_id,
      unique_watched_seconds: uniqueSec,
      total_video_seconds_watched: Number(r.total_video_seconds_watched) || 0,
      completion_percentage: pct,
      completed: done,
      last_watched_at: r.last_watched_at,
    };
  });
}

async function fetchProgressForStudent(
  studentId: string,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<DetailProgressSlice[]> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from('student_video_progress')
    .select('student_id, course_id, module_id, lesson_id, unique_watched_seconds, total_video_seconds_watched, video_duration_seconds, completed, last_watched_at')
    .eq('student_id', studentId);

  if (filters?.courseId) {
    query = query.eq('course_id', filters.courseId);
  }

  const { from, to } = parseDateRange(filters);
  if (from) {
    query = query.gte('last_watched_at', from.toISOString());
  }
  if (to) {
    query = query.lte('last_watched_at', to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`[college-video-analytics] student_video_progress: ${error.message}`);
  }

  return (data ?? []).map((r) => {
    const uniqueSec = Number(r.unique_watched_seconds) || 0;
    const totalSec = Number(r.video_duration_seconds) || 0;
    const pct = totalSec > 0 ? Math.min(100, Math.round((uniqueSec / totalSec) * 100)) : 0;
    const done = r.completed || pct >= WATCHED_LECTURE_MIN_COMPLETION_PCT;

    return {
      student_id: r.student_id,
      course_id: r.course_id,
      module_id: r.module_id,
      lesson_id: r.lesson_id,
      unique_watched_seconds: uniqueSec,
      total_video_seconds_watched: Number(r.total_video_seconds_watched) || 0,
      repeat_watched_seconds: Math.max(0, (Number(r.total_video_seconds_watched) || 0) - uniqueSec),
      video_duration_seconds: totalSec,
      completion_percentage: pct,
      completed: done,
      last_watched_at: r.last_watched_at,
    };
  });
}

async function assertStudentInCollege(
  collegeId: string,
  studentId: string,
): Promise<CollegeStudentRecord | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('students')
    .select('id, user_id')
    .eq('id', studentId)
    .eq('college_id', collegeId)
    .maybeSingle();

  if (error) {
    throw new Error(`[college-video-analytics] student scope: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  let profile: { full_name: string | null; email: string | null } | null = null;
  if (data.user_id) {
    const { data: prof, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', data.user_id)
      .maybeSingle();
    if (profileError) {
      throw new Error(`[college-video-analytics] profile scope: ${profileError.message}`);
    }
    profile = prof;
  }

  return {
    id: data.id,
    user_id: data.user_id,
    full_name: profile?.full_name ?? null,
    email: profile?.email ?? null,
  };
}

async function fetchSessionsForStudents(
  studentIds: string[],
  filters?: CollegeVideoAnalyticsFilters,
): Promise<SessionSlice[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();
  let query = supabase
    .from('video_watch_sessions')
    .select('student_id, course_id, module_id, lesson_id, created_at, total_video_seconds_watched')
    .in('student_id', studentIds);

  if (filters?.courseId) {
    query = query.eq('course_id', filters.courseId);
  }

  const { from, to } = parseDateRange(filters);
  if (from) {
    query = query.gte('created_at', from.toISOString());
  }
  if (to) {
    query = query.lte('created_at', to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`[college-video-analytics] video_watch_sessions: ${error.message}`);
  }

  const progressLookup = new Map<string, { completion_percentage: number; completed: boolean }>();
  const progressRows = await fetchProgressForStudents(studentIds, filters);
  for (const row of progressRows) {
    progressLookup.set(`${row.student_id}:${row.lesson_id}`, {
      completion_percentage: row.completion_percentage,
      completed: row.completed,
    });
  }

  return (data ?? []).map((r) => {
    const watched = Number(r.total_video_seconds_watched) || 0;
    const progressKey = `${r.student_id}:${r.lesson_id}`;
    const fromProgress = progressLookup.get(progressKey);
    const completion_percentage = fromProgress?.completion_percentage ?? 0;
    const completed = fromProgress?.completed ?? false;

    return {
      student_id: r.student_id,
      course_id: r.course_id,
      module_id: r.module_id,
      lesson_id: r.lesson_id,
      unique_watched_seconds: watched,
      completion_percentage,
      completed,
      started_at: r.created_at,
    };
  });
}


async function fetchCourseSummaries(
  studentIds: string[],
  progressRows: ProgressSlice[],
): Promise<VCourseWatchSummaryRow[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const courseIds = [...new Set(progressRows.map((r) => r.course_id))];
  const lessonCountsByCourse = await fetchPublishedLessonCountsByCourse(courseIds);
  return buildCourseSummariesFromProgress(progressRows, lessonCountsByCourse);
}

function aggregateProgressRows(rows: ProgressSlice[]): Map<string, CollegeStudentVideoStat> {
  const byStudent = new Map<string, CollegeStudentVideoStat>();
  const watchedLessonsByStudent = new Map<string, Set<string>>();
  const completedLessonsByStudent = new Map<string, Set<string>>();
  const pctRowsByStudent = new Map<string, ProgressSlice[]>();

  for (const row of rows) {
    let stat = byStudent.get(row.student_id);
    if (!stat) {
      stat = {
        studentId: row.student_id,
        studentName: null,
        studentEmail: null,
        totalWatchSeconds: 0,
        totalWatchHours: 0,
        lecturesWatched: 0,
        completedLectures: 0,
        averageCompletionPercentage: 0,
        coursesStarted: 0,
        coursesCompleted: 0,
        lastWatchedAt: null,
      };
      byStudent.set(row.student_id, stat);
    }

    stat.totalWatchSeconds += Number(row.total_video_seconds_watched) || 0;

    if (isLectureWatched(row)) {
      const set = watchedLessonsByStudent.get(row.student_id) ?? new Set<string>();
      set.add(row.lesson_id);
      watchedLessonsByStudent.set(row.student_id, set);
    }
    if (isLectureCompleted(row)) {
      const set = completedLessonsByStudent.get(row.student_id) ?? new Set<string>();
      set.add(row.lesson_id);
      completedLessonsByStudent.set(row.student_id, set);
    }

    const list = pctRowsByStudent.get(row.student_id) ?? [];
    list.push(row);
    pctRowsByStudent.set(row.student_id, list);

    const watchedAt = row.last_watched_at;
    if (watchedAt && (!stat.lastWatchedAt || watchedAt > stat.lastWatchedAt)) {
      stat.lastWatchedAt = watchedAt;
    }
  }

  for (const [studentId, stat] of byStudent) {
    stat.lecturesWatched = watchedLessonsByStudent.get(studentId)?.size ?? 0;
    stat.completedLectures = completedLessonsByStudent.get(studentId)?.size ?? 0;
    const studentRows = pctRowsByStudent.get(studentId) ?? [];
    if (studentRows.length > 0) {
      const sum = studentRows.reduce((acc, r) => acc + Number(r.completion_percentage) || 0, 0);
      stat.averageCompletionPercentage = Number((sum / studentRows.length).toFixed(1));
    }
    stat.totalWatchHours = roundHours(stat.totalWatchSeconds);
  }

  return byStudent;
}

function aggregateSessionRows(rows: SessionSlice[]): Map<string, CollegeStudentVideoStat> {
  const byStudent = new Map<string, CollegeStudentVideoStat>();
  const watchedLessonsByStudent = new Map<string, Set<string>>();
  const completedLessonsByStudent = new Map<string, Set<string>>();
  const pctRowsByStudent = new Map<string, SessionSlice[]>();

  for (const row of rows) {
    let stat = byStudent.get(row.student_id);
    if (!stat) {
      stat = {
        studentId: row.student_id,
        studentName: null,
        studentEmail: null,
        totalWatchSeconds: 0,
        totalWatchHours: 0,
        lecturesWatched: 0,
        completedLectures: 0,
        averageCompletionPercentage: 0,
        coursesStarted: 0,
        coursesCompleted: 0,
        lastWatchedAt: null,
      };
      byStudent.set(row.student_id, stat);
    }

    stat.totalWatchSeconds += Number(row.unique_watched_seconds) || 0;

    if (isLectureWatched(row)) {
      const set = watchedLessonsByStudent.get(row.student_id) ?? new Set<string>();
      set.add(row.lesson_id);
      watchedLessonsByStudent.set(row.student_id, set);
    }
    if (isLectureCompleted(row)) {
      const set = completedLessonsByStudent.get(row.student_id) ?? new Set<string>();
      set.add(row.lesson_id);
      completedLessonsByStudent.set(row.student_id, set);
    }

    const list = pctRowsByStudent.get(row.student_id) ?? [];
    list.push(row);
    pctRowsByStudent.set(row.student_id, list);

    const startedAt = row.started_at;
    if (startedAt && (!stat.lastWatchedAt || startedAt > stat.lastWatchedAt)) {
      stat.lastWatchedAt = startedAt;
    }
  }

  for (const [studentId, stat] of byStudent) {
    stat.lecturesWatched = watchedLessonsByStudent.get(studentId)?.size ?? 0;
    stat.completedLectures = completedLessonsByStudent.get(studentId)?.size ?? 0;
    const sessionRows = pctRowsByStudent.get(studentId) ?? [];
    if (sessionRows.length > 0) {
      const sum = sessionRows.reduce((acc, r) => acc + Number(r.completion_percentage) || 0, 0);
      stat.averageCompletionPercentage = Number((sum / sessionRows.length).toFixed(1));
    }
    stat.totalWatchHours = roundHours(stat.totalWatchSeconds);
  }

  return byStudent;
}

function applyCourseSummary(
  stats: Map<string, CollegeStudentVideoStat>,
  summaries: VCourseWatchSummaryRow[],
  courseId?: string | null,
): void {
  const byStudent = new Map<string, { started: number; completed: number }>();

  for (const row of summaries) {
    if (courseId && row.course_id !== courseId) {
      continue;
    }
    const entry = byStudent.get(row.student_id) ?? { started: 0, completed: 0 };
    if (row.course_status === 'completed') {
      entry.completed += 1;
      entry.started += 1;
    } else if (row.course_status === 'started') {
      entry.started += 1;
    }
    byStudent.set(row.student_id, entry);
  }

  for (const [studentId, counts] of byStudent) {
    const stat = stats.get(studentId);
    if (stat) {
      stat.coursesStarted = counts.started;
      stat.coursesCompleted = counts.completed;
    }
  }
}

function mergeStudentProfiles(
  stats: Map<string, CollegeStudentVideoStat>,
  roster: CollegeStudentRecord[],
): CollegeStudentVideoStat[] {
  return roster.map((student) => {
    const existing = stats.get(student.id);
    if (existing) {
      return {
        ...existing,
        studentName: student.full_name,
        studentEmail: student.email,
      };
    }
    return {
      studentId: student.id,
      studentName: student.full_name,
      studentEmail: student.email,
      totalWatchSeconds: 0,
      totalWatchHours: 0,
      lecturesWatched: 0,
      completedLectures: 0,
      averageCompletionPercentage: 0,
      coursesStarted: 0,
      coursesCompleted: 0,
      lastWatchedAt: null,
    };
  });
}

function applySearchFilter(
  rows: CollegeStudentVideoStat[],
  filters?: CollegeVideoAnalyticsFilters,
): CollegeStudentVideoStat[] {
  const q = filters?.search?.trim().toLowerCase();
  if (!q) {
    return rows;
  }
  return rows.filter((row) => {
    const name = row.studentName?.toLowerCase() ?? '';
    const email = row.studentEmail?.toLowerCase() ?? '';
    return name.includes(q) || email.includes(q);
  });
}

function applyStatusFilter(
  rows: CollegeStudentVideoStat[],
  filters?: CollegeVideoAnalyticsFilters,
): CollegeStudentVideoStat[] {
  const status = filters?.status ?? 'all';
  if (status === 'all') {
    return rows;
  }
  if (status === 'active') {
    return rows.filter((row) => isStudentActive(row.lastWatchedAt));
  }
  if (status === 'inactive') {
    return rows.filter((row) => !isStudentActive(row.lastWatchedAt));
  }
  if (status === 'completed_lecture') {
    return rows.filter((row) => row.completedLectures >= 1);
  }
  return rows;
}

function compareStudentStats(
  a: CollegeStudentVideoStat,
  b: CollegeStudentVideoStat,
  sortBy: CollegeVideoAnalyticsSortBy = 'watch_time',
  sortDir: CollegeVideoAnalyticsSortDir = 'desc',
): number {
  let cmp = 0;
  if (sortBy === 'lectures_watched') {
    cmp = a.lecturesWatched - b.lecturesWatched;
  } else if (sortBy === 'completed_lectures') {
    cmp = a.completedLectures - b.completedLectures;
  } else if (sortBy === 'completion_pct') {
    cmp = a.averageCompletionPercentage - b.averageCompletionPercentage;
  } else if (sortBy === 'last_active') {
    const aTime = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0;
    const bTime = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0;
    cmp = aTime - bTime;
  } else {
    cmp = a.totalWatchSeconds - b.totalWatchSeconds;
  }
  if (cmp === 0) {
    cmp = a.lecturesWatched - b.lecturesWatched;
  }
  if (cmp === 0) {
    cmp = a.averageCompletionPercentage - b.averageCompletionPercentage;
  }
  return sortDir === 'asc' ? cmp : -cmp;
}

function isStudentActive(lastWatchedAt: string | null, now = Date.now()): boolean {
  if (!lastWatchedAt) {
    return false;
  }
  const last = new Date(lastWatchedAt).getTime();
  if (Number.isNaN(last)) {
    return false;
  }
  const thresholdMs = ACTIVE_STUDENT_DAYS * 24 * 60 * 60 * 1000;
  return now - last <= thresholdMs;
}

async function buildStudentStatsForRoster(
  roster: CollegeStudentRecord[],
  filters?: CollegeVideoAnalyticsFilters,
  allowedCourseIds?: Set<string>,
): Promise<CollegeStudentVideoStat[]> {
  const studentIds = roster.map((s) => s.id);

  if (studentIds.length === 0) {
    return [];
  }

  const useSessions = hasDateRangeFilter(filters);
  const [progressRows, sessionRows] = await Promise.all([
    fetchProgressForStudents(studentIds, filters),
    useSessions ? fetchSessionsForStudents(studentIds, filters) : Promise.resolve(null),
  ]);

  const filteredProgressRows = allowedCourseIds
    ? progressRows.filter((r) => allowedCourseIds.has(r.course_id))
    : progressRows;

  const stats = useSessions
    ? aggregateSessionRows(sessionRows!)
    : aggregateProgressRows(filteredProgressRows);

  if (!useSessions) {
    const summaries = await fetchCourseSummaries(studentIds, filteredProgressRows);
    applyCourseSummary(stats, summaries, filters?.courseId);
  }

  let rows = mergeStudentProfiles(stats, roster);
  rows = applySearchFilter(rows, filters);
  rows = applyStatusFilter(rows, filters);

  const sortBy = filters?.sortBy ?? 'watch_time';
  const sortDir = filters?.sortDir ?? 'desc';
  rows.sort((a, b) => compareStudentStats(a, b, sortBy, sortDir));

  return rows;
}

async function buildStudentStats(
  collegeId: string,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<CollegeStudentVideoStat[]> {
  const [roster, allowedCourseIds] = await Promise.all([
    fetchCollegeStudents(collegeId),
    getAssignedCourseIds(collegeId),
  ]);
  return buildStudentStatsForRoster(roster, filters, allowedCourseIds);
}

/**
 * College-scoped video analytics overview from stored DB summaries.
 * Uses student_video_progress (rich schema) for progress data and video_watch_sessions for session data.
 */
export async function getCollegeVideoAnalyticsOverview(
  collegeId: string,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<CollegeVideoAnalyticsOverview> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`college-analytics-overview-${collegeId}`);
  await assertCollegeVideoAnalyticsSchema();
  const [roster, studentStats] = await Promise.all([
    fetchCollegeStudents(collegeId),
    buildStudentStats(collegeId, filters),
  ]);

  const totalStudents = roster.length;
  const activeStudents = studentStats.filter((s) => isStudentActive(s.lastWatchedAt)).length;
  const inactiveStudents = Math.max(0, totalStudents - activeStudents);

  const totalWatchSeconds = studentStats.reduce((acc, s) => acc + s.totalWatchSeconds, 0);
  const totalLecturesWatched = studentStats.reduce((acc, s) => acc + s.lecturesWatched, 0);
  const totalCompletedLectures = studentStats.reduce((acc, s) => acc + s.completedLectures, 0);

  const studentsWithProgress = studentStats.filter((s) => s.lecturesWatched > 0 || s.totalWatchSeconds > 0);
  const averageCompletionPercentage =
    studentsWithProgress.length > 0
      ? Number(
          (
            studentsWithProgress.reduce((acc, s) => acc + s.averageCompletionPercentage, 0) /
            studentsWithProgress.length
          ).toFixed(1),
        )
      : 0;

  return {
    totalStudents,
    activeStudents,
    inactiveStudents,
    totalWatchSeconds,
    totalWatchHours: roundHours(totalWatchSeconds),
    totalLecturesWatched,
    totalCompletedLectures,
    averageCompletionPercentage,
  };
}

/**
 * Courses assigned to the college (for filter dropdown).
 */
export async function listCollegeVideoAnalyticsCourses(
  collegeId: string,
): Promise<CollegeVideoAnalyticsCourseOption[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`college-analytics-courses-${collegeId}`);
  const supabase = createServiceRoleClient();

  const { data: assignments, error: assignmentError } = await supabase
    .from('content_assignments')
    .select('assigned_entity_id, assigned_entity_type, status, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('assigned_entity_type', 'master_course')
    .eq('status', 'active');

  if (assignmentError) {
    throw new Error(`[college-video-analytics] content_assignments: ${assignmentError.message}`);
  }

  const courseIds = [
    ...new Set(
      (assignments ?? []).reduce((acc, row) => {
        if (isAssignmentActive({
          status: row.status,
          start_date: row.start_date,
          end_date: row.end_date,
        })) {
          acc.push(row.assigned_entity_id);
        }
        return acc;
      }, [] as string[]),
    ),
  ];

  if (courseIds.length === 0) {
    return [];
  }

  const { data: courses, error: coursesError } = await supabase
    .from('master_courses')
    .select('id, title')
    .in('id', courseIds)
    .eq('publish_status', 'published')
    .order('title', { ascending: true });

  if (coursesError) {
    throw new Error(`[college-video-analytics] master_courses: ${coursesError.message}`);
  }

  return (courses ?? []).map((course) => ({
    id: course.id,
    title: course.title,
  }));
}

/**
 * Lightweight lookup of assigned master-course IDs for a college.
 * Wrapped in React.cache for per-request deduplication.
 */
const getAssignedCourseIds = cache(async (collegeId: string): Promise<Set<string>> => {
  const supabase = createServiceRoleClient();

  const { data: assignments, error } = await supabase
    .from('content_assignments')
    .select('assigned_entity_id, status, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('assigned_entity_type', 'master_course')
    .eq('status', 'active');

  if (error) {
    throw new Error(`[college-video-analytics] getAssignedCourseIds: ${error.message}`);
  }

  const ids = new Set<string>();
  for (const row of assignments ?? []) {
    if (isAssignmentActive({
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
    })) {
      ids.add(row.assigned_entity_id);
    }
  }
  return ids;
});

/**
 * Per-student video stats for all students in the college.
 */
export async function getCollegeStudentVideoStats(
  collegeId: string,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<CollegeStudentVideoStat[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`college-analytics-student-stats-${collegeId}`);
  await assertCollegeVideoAnalyticsSchema();
  return buildStudentStats(collegeId, filters);
}

/**
 * Leaderboard ranked by watch time, then lectures watched, then completion %.
 * Only students with verified watch progress (>= 90% or completed) are included.
 */
export function mapStudentStatsToLeaderboard(
  stats: CollegeStudentVideoStat[],
): CollegeStudentLeaderboardEntry[] {
  const ranked = stats
    .filter((row) => row.lecturesWatched > 0 || row.totalWatchSeconds > 0)
    .sort((a, b) => compareStudentStats(a, b, 'watch_time', 'desc'));

  return ranked.map((row, index) => ({
    rank: index + 1,
    studentId: row.studentId,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    totalWatchSeconds: row.totalWatchSeconds,
    totalWatchHours: row.totalWatchHours,
    lecturesWatched: row.lecturesWatched,
    completedLectures: row.completedLectures,
    averageCompletionPercentage: row.averageCompletionPercentage,
    lastWatchedAt: row.lastWatchedAt,
  }));
}

/**
 * Module-level breakdown for one student and course within the college.
 * Returns [] when studentId or courseId is omitted, or student is outside the college.
 */
async function getCollegeModuleWiseStudentAnalytics(
  collegeId: string,
  studentId?: string | null,
  courseId?: string | null,
): Promise<CollegeModuleWiseStudentAnalytics[]> {
  if (!studentId || !courseId) {
    return [];
  }

  const supabase = createServiceRoleClient();

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('id', studentId)
    .eq('college_id', collegeId)
    .maybeSingle();

  if (studentError) {
    throw new Error(`[college-video-analytics] student scope: ${studentError.message}`);
  }
  if (!student) {
    return [];
  }

  const [
    { data: modules, error: modulesError },
    { data: items, error: itemsError },
    progressRows,
  ] = await Promise.all([
    supabase
      .from('master_course_modules')
      .select('id, title, sort_order')
      .eq('master_course_id', courseId)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
    supabase
      .from('master_course_items')
      .select('id, module_id, title, sort_order')
      .eq('master_course_id', courseId)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
    fetchProgressForStudent(studentId, { courseId }),
  ]);

  if (modulesError) {
    throw new Error(`[college-video-analytics] modules: ${modulesError.message}`);
  }
  if (!modules?.length) {
    return [];
  }

  if (itemsError) {
    throw new Error(`[college-video-analytics] items: ${itemsError.message}`);
  }
  const courseProgress = progressRows.filter((p) => p.course_id === courseId);

  const progressByLesson = new Map(courseProgress.map((p) => [p.lesson_id, p]));

  const result: CollegeModuleWiseStudentAnalytics[] = [];

  for (const mod of modules) {
    const modItems = (items ?? []).filter((i) => i.module_id === mod.id);
    if (modItems.length === 0) {
      continue;
    }

    let watchedVideos = 0;
    let completedVideos = 0;
    let totalWatchSeconds = 0;

    const videos: CollegeModuleVideoItem[] = modItems.map((item) => {
      const prog = progressByLesson.get(item.id);
      const uniqueSec = Number(prog?.unique_watched_seconds) || 0;
      const completionPercentage = Number(prog?.completion_percentage) || 0;
      const completed = prog?.completed === true;
      const watched = prog ? isLectureWatched({ completed, completion_percentage: completionPercentage }) : false;

      if (watched) {
        watchedVideos += 1;
        totalWatchSeconds += uniqueSec;
      }
      if (completed) {
        completedVideos += 1;
      }

      return {
        lessonId: item.id,
        lessonTitle: item.title,
        moduleId: mod.id,
        moduleTitle: mod.title,
        videoDurationSeconds: Number(prog?.video_duration_seconds) || 0,
        uniqueWatchedSeconds: uniqueSec,
        totalVideoSecondsWatched: Number(prog?.total_video_seconds_watched) || 0,
        repeatWatchedSeconds: Number(prog?.repeat_watched_seconds) || 0,
        completionPercentage,
        completed,
        lastWatchedAt: prog?.last_watched_at ?? null,
      };
    });

    result.push({
      moduleId: mod.id,
      moduleTitle: mod.title,
      totalVideos: videos.length,
      watchedVideos,
      completedVideos,
      totalWatchSeconds,
      videos,
    });
  }

  return result;
}

function aggregateCourseProgress(
  rows: DetailProgressSlice[],
  courseTitles: Map<string, string>,
): CollegeStudentCourseVideoProgress[] {
  const byCourse = new Map<
    string,
    { rows: DetailProgressSlice[] }
  >();

  for (const row of rows) {
    const entry = byCourse.get(row.course_id) ?? { rows: [] };
    entry.rows.push(row);
    byCourse.set(row.course_id, entry);
  }

  const courses: CollegeStudentCourseVideoProgress[] = [];

  for (const [courseId, { rows: courseRows }] of byCourse) {
    let totalWatchSeconds = 0;
    const watchedLessons = new Set<string>();
    const completedLessons = new Set<string>();
    let pctSum = 0;

    for (const row of courseRows) {
      totalWatchSeconds += Number(row.unique_watched_seconds) || 0;
      if (isLectureWatched(row)) {
        watchedLessons.add(row.lesson_id);
      }
      if (isLectureCompleted(row)) {
        completedLessons.add(row.lesson_id);
      }
      pctSum += Number(row.completion_percentage) || 0;
    }

    const lecturesWatched = watchedLessons.size;
    const completedLectures = completedLessons.size;

    courses.push({
      courseId,
      courseTitle: courseTitles.get(courseId) ?? 'Unknown course',
      totalWatchSeconds,
      totalWatchHours: roundHours(totalWatchSeconds),
      lecturesWatched,
      completedLectures,
      averageCompletionPercentage:
        courseRows.length > 0 ? Number((pctSum / courseRows.length).toFixed(1)) : 0,
    });
  }

  return courses.sort((a, b) => b.totalWatchSeconds - a.totalWatchSeconds);
}

/**
 * Course-level video progress for one student (college-scoped).
 * Only returns progress for courses assigned to the college.
 */
async function getCollegeStudentCourseVideoProgress(
  collegeId: string,
  studentId: string,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<CollegeStudentCourseVideoProgress[]> {
  const [student, progressRows, assignedCourseIds] = await Promise.all([
    assertStudentInCollege(collegeId, studentId),
    fetchProgressForStudent(studentId, filters),
    getAssignedCourseIds(collegeId),
  ]);
  if (!student) {
    return [];
  }
  if (progressRows.length === 0 || assignedCourseIds.size === 0) {
    return [];
  }

  const filteredRows = progressRows.filter((r) => assignedCourseIds.has(r.course_id));
  if (filteredRows.length === 0) {
    return [];
  }

  const courseIds = [...new Set(filteredRows.map((r) => r.course_id))];
  const supabase = createServiceRoleClient();
  const { data: courses, error } = await supabase
    .from('master_courses')
    .select('id, title')
    .in('id', courseIds);

  if (error) {
    throw new Error(`[college-video-analytics] master_courses: ${error.message}`);
  }

  const titleMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
  return aggregateCourseProgress(filteredRows, titleMap);
}

/**
 * Full drilldown bundle: summary, per-course stats, and module/video detail for a course.
 */
/** Table search/status filters do not apply to an explicitly opened student drilldown. */
function drilldownAnalyticsFilters(
  filters?: CollegeVideoAnalyticsFilters,
): CollegeVideoAnalyticsFilters {
  return {
    courseId: filters?.courseId ?? null,
    from: filters?.from ?? null,
    to: filters?.to ?? null,
    search: null,
    status: 'all',
    sortBy: filters?.sortBy,
    sortDir: filters?.sortDir,
  };
}

export async function getCollegeStudentVideoDetailBundle(
  collegeId: string,
  studentId: string,
  options?: {
    courseId?: string | null;
    filters?: CollegeVideoAnalyticsFilters;
  },
): Promise<CollegeStudentVideoDetailBundle | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`college-analytics-student-detail-${collegeId}-${studentId}`);
  const [student, allowedCourseIds] = await Promise.all([
    assertStudentInCollege(collegeId, studentId),
    getAssignedCourseIds(collegeId),
  ]);
  if (!student) {
    return null;
  }

  const scopeFilters = drilldownAnalyticsFilters(options?.filters);
  const summaryRows = await buildStudentStatsForRoster([student], scopeFilters, allowedCourseIds);
  const summary = summaryRows[0] ?? {
    studentId: student.id,
    studentName: student.full_name,
    studentEmail: student.email,
    totalWatchSeconds: 0,
    totalWatchHours: 0,
    lecturesWatched: 0,
    completedLectures: 0,
    averageCompletionPercentage: 0,
    coursesStarted: 0,
    coursesCompleted: 0,
    lastWatchedAt: null,
  };

  const courses = await getCollegeStudentCourseVideoProgress(
    collegeId,
    studentId,
    scopeFilters,
  );

  const selectedCourseId =
    options?.courseId && courses.some((c) => c.courseId === options.courseId)
      ? options.courseId
      : courses[0]?.courseId ?? null;

  const modules = selectedCourseId
    ? await getCollegeModuleWiseStudentAnalytics(collegeId, studentId, selectedCourseId)
    : [];

  return {
    summary,
    courses,
    selectedCourseId,
    modules,
  };
}

function normalizeWeekStart(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return getDefaultWeekStart();
  }
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diff),
  );
  return monday.toISOString().slice(0, 10);
}

function getDefaultWeekStart(): string {
  return normalizeWeekStart(new Date().toISOString().slice(0, 10));
}

function getDefaultChartMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function normalizeMonth(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  return getDefaultChartMonth();
}

function buildEmptyDailyWeek(weekStart: string): CollegeDailyWatchActivityRow[] {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      dayLabel: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      watchedHours: 0,
      lecturesWatched: 0,
    };
  });
}

async function fetchSessionsForCollegeInRange(
  collegeId: string,
  rangeStart: Date,
  rangeEnd: Date,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<SessionSlice[]> {
  const roster = await fetchCollegeStudents(collegeId);
  const studentIds = roster.map((s) => s.id);
  if (studentIds.length === 0) {
    return [];
  }

  const rangeFilters: CollegeVideoAnalyticsFilters = {
    ...filters,
    from: rangeStart.toISOString().slice(0, 10),
    to: new Date(rangeEnd.getTime() - 1).toISOString().slice(0, 10),
  };

  return fetchSessionsForStudents(studentIds, rangeFilters);
}

/**
 * Seven-day daily watch activity for a college (sessions aggregated).
 */
async function getCollegeDailyWatchActivity(
  collegeId: string,
  weekStart: string,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<CollegeDailyWatchActivityRow[]> {
  const monday = normalizeWeekStart(weekStart);
  const start = new Date(`${monday}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sessions = await fetchSessionsForCollegeInRange(collegeId, start, end, filters);
  const days = buildEmptyDailyWeek(monday);
  const lessonsByDay: Array<Set<string>> = days.map(() => new Set());

  for (const session of sessions) {
    const started = new Date(session.started_at);
    if (Number.isNaN(started.getTime())) {
      continue;
    }
    const dayIndex = Math.floor((started.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIndex < 0 || dayIndex > 6) {
      continue;
    }
    days[dayIndex].watchedHours += (Number(session.unique_watched_seconds) || 0) / 3600;
    if (isLectureWatched(session)) {
      lessonsByDay[dayIndex].add(session.lesson_id);
    }
  }

  for (let i = 0; i < days.length; i++) {
    days[i].watchedHours = Number(days[i].watchedHours.toFixed(2));
    days[i].lecturesWatched = lessonsByDay[i].size;
  }

  return days;
}

/**
 * Weekly watch activity for each week in a calendar month (sessions aggregated).
 */
async function getCollegeWeeklyWatchActivity(
  collegeId: string,
  month: string,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<CollegeWeeklyWatchActivityRow[]> {
  const normalizedMonth = normalizeMonth(month);
  const [year, monthNum] = normalizedMonth.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNum, 1));

  const sessions = await fetchSessionsForCollegeInRange(
    collegeId,
    monthStart,
    monthEnd,
    filters,
  );

  const weeks: CollegeWeeklyWatchActivityRow[] = [];
  let cursor = new Date(monthStart.getTime());

  while (cursor < monthEnd) {
    const weekStart = new Date(cursor.getTime());
    const weekEnd = new Date(
      Math.min(monthEnd.getTime(), weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
    );
    const weekEndInclusive = new Date(weekEnd.getTime() - 1);

    weeks.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEndInclusive.toISOString().slice(0, 10),
      weekLabel: `${weekStart.toISOString().slice(5, 10)} – ${weekEndInclusive.toISOString().slice(5, 10)}`,
      watchedHours: 0,
      lecturesWatched: 0,
    });

    cursor = weekEnd;
  }

  const lessonsByWeek = weeks.map(() => new Set<string>());

  const weekStarts = weeks.map((w) => new Date(`${w.weekStart}T00:00:00.000Z`).getTime());
  const weekEnds = weeks.map((w) => new Date(`${w.weekEnd}T23:59:59.999Z`).getTime());

  for (const session of sessions) {
    const t = new Date(session.started_at).getTime();
    let lo = 0;
    let hi = weekStarts.length - 1;
    let weekIndex = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (t < weekStarts[mid]) {
        hi = mid - 1;
      } else if (t > weekEnds[mid]) {
        lo = mid + 1;
      } else {
        weekIndex = mid;
        break;
      }
    }
    if (weekIndex < 0) {
      continue;
    }
    weeks[weekIndex].watchedHours += (Number(session.unique_watched_seconds) || 0) / 3600;
    if (isLectureWatched(session)) {
      lessonsByWeek[weekIndex].add(session.lesson_id);
    }
  }

  for (let i = 0; i < weeks.length; i++) {
    weeks[i].watchedHours = Number(weeks[i].watchedHours.toFixed(2));
    weeks[i].lecturesWatched = lessonsByWeek[i].size;
  }

  return weeks;
}

/**
 * Mutually exclusive student learning status counts for pie chart.
 */
async function getCollegeStudentLearningStatusBreakdown(
  collegeId: string,
  filters?: CollegeVideoAnalyticsFilters,
): Promise<CollegeStudentLearningStatusSlice[]> {
  const stats = await buildStudentStats(collegeId, filters);

  let notStarted = 0;
  let started = 0;
  let active = 0;
  let completedLecture = 0;

  for (const s of stats) {
    if (s.lecturesWatched === 0 && s.totalWatchSeconds === 0) {
      notStarted += 1;
    } else if (s.completedLectures >= 1) {
      completedLecture += 1;
    } else if (isStudentActive(s.lastWatchedAt)) {
      active += 1;
    } else {
      started += 1;
    }
  }

  const slices: CollegeStudentLearningStatusSlice[] = [
    { status: 'not_started', label: 'Not started', count: notStarted },
    { status: 'started', label: 'Started', count: started },
    { status: 'active', label: 'Active', count: active },
    { status: 'completed_lecture', label: 'Completed at least one lecture', count: completedLecture },
  ];
  return slices.filter((slice) => slice.count > 0);
}

/**
 * Chart bundle for college video analytics page.
 */
export async function getCollegeVideoAnalyticsCharts(
  collegeId: string,
  options?: {
    weekStart?: string;
    month?: string;
    filters?: CollegeVideoAnalyticsFilters;
  },
): Promise<CollegeVideoAnalyticsChartData> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`college-analytics-charts-${collegeId}`);
  await assertCollegeVideoAnalyticsSchema();
  const weekStart = normalizeWeekStart(options?.weekStart ?? getDefaultWeekStart());
  const month = normalizeMonth(options?.month ?? getDefaultChartMonth());
  const filters = options?.filters;

  const [dailyWeek, weeklyMonth, learningStatus] = await Promise.all([
    getCollegeDailyWatchActivity(collegeId, weekStart, filters),
    getCollegeWeeklyWatchActivity(collegeId, month, filters),
    getCollegeStudentLearningStatusBreakdown(collegeId, filters),
  ]);

  return {
    weekStart,
    month,
    dailyWeek,
    weeklyMonth,
    learningStatus,
  };
}

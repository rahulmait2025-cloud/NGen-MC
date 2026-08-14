import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildEngagementActivityPie,
  calculateCompletionPercentage,
  formatDayLabel,
  formatWeekLabel,
  isCompletedLecture,
  isWatchedLecture,
  safeNumber,
  secondsToHours,
} from '../formatters';
import type {
  CollegeRecord,
  CompletionDistributionPoint,
  ContentFunnelPoint,
  CourseTitleRecord,
  DayOfWeekActivityPoint,
  EngagementTierPoint,
  LearningAnalyticsCharts,
  LearningAnalyticsDailyPoint,
  LearningAnalyticsWeeklyPoint,
  ModuleTitleRecord,
  ProfileRecord,
  StudentProgressRecord,
  StudentRecord,
  StudentVideoProgressRecord,
  VideoCatalogItem,
  VideoCatalogMeta,
  WeeklyRetentionPoint,
} from '../types';

export { safeNumber };

const PROGRESS_PAGE_SIZE = 1000;
const IN_CHUNK_SIZE = 200;

/** PostgREST filter for student_video_progress activity (quote ISO so `:` does not break parsing). */
function buildProgressActivityOrFilter(sinceIso: string): string {
  const quoted = `"${sinceIso}"`;
  return `last_watched_at.gte.${quoted}`;
}

function getCurrentWeekRange(): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function getCurrentMonthWeekRanges(): Array<{ start: Date; end: Date }> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const ranges: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    if (weekEnd > monthEnd) {
      ranges.push({ start: weekStart, end: new Date(monthEnd) });
      break;
    }
    ranges.push({ start: weekStart, end: weekEnd });
    cursor = new Date(weekEnd);
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }
  return ranges;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function loadVideoCatalog(admin: SupabaseClient): Promise<VideoCatalogMeta> {
  const { data, error } = await admin
    .from('master_course_items')
    .select('id, master_course_id, module_id, title, duration_seconds')
    .eq('item_type', 'video')
    .eq('publish_status', 'published');

  if (error) throw new Error(error.message);

  const items = new Map<string, VideoCatalogItem>();
  const itemIds = new Set<string>();
  const itemsByCourse = new Map<string, VideoCatalogItem[]>();
  const itemsByModule = new Map<string, VideoCatalogItem[]>();

  for (const row of data ?? []) {
    const item: VideoCatalogItem = {
      id: row.id,
      master_course_id: row.master_course_id,
      module_id: row.module_id,
      title: row.title ?? 'Untitled video',
      duration_seconds: row.duration_seconds ?? null,
    };
    items.set(item.id, item);
    itemIds.add(item.id);

    const courseList = itemsByCourse.get(item.master_course_id) ?? [];
    courseList.push(item);
    itemsByCourse.set(item.master_course_id, courseList);

    const moduleList = itemsByModule.get(item.module_id) ?? [];
    moduleList.push(item);
    itemsByModule.set(item.module_id, moduleList);
  }

  return {
    items,
    itemIds,
    totalAvailableVideos: itemIds.size,
    itemsByCourse,
    itemsByModule,
  };
}

export async function loadColleges(admin: SupabaseClient): Promise<CollegeRecord[]> {
  const { data, error } = await admin.from('colleges').select('id, name, slug').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as CollegeRecord[];
}

export async function loadStudents(
  admin: SupabaseClient,
  collegeId?: string,
): Promise<Array<StudentRecord & { profiles?: ProfileRecord }>> {
  let query = admin.from('students').select('id, user_id, college_id, profiles(id, full_name, email)');
  if (collegeId) {
    query = query.eq('college_id', collegeId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => {
    const prof = Array.isArray(row.profiles) ? (row.profiles[0] as ProfileRecord | undefined) : (row.profiles as ProfileRecord | undefined);
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      college_id: row.college_id as string,
      profiles: prof,
    };
  });
}

export async function loadProfiles(
  admin: SupabaseClient,
  userIds: string[],
): Promise<Map<string, ProfileRecord>> {
  const map = new Map<string, ProfileRecord>();
  if (userIds.length === 0) return map;

  const chunkResults = await Promise.allSettled(
    chunkArray(userIds, IN_CHUNK_SIZE).map(async (chunk) => {
      const { data, error } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', chunk);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
  );
  for (const r of chunkResults) {
    if (r.status === 'fulfilled') {
      for (const row of r.value) {
        map.set(row.id, row as ProfileRecord);
      }
    }
  }
  return map;
}

export async function loadCourseTitles(
  admin: SupabaseClient,
  courseIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (courseIds.length === 0) return map;

  const chunkResults = await Promise.allSettled(
    chunkArray(courseIds, IN_CHUNK_SIZE).map(async (chunk) => {
      const { data, error } = await admin
        .from('master_courses')
        .select('id, title')
        .in('id', chunk);
      if (error) throw new Error(error.message);
      return (data ?? []) as CourseTitleRecord[];
    }),
  );
  for (const r of chunkResults) {
    if (r.status === 'fulfilled') {
      for (const row of r.value) {
        map.set(row.id, row.title ?? 'Untitled course');
      }
    }
  }
  return map;
}

export async function loadModuleTitles(
  admin: SupabaseClient,
  moduleIds: string[],
): Promise<Map<string, ModuleTitleRecord>> {
  const map = new Map<string, ModuleTitleRecord>();
  if (moduleIds.length === 0) return map;

  const chunkResults = await Promise.allSettled(
    chunkArray(moduleIds, IN_CHUNK_SIZE).map(async (chunk) => {
      const { data, error } = await admin
        .from('master_course_modules')
        .select('id, title, master_course_id')
        .in('id', chunk);
      if (error) throw new Error(error.message);
      return (data ?? []) as ModuleTitleRecord[];
    }),
  );
  for (const r of chunkResults) {
    if (r.status === 'fulfilled') {
      for (const row of r.value) {
        map.set(row.id, row);
      }
    }
  }
  return map;
}

export async function fetchProgressRows(
  admin: SupabaseClient,
  options?: { studentIds?: string[]; sinceIso?: string; collegeId?: string },
): Promise<StudentProgressRecord[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('learning-analytics');

  const studentIds = options?.studentIds;
  const collegeId = options?.collegeId;

  // Default 90-day rolling window to bound the full-table scan
  const sinceIso = options?.sinceIso ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString();
  })();

  if (studentIds && studentIds.length === 0) {
    return [];
  }

  const all: StudentProgressRecord[] = [];

  if (collegeId) {
    let offset = 0;
    while (true) {
      let query = admin
        .from('student_video_progress')
        .select(
          'student_id, lesson_id, unique_watched_seconds, total_video_seconds_watched, video_duration_seconds, completed, last_watched_at, last_position_seconds, students!inner(college_id)',
        )
        .eq('students.college_id', collegeId);

      if (sinceIso) {
        query = query.or(buildProgressActivityOrFilter(sinceIso));
      }

      const { data, error } = await query.range(offset, offset + PROGRESS_PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const row of data) {
        all.push({
          student_id: row.student_id as string,
          item_id: row.lesson_id as string,
          watched_seconds: Number(row.total_video_seconds_watched) || 0,
          unique_watched_seconds: Number(row.unique_watched_seconds) || 0,
          total_seconds: Number(row.video_duration_seconds) || 0,
          completed: Boolean(row.completed),
          completed_at: row.last_watched_at as string,
          updated_at: row.last_watched_at as string,
          last_position_seconds: Number(row.last_position_seconds) || 0,
        });
      }
      if (data.length < PROGRESS_PAGE_SIZE) break;
      offset += PROGRESS_PAGE_SIZE;
    }
    return all;
  }

  if (studentIds && studentIds.length > 0) {
    async function fetchChunkPages(chunk: string[]): Promise<StudentProgressRecord[]> {
      const rows: StudentProgressRecord[] = [];
      let offset = 0;
      while (true) {
        let query = admin
          .from('student_video_progress')
          .select(
            'student_id, lesson_id, unique_watched_seconds, total_video_seconds_watched, video_duration_seconds, completed, last_watched_at, last_position_seconds',
          )
          .in('student_id', chunk);

        if (sinceIso) {
          query = query.or(buildProgressActivityOrFilter(sinceIso));
        }

        const { data, error } = await query.range(offset, offset + PROGRESS_PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        if (!data?.length) break;
        for (const row of data) {
          rows.push({
            student_id: row.student_id as string,
            item_id: row.lesson_id as string,
            watched_seconds: Number(row.total_video_seconds_watched) || 0,
            unique_watched_seconds: Number(row.unique_watched_seconds) || 0,
            total_seconds: Number(row.video_duration_seconds) || 0,
            completed: Boolean(row.completed),
            completed_at: row.last_watched_at as string,
            updated_at: row.last_watched_at as string,
            last_position_seconds: Number(row.last_position_seconds) || 0,
          });
        }
        if (data.length < PROGRESS_PAGE_SIZE) break;
        offset += PROGRESS_PAGE_SIZE;
      }
      return rows;
    }

    const chunkResults = await Promise.allSettled(
      chunkArray(studentIds, IN_CHUNK_SIZE).map((chunk) => fetchChunkPages(chunk)),
    );
    for (const r of chunkResults) {
      if (r.status === 'fulfilled') {
        all.push(...r.value);
      }
    }
    return all;
  }

  let offset = 0;
  while (true) {
    let query = admin
      .from('student_video_progress')
      .select(
        'student_id, lesson_id, unique_watched_seconds, total_video_seconds_watched, video_duration_seconds, completed, last_watched_at, last_position_seconds',
      );

    if (sinceIso) {
      query = query.or(buildProgressActivityOrFilter(sinceIso));
    }

    const { data, error } = await query.range(offset, offset + PROGRESS_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data) {
      all.push({
        student_id: row.student_id as string,
        item_id: row.lesson_id as string,
        watched_seconds: Number(row.total_video_seconds_watched) || 0,
        unique_watched_seconds: Number(row.unique_watched_seconds) || 0,
        total_seconds: Number(row.video_duration_seconds) || 0,
        completed: Boolean(row.completed),
        completed_at: row.last_watched_at as string,
        updated_at: row.last_watched_at as string,
        last_position_seconds: Number(row.last_position_seconds) || 0,
      });
    }
    if (data.length < PROGRESS_PAGE_SIZE) break;
    offset += PROGRESS_PAGE_SIZE;
  }

  return all;
}

/** Optional repeat-watch data from student_video_progress (table may be empty). */
export async function fetchOptionalVideoProgressRepeat(
  admin: SupabaseClient,
  studentId: string,
): Promise<{ repeatWatchSeconds: number | null; uniqueFromTable: number | null }> {
  const { data, error } = await admin
    .from('student_video_progress')
    .select('student_id, lesson_id, unique_watched_seconds, repeat_watched_seconds, total_video_seconds_watched')
    .eq('student_id', studentId);

  if (error) {
    const msg = (error.message ?? '').toLowerCase();
    if (
      msg.includes('student_video_progress') &&
      (msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find'))
    ) {
      return { repeatWatchSeconds: null, uniqueFromTable: null };
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as StudentVideoProgressRecord[];
  if (rows.length === 0) {
    return { repeatWatchSeconds: null, uniqueFromTable: null };
  }

  let repeatSum = 0;
  let uniqueSum = 0;
  for (const row of rows) {
    repeatSum += safeNumber(row.repeat_watched_seconds);
    uniqueSum += safeNumber(row.unique_watched_seconds);
  }
  return {
    repeatWatchSeconds: repeatSum > 0 ? repeatSum : null,
    uniqueFromTable: uniqueSum > 0 ? uniqueSum : null,
  };
}

export interface ProgressStudentAgg {
  totalWatchSeconds: number;
  uniqueWatchSeconds: number;
  watchedItemIds: Set<string>;
  completedItemIds: Set<string>;
  completionPctSum: number;
  progressRowCount: number;
  lastActivityAt: Date | null;
}

export function createEmptyStudentAgg(): ProgressStudentAgg {
  return {
    totalWatchSeconds: 0,
    uniqueWatchSeconds: 0,
    watchedItemIds: new Set(),
    completedItemIds: new Set(),
    completionPctSum: 0,
    progressRowCount: 0,
    lastActivityAt: null,
  };
}

export function applyProgressRow(
  agg: ProgressStudentAgg,
  row: StudentProgressRecord,
  catalog: VideoCatalogMeta,
): void {
  if (!catalog.itemIds.has(row.item_id)) return;

  const watched = safeNumber(row.watched_seconds);
  const uniqueWatched = safeNumber(row.unique_watched_seconds);
  if (!isWatchedLecture(uniqueWatched)) return;

  agg.totalWatchSeconds += watched;
  agg.uniqueWatchSeconds += uniqueWatched;
  agg.watchedItemIds.add(row.item_id);
  agg.completionPctSum += calculateCompletionPercentage(uniqueWatched, row.total_seconds);
  agg.progressRowCount += 1;

  if (isCompletedLecture(row)) {
    agg.completedItemIds.add(row.item_id);
  }

  const activityDates: Date[] = [];
  if (row.updated_at) activityDates.push(new Date(row.updated_at));
  if (row.completed_at) activityDates.push(new Date(row.completed_at));
  for (const d of activityDates) {
    if (!Number.isNaN(d.getTime())) {
      if (!agg.lastActivityAt || d > agg.lastActivityAt) {
        agg.lastActivityAt = d;
      }
    }
  }
}

export function averageCompletionFromAgg(agg: ProgressStudentAgg): number {
  if (agg.progressRowCount <= 0) return 0;
  return Number((agg.completionPctSum / agg.progressRowCount).toFixed(1));
}

export function toIsoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export interface CatalogWatchStats {
  watchedVideoItemIds: Set<string>;
  completedVideoItemIds: Set<string>;
}

export function buildCatalogWatchStats(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
): CatalogWatchStats {
  const watchedVideoItemIds = new Set<string>();
  const completedVideoItemIds = new Set<string>();

  for (const row of progressRows) {
    if (!catalog.itemIds.has(row.item_id)) continue;
    if (!isWatchedLecture(row.unique_watched_seconds)) continue;
    watchedVideoItemIds.add(row.item_id);
    if (isCompletedLecture(row)) {
      completedVideoItemIds.add(row.item_id);
    }
  }

  return { watchedVideoItemIds, completedVideoItemIds };
}

function buildDailyCurrentWeek(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
): LearningAnalyticsDailyPoint[] {
  const { start, end } = getCurrentWeekRange();
  const days: LearningAnalyticsDailyPoint[] = [];

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(start);
    dayStart.setDate(start.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    if (dayStart > end) break;

    const point = aggregateProgressForRange(progressRows, catalog, dayStart, dayEnd);
    days.push({
      label: formatDayLabel(dayStart),
      date: dayStart.toISOString().split('T')[0],
      ...point,
    });
  }

  return days;
}

function buildWeeklyCurrentMonth(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
): LearningAnalyticsWeeklyPoint[] {
  const ranges = getCurrentMonthWeekRanges();
  return ranges.map((range) => {
    const point = aggregateProgressForRange(progressRows, catalog, range.start, range.end);
    return {
      label: formatWeekLabel(range.start, range.end),
      weekStart: range.start.toISOString().split('T')[0],
      weekEnd: range.end.toISOString().split('T')[0],
      ...point,
    };
  });
}

function aggregateProgressForRange(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
  rangeStart: Date,
  rangeEnd: Date,
): { watchedHours: number; lecturesWatched: number; completedLectures: number } {
  let watchedSeconds = 0;
  const lecturesWatched = new Set<string>();
  const completedLectures = new Set<string>();

  for (const row of progressRows) {
    if (!catalog.itemIds.has(row.item_id)) continue;

    const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
    const completedAt = row.completed_at ? new Date(row.completed_at) : null;

    const touched =
      (updatedAt && updatedAt >= rangeStart && updatedAt <= rangeEnd) ||
      (completedAt && completedAt >= rangeStart && completedAt <= rangeEnd);

    if (!touched) continue;

    const watched = safeNumber(row.watched_seconds);
    const uniqueWatched = safeNumber(row.unique_watched_seconds);
    if (isWatchedLecture(uniqueWatched)) {
      lecturesWatched.add(row.item_id);
      watchedSeconds += watched;
    }

    if (completedAt && completedAt >= rangeStart && completedAt <= rangeEnd && isCompletedLecture(row)) {
      completedLectures.add(row.item_id);
    }
  }

  return {
    watchedHours: secondsToHours(watchedSeconds),
    lecturesWatched: lecturesWatched.size,
    completedLectures: completedLectures.size,
  };
}

export function buildChartsBundle(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
  pie: { lecturesWatched: number; completedLectures: number },
): LearningAnalyticsCharts {
  return {
    dailyCurrentWeek: buildDailyCurrentWeek(progressRows, catalog),
    weeklyCurrentMonth: buildWeeklyCurrentMonth(progressRows, catalog),
    contentPie: buildEngagementActivityPie(pie.lecturesWatched, pie.completedLectures),
  };
}

export function resolveStudentDisplay(
  student: StudentRecord,
  profiles: Map<string, ProfileRecord>,
): { name: string; email: string } {
  const profile = profiles.get(student.user_id);
  return {
    name: profile?.full_name?.trim() || 'Unknown student',
    email: profile?.email?.trim() || '',
  };
}

export function rankLeaderboard<T extends {
  studentId: string;
  name: string;
  email: string;
  totalWatchSeconds: number;
  totalWatchHours: number;
  lecturesWatched: number;
  completedLectures: number;
  averageCompletionPercentage: number;
  lastActivityAt: string | null;
}>(rows: T[]): Array<T & { rank: number }> {
  const sorted = rows.toSorted((a, b) => {
    if (b.totalWatchSeconds !== a.totalWatchSeconds) {
      return b.totalWatchSeconds - a.totalWatchSeconds;
    }
    if (b.lecturesWatched !== a.lecturesWatched) {
      return b.lecturesWatched - a.lecturesWatched;
    }
    return b.averageCompletionPercentage - a.averageCompletionPercentage;
  });

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function countCoursesStartedCompleted(
  studentId: string,
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
): { coursesStarted: number; coursesCompleted: number } {
  const byCourse = new Map<string, { total: number; watched: number; completed: number }>();

  for (const [courseId, items] of catalog.itemsByCourse) {
    byCourse.set(courseId, { total: items.length, watched: 0, completed: 0 });
  }

  const studentRows = progressRows.filter((r) => r.student_id === studentId);
  for (const row of studentRows) {
    const item = catalog.items.get(row.item_id);
    if (!item) continue;
    const stats = byCourse.get(item.master_course_id);
    if (!stats) continue;
    if (isWatchedLecture(row.watched_seconds)) {
      stats.watched += 1;
    }
    if (isCompletedLecture(row)) {
      stats.completed += 1;
    }
  }

  let coursesStarted = 0;
  let coursesCompleted = 0;
  for (const stats of byCourse.values()) {
    if (stats.total <= 0) continue;
    if (stats.watched > 0) coursesStarted += 1;
    if (stats.completed >= stats.total) coursesCompleted += 1;
  }

  return { coursesStarted, coursesCompleted };
}

export interface ModuleBreakdownInput {
  scopeProgress: StudentProgressRecord[];
  catalog: VideoCatalogMeta;
  courseTitles: Map<string, string>;
  moduleTitles: Map<string, ModuleTitleRecord>;
  moduleIdsFilter?: Set<string>;
}

export function buildModuleBreakdown(input: ModuleBreakdownInput) {
  const { scopeProgress, catalog, courseTitles, moduleTitles, moduleIdsFilter } = input;
  const moduleIds =
    moduleIdsFilter ??
    new Set(Array.from(catalog.itemsByModule.keys()));

  const rows: Array<{
    moduleId: string;
    moduleTitle: string;
    courseId: string;
    courseTitle: string;
    totalVideos: number;
    watchedVideos: number;
    completedVideos: number;
    totalWatchSeconds: number;
    totalWatchHours: number;
    averageCompletionPercentage: number;
  }> = [];

  for (const moduleId of moduleIds) {
    const items = catalog.itemsByModule.get(moduleId) ?? [];
    if (items.length === 0) continue;

    const moduleMeta = moduleTitles.get(moduleId);
    const courseId = moduleMeta?.master_course_id ?? items[0].master_course_id;
    const courseTitle = courseTitles.get(courseId) ?? 'Untitled course';
    const moduleTitle = moduleMeta?.title ?? 'Untitled module';

    let watchedVideos = 0;
    let completedVideos = 0;
    let totalWatchSeconds = 0;
    let completionPctSum = 0;
    let progressCount = 0;

    const itemIdSet = new Set(items.map((i) => i.id));
    const relevant = scopeProgress.filter((p) => itemIdSet.has(p.item_id));

    for (const item of items) {
      const matches = relevant.filter((p) => p.item_id === item.id);
      const best = matches.reduce<StudentProgressRecord | null>((acc, row) => {
        if (!acc || safeNumber(row.watched_seconds) > safeNumber(acc.watched_seconds)) {
          return row;
        }
        return acc;
      }, null);

      if (!best || !isWatchedLecture(best.watched_seconds)) continue;

      watchedVideos += 1;
      const watched = safeNumber(best.watched_seconds);
      totalWatchSeconds += watched;
      completionPctSum += calculateCompletionPercentage(watched, best.total_seconds);
      progressCount += 1;
      if (isCompletedLecture(best)) completedVideos += 1;
    }

    rows.push({
      moduleId,
      moduleTitle,
      courseId,
      courseTitle,
      totalVideos: items.length,
      watchedVideos,
      completedVideos,
      totalWatchSeconds,
      totalWatchHours: secondsToHours(totalWatchSeconds),
      averageCompletionPercentage:
        progressCount > 0 ? Number((completionPctSum / progressCount).toFixed(1)) : 0,
    });
  }

  return rows.sort((a, b) => b.totalWatchSeconds - a.totalWatchSeconds);
}

export function getAdminClient(): SupabaseClient {
  return createAdminClient();
}

export interface WeeklyActiveTrendRow {
  weekStart: Date;
  weekEnd: Date;
  activeStudents: number;
  totalWatchSeconds: number;
}

export function buildWeeklyActiveTrend(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
  weeks: number = 12,
): WeeklyActiveTrendRow[] {
  const now = new Date();
  const ranges: WeeklyActiveTrendRow[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const activeStudents = new Set<string>();
    let totalWatchSeconds = 0;

    for (const row of progressRows) {
      if (!catalog.itemIds.has(row.item_id)) continue;
      const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
      if (!updatedAt || updatedAt < weekStart || updatedAt > weekEnd) continue;
      const watched = safeNumber(row.watched_seconds);
      if (!isWatchedLecture(watched)) continue;
      activeStudents.add(row.student_id);
      totalWatchSeconds += watched;
    }

    ranges.push({
      weekStart,
      weekEnd,
      activeStudents: activeStudents.size,
      totalWatchSeconds,
    });
  }

  return ranges;
}

export async function fetchAtRiskStudentCount(
  admin: SupabaseClient,
): Promise<number | null> {
  try {
    const { count, error } = await admin
      .from('v_student_risk_profile')
      .select('*', { count: 'exact', head: true })
      .eq('risk_status', 'at_risk');

    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

export async function fetchStreakStats(
  admin: SupabaseClient,
): Promise<{
  totalStudentsWithStreaks: number | null;
  averageStreakLength: number | null;
  totalActiveStreaks: number | null;
}> {
  'use cache';
  cacheLife('minutes');
  cacheTag('streak-stats');
  try {
    // Only fetch streaks > 0 to avoid scanning all rows including zero-streak students
    const { data, error } = await admin
      .from('student_streaks')
      .select('current_streak, longest_streak')
      .or('current_streak.gt.0,longest_streak.gt.0');

    if (error) {
      return {
        totalStudentsWithStreaks: null,
        averageStreakLength: null,
        totalActiveStreaks: null,
      };
    }

    const rows = (data ?? []) as Array<{
      current_streak: number;
      longest_streak: number;
    }>;

    const withStreaks = rows.filter((r) => (r.longest_streak ?? 0) > 0);
    const activeStreaks = rows.filter((r) => (r.current_streak ?? 0) >= 3);
    const avgLength =
      withStreaks.length > 0
        ? Number(
            (
              withStreaks.reduce((s, r) => s + (r.longest_streak ?? 0), 0) /
              withStreaks.length
            ).toFixed(1),
          )
        : null;

    return {
      totalStudentsWithStreaks: withStreaks.length,
      averageStreakLength: avgLength,
      totalActiveStreaks: activeStreaks.length,
    };
  } catch {
    return {
      totalStudentsWithStreaks: null,
      averageStreakLength: null,
      totalActiveStreaks: null,
    };
  }
}

export function buildCourseFunnel(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
  courseTitles: Map<string, string>,
): ContentFunnelPoint[] {
  const byCourse = new Map<
    string,
    { totalVideos: number; watchedVideos: Set<string>; completedVideos: Set<string> }
  >();

  for (const [courseId, items] of catalog.itemsByCourse) {
    byCourse.set(courseId, {
      totalVideos: items.length,
      watchedVideos: new Set(),
      completedVideos: new Set(),
    });
  }

  for (const row of progressRows) {
    if (!catalog.itemIds.has(row.item_id)) continue;
    const item = catalog.items.get(row.item_id);
    if (!item) continue;

    const stats = byCourse.get(item.master_course_id);
    if (!stats) continue;

    const watched = safeNumber(row.watched_seconds);
    if (!isWatchedLecture(watched)) continue;

    stats.watchedVideos.add(row.item_id);
    if (isCompletedLecture(row)) {
      stats.completedVideos.add(row.item_id);
    }
  }

  const funnel: ContentFunnelPoint[] = [];
  for (const [courseId, stats] of byCourse) {
    if (stats.totalVideos <= 0) continue;
    const completedVideos = stats.completedVideos.size;
    const watchedVideos = stats.watchedVideos.size;
    const completionPct =
      stats.totalVideos > 0
        ? Number(((completedVideos / stats.totalVideos) * 100).toFixed(1))
        : 0;

    funnel.push({
      courseId,
      courseTitle: courseTitles.get(courseId) ?? 'Untitled course',
      totalVideos: stats.totalVideos,
      watchedVideos,
      completedVideos,
      completionPercentage: completionPct,
    });
  }

  return funnel.sort((a, b) => b.totalVideos - a.totalVideos);
}

export function buildCompletionDistribution(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
): CompletionDistributionPoint[] {
  const studentCompletion = new Map<string, { sum: number; count: number }>();

  for (const row of progressRows) {
    if (!catalog.itemIds.has(row.item_id)) continue;
    const watched = safeNumber(row.watched_seconds);
    if (!isWatchedLecture(watched)) continue;

    const existing = studentCompletion.get(row.student_id) ?? { sum: 0, count: 0 };
    existing.sum += calculateCompletionPercentage(watched, row.total_seconds);
    existing.count += 1;
    studentCompletion.set(row.student_id, existing);
  }

  const buckets: Record<string, number> = {
    '0%': 0,
    '1\u201325%': 0,
    '26\u201350%': 0,
    '51\u201375%': 0,
    '76\u201399%': 0,
    '100%': 0,
  };

  for (const { sum, count } of studentCompletion.values()) {
    const avg = count > 0 ? sum / count : 0;
    if (avg === 0) buckets['0%'] += 1;
    else if (avg <= 25) buckets['1\u201325%'] += 1;
    else if (avg <= 50) buckets['26\u201350%'] += 1;
    else if (avg <= 75) buckets['51\u201375%'] += 1;
    else if (avg < 100) buckets['76\u201399%'] += 1;
    else buckets['100%'] += 1;
  }

  return Object.entries(buckets).reduce((acc, [range, count]) => {
    if (count > 0) acc.push({ range, studentCount: count });
    return acc;
  }, [] as Array<{ range: string; studentCount: number }>);
}

export function buildDayOfWeekActivity(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
): DayOfWeekActivityPoint[] {
  const days = Array.from({ length: 7 }, (_, i) => {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: names[i],
      dayIndex: i,
      students: new Set<string>(),
      totalSeconds: 0,
    };
  });

  for (const row of progressRows) {
    if (!catalog.itemIds.has(row.item_id)) continue;
    if (!row.updated_at) continue;
    const watched = safeNumber(row.watched_seconds);
    if (!isWatchedLecture(watched)) continue;

    const date = new Date(row.updated_at);
    const dayIndex = date.getDay();
    days[dayIndex].students.add(row.student_id);
    days[dayIndex].totalSeconds += watched;
  }

  return days.map((d) => ({
    day: d.day,
    dayIndex: d.dayIndex,
    activeStudents: d.students.size,
    watchHours: secondsToHours(d.totalSeconds),
  }));
}

export function buildEngagementTiers(
  studentWatchSeconds: Map<string, number>,
): EngagementTierPoint[] {
  const tiers: EngagementTierPoint[] = [
    { tier: 'Dormant', minHours: 0, maxHours: 0, studentCount: 0 },
    { tier: 'Occasional', minHours: 0, maxHours: 1, studentCount: 0 },
    { tier: 'Regular', minHours: 1, maxHours: 5, studentCount: 0 },
    { tier: 'Engaged', minHours: 5, maxHours: 20, studentCount: 0 },
    { tier: 'Power', minHours: 20, maxHours: Infinity, studentCount: 0 },
  ];

  for (const seconds of studentWatchSeconds.values()) {
    const hours = seconds / 3600;
    for (const tier of tiers) {
      if (hours > tier.minHours && hours <= tier.maxHours) {
        tier.studentCount += 1;
        break;
      }
      if (tier.tier === 'Dormant' && hours === 0) {
        tier.studentCount += 1;
        break;
      }
    }
  }

  return tiers.filter((t) => t.studentCount > 0);
}

export function buildWeeklyRetention(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
  weeks: number = 8,
): WeeklyRetentionPoint[] {
  const now = new Date();
  const weekSets: Array<{ label: string; start: Date; end: Date; students: Set<string> }> = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const students = new Set<string>();
    for (const row of progressRows) {
      if (!catalog.itemIds.has(row.item_id)) continue;
      const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
      if (!updatedAt || updatedAt < weekStart || updatedAt > weekEnd) continue;
      const watched = safeNumber(row.watched_seconds);
      if (!isWatchedLecture(watched)) continue;
      students.add(row.student_id);
    }

    const month = weekStart.toLocaleDateString('en-IN', { month: 'short' });
    const startDay = weekStart.getDate();
    weekSets.push({ label: `${startDay} ${month}`, start: weekStart, end: weekEnd, students });
  }

  const retention: WeeklyRetentionPoint[] = [];
  for (let i = 1; i < weekSets.length; i++) {
    const prev = weekSets[i - 1];
    const curr = weekSets[i];
    const retained = [...curr.students].filter((s) => prev.students.has(s)).length;
    retention.push({
      weekLabel: curr.label,
      weekStart: curr.start.toISOString().split('T')[0],
      retainedStudents: retained,
      previousActiveStudents: prev.students.size,
      retentionRate:
        prev.students.size > 0
          ? Number(((retained / prev.students.size) * 100).toFixed(1))
          : 0,
    });
  }

  return retention;
}

export function buildStudentWatchSecondsMap(
  progressRows: StudentProgressRecord[],
  catalog: VideoCatalogMeta,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of progressRows) {
    if (!catalog.itemIds.has(row.item_id)) continue;
    const watched = safeNumber(row.watched_seconds);
    if (!isWatchedLecture(watched)) continue;
    map.set(row.student_id, (map.get(row.student_id) ?? 0) + watched);
  }
  return map;
}


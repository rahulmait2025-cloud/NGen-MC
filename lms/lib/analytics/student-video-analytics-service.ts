import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStudentAccessibleCourses } from '@/lib/services/course-access-manager';
import { normUuid } from '@/lib/utils';
import { getSharedAnalyticsPayload, getWeekStartString } from './shared-cache';

export interface StudentAnalyticsOverview {
  totalHoursWatched: number;
  totalWatchSeconds: number;
  totalLecturesWatched: number;
  totalAvailableLectures: number;
  totalAvailableCourses: number;
  startedCourses: number;
  completedCourses: number;
  notStartedCourses: number;
  averageCompletionPercentage: number;
}

export interface VideoAnalyticsDetail {
  videoId: string;
  videoTitle: string;
  duration: number;
  uniqueWatchedSeconds: number;
  totalVideoSecondsWatched: number;
  completionPercentage: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface ModuleAnalyticsDetail {
  moduleId: string;
  moduleTitle: string;
  totalVideosInModule: number;
  watchedVideosCount: number;
  completedVideosCount: number;
  totalHoursWatchedInModule: number;
  videos: VideoAnalyticsDetail[];
}

export interface DailyAnalyticsRow {
  date: string;
  watchedHours: number;
  lecturesWatched: number;
  completedLectures: number;
}

export interface WeeklyAnalyticsRow {
  weekStart: string;
  weekEnd: string;
  watchedHours: number;
  lecturesWatched: number;
  completedLectures: number;
}

export interface CoursePieChartData {
  totalAvailableCourses: number;
  notStartedCourses: number;
  startedCourses: number;
  completedCourses: number;
}

export interface TimeOfDayHour {
  hour: number;
  label: string;
  seconds: number;
  hours: number;
}

export interface TimeOfDayDay {
  day: string;
  dayIndex: number;
  seconds: number;
  hours: number;
}

export interface TimeOfDayPeriod {
  name: string;
  range: string;
  seconds: number;
  hours: number;
}

export interface TimeOfDayAnalytics {
  hourly: TimeOfDayHour[];
  dailyBreakdown: TimeOfDayDay[];
  totalSeconds: number;
  totalHours: number;
  peakHour: { hour: number; label: string; hours: number };
  peakDay: { day: string; hours: number };
  periods: TimeOfDayPeriod[];
  dominantPeriod: { name: string; range: string; hours: number };
}

export interface CustomRangeAnalytics {
  totalHoursWatched: number;
  totalLecturesWatched: number;
  totalLecturesCompleted: number;
  daysActive: number;
  averageHoursPerDay: number;
  dailyData: { date: string; hours: number; lectures: number; completed: number }[];
}

function progressTable(): 'student_video_progress' {
  return 'student_video_progress';
}
function sessionsTable(): 'video_watch_sessions' {
  return 'video_watch_sessions';
}

interface ProgressRow {
  item_id: string | null;
  course_id: string | null;
  module_id: string | null;
  watched_seconds: number | null;
  total_watched_seconds: number | null;
  total_seconds: number | null;
  completed: boolean | null;
  updated_at: string | null;
}

interface SessionRow {
  id: string | null;
  created_at: string | null;
  watched_duration_seconds: number | null;
  item_id: string | null;
  pillar_id?: string | null;
  course_id?: string | null;
  module_id?: string | null;
  unique_watched_seconds?: number | null;
}

function normalizeProgressRow(row: Record<string, unknown>): ProgressRow {
  return {
    item_id: (row.lesson_id as string | null) ?? null,
    course_id: (row.course_id as string | null) ?? null,
    module_id: (row.module_id as string | null) ?? null,
    watched_seconds: (row.unique_watched_seconds as number | null) ?? null,
    total_watched_seconds: (row.total_video_seconds_watched as number | null) ?? null,
    total_seconds: (row.video_duration_seconds as number | null) ?? null,
    completed: (row.completed as boolean | null) ?? null,
    updated_at: (row.last_watched_at as string | null) ?? null,
  };
}

function normalizeSessionRow(row: Record<string, unknown>): SessionRow {
  return {
    id: (row.id as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    watched_duration_seconds: (row.total_video_seconds_watched as number | null) ?? null,
    item_id: (row.lesson_id as string | null) ?? null,
    pillar_id: (row.pillar_id as string | null) ?? null,
    course_id: (row.course_id as string | null) ?? null,
    module_id: (row.module_id as string | null) ?? null,
    unique_watched_seconds: (row.unique_watched_seconds as number | null) ?? null,
  };
}

function progressSelectColumns(): string {
  return 'lesson_id, course_id, module_id, unique_watched_seconds, total_video_seconds_watched, video_duration_seconds, completed, last_watched_at';
}
function sessionsSelectColumns(): string {
  return 'id, created_at, total_video_seconds_watched, lesson_id, pillar_id, course_id, module_id, unique_watched_seconds';
}

async function selectProgressForStudent(sb: ReturnType<typeof createAdminClient>, studentId: string, itemIds: string[]): Promise<ProgressRow[]> {
  if (itemIds.length === 0) return [];
  const result = await sb
    .from(progressTable())
    .select(progressSelectColumns())
    .eq('student_id', studentId)
    .in('lesson_id', itemIds);
  if (result.error) {
    return [];
  }
  const rows = (result.data as unknown as Record<string, unknown>[] | null) ?? [];
  return rows.map(normalizeProgressRow);
}

async function selectAllProgressForStudent(sb: ReturnType<typeof createAdminClient>, studentId: string): Promise<ProgressRow[]> {
  const result = await sb
    .from(progressTable())
    .select('total_video_seconds_watched')
    .eq('student_id', studentId);
  if (result.error) return [];
  return ((result.data as unknown as Record<string, unknown>[] | null) ?? []).map(normalizeProgressRow);
}

async function selectSessionsForStudentInRange(
  sb: ReturnType<typeof createAdminClient>,
  studentId: string,
  startDate: Date,
  endDate: Date,
): Promise<SessionRow[]> {
  const result = await sb
    .from(sessionsTable())
    .select(sessionsSelectColumns())
    .eq('student_id', studentId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString());
  const rows = (result.data as unknown as Record<string, unknown>[] | null) ?? [];
  return rows.map(normalizeSessionRow);
}

async function selectProgressForStudentUpdatedInRange(
  sb: ReturnType<typeof createAdminClient>,
  studentId: string,
  startDate: Date,
  endDate: Date,
): Promise<ProgressRow[]> {
  const result = await sb
    .from(progressTable())
    .select(progressSelectColumns())
    .eq('student_id', studentId)
    .gt('unique_watched_seconds', 0)
    .gte('last_watched_at', startDate.toISOString())
    .lt('last_watched_at', endDate.toISOString());
  const rows = (result.data as unknown as Record<string, unknown>[] | null) ?? [];
  return rows.map(normalizeProgressRow);
}

const EMPTY_OVERVIEW: StudentAnalyticsOverview = {
  totalHoursWatched: 0,
  totalWatchSeconds: 0,
  totalLecturesWatched: 0,
  totalAvailableLectures: 0,
  totalAvailableCourses: 0,
  startedCourses: 0,
  completedCourses: 0,
  notStartedCourses: 0,
  averageCompletionPercentage: 0,
};

// PERFORMANCE: This function handles filtered (courseId/pillarId) overview queries
// that the RPC-based get_student_analytics_payload cannot serve (it has no filter params).
// When filtering is not needed, getOverview() uses the RPC path instead.
async function computeOverview(studentId: string, options?: { courseId?: string; pillarId?: string; isGlobal?: boolean; collegeId?: string | null }): Promise<StudentAnalyticsOverview> {
  const sb = createAdminClient();

  const accessibleCourses = await getStudentAccessibleCourses(studentId, {
    isGlobal: options?.isGlobal ?? true,
    collegeId: options?.collegeId ?? null,
  });
  let validCourses = accessibleCourses;
  if (options?.courseId) {
    const want = normUuid(options.courseId);
    validCourses = validCourses.filter(c => normUuid(c.master_course_id) === want);
  }
  if (options?.pillarId) {
    const want = normUuid(options.pillarId);
    validCourses = validCourses.filter(
      c => c.master_course && normUuid(c.master_course.pillar_id) === want,
    );
  }
  const courseIds = validCourses.map(c => c.master_course_id);
  const totalAvailableCourses = courseIds.length;

  const [{ data: allItems }, allProgressRows] = await Promise.all([
    totalAvailableCourses > 0
      ? sb.from('master_course_items').select('id, master_course_id').in('master_course_id', courseIds).eq('publish_status', 'published')
      : Promise.resolve({ data: [] as { id: string; master_course_id: string }[] }),
    selectAllProgressForStudent(sb, studentId),
  ]);

  let lifetimeWatchSec = 0;
  for (const row of allProgressRows ?? []) {
    lifetimeWatchSec += Number(row.total_watched_seconds || 0);
  }
  const totalHoursWatched = Number((lifetimeWatchSec / 3600).toFixed(4));
  const totalWatchSeconds = Math.round(lifetimeWatchSec * 100) / 100;

  if (totalAvailableCourses === 0) {
    return {
      ...EMPTY_OVERVIEW,
      totalHoursWatched,
      totalWatchSeconds,
    };
  }

  const itemsByCourse = new Map<string, number>();
  for (const item of allItems ?? []) {
    const cid = normUuid(item.master_course_id);
    itemsByCourse.set(cid, (itemsByCourse.get(cid) ?? 0) + 1);
  }
  const totalAvailableLectures = allItems?.length ?? 0;

  const allItemIds = new Set(allItems?.map(i => normUuid(i.id)) ?? []);
  const itemToCourse = new Map<string, string>();
  for (const item of allItems ?? []) {
    itemToCourse.set(normUuid(item.id), normUuid(item.master_course_id));
  }

  const progressRows = await selectProgressForStudent(sb, studentId, Array.from(allItemIds));

  let totalLecturesStarted = 0;
  let totalPctSum = 0;

  interface OverviewProgressRow {
    course_id: string;
    lesson_id: string;
    unique_watched_seconds: number;
    completion_percentage: number;
    completed: boolean;
  }

  const progressByCourse = new Map<string, OverviewProgressRow[]>();
  for (const row of progressRows ?? []) {
    const itemId = normUuid(row.item_id);
    if (!allItemIds.has(itemId)) continue;

    const cid = itemToCourse.get(itemId);
    if (!cid) continue;

    const uniqueWatchedSeconds = Number(row.watched_seconds || 0);
    const totalSeconds = Number(row.total_seconds || 0);
    const completionPercentage = totalSeconds > 0 ? Math.min(100, Math.round((uniqueWatchedSeconds / totalSeconds) * 100)) : 0;
    const completed = row.completed || completionPercentage >= 66;

    const mappedRow: OverviewProgressRow = {
      course_id: cid,
      lesson_id: itemId,
      unique_watched_seconds: uniqueWatchedSeconds,
      completion_percentage: completionPercentage,
      completed,
    };

    if (!progressByCourse.has(cid)) progressByCourse.set(cid, []);
    progressByCourse.get(cid)!.push(mappedRow);

    if (uniqueWatchedSeconds > 0) totalLecturesStarted++;
    totalPctSum += completionPercentage;
  }
  const averageCompletionPercentage =
    totalAvailableLectures > 0 ? Number((totalPctSum / totalAvailableLectures).toFixed(1)) : 0;

  let startedCourses = 0;
  let completedCourses = 0;
  let notStartedCourses = 0;

  for (const courseId of courseIds) {
    const cid = normUuid(courseId);
    const totalItems = itemsByCourse.get(cid) ?? 0;
    const progRows = progressByCourse.get(cid) ?? [];

    if (totalItems > 0) {
      const completedCount = progRows.filter(r => r.completed).length;
      if (completedCount >= totalItems) {
        completedCourses++;
      } else if (progRows.some(r => r.unique_watched_seconds > 0)) {
        startedCourses++;
      } else {
        notStartedCourses++;
      }
    } else {
      notStartedCourses++;
    }
  }

  return {
    totalHoursWatched,
    totalWatchSeconds,
    totalLecturesWatched: totalLecturesStarted,
    totalAvailableLectures,
    totalAvailableCourses,
    startedCourses,
    completedCourses,
    notStartedCourses,
    averageCompletionPercentage,
  };
}

export class StudentVideoAnalyticsService {
  static async getOverview(
    studentId: string,
    options?: { courseId?: string; pillarId?: string; isGlobal?: boolean; collegeId?: string | null }
  ): Promise<StudentAnalyticsOverview> {
    if (options?.courseId || options?.pillarId) {
      return computeOverview(studentId, options);
    }
    const weekStart = getWeekStartString();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      options?.collegeId ?? null,
      options?.isGlobal ?? true,
      weekStart,
      currentMonth
    );
    return payload.overview;
  }

  static async getModuleAnalytics(
    studentId: string,
    courseId: string,
    options?: { isGlobal?: boolean; collegeId?: string | null }
  ): Promise<ModuleAnalyticsDetail[]> {
    const sb = createAdminClient();

    const accessibleCourses = await getStudentAccessibleCourses(studentId, {
      isGlobal: options?.isGlobal ?? true,
      collegeId: options?.collegeId ?? null,
    });
    const want = normUuid(courseId);
    if (!accessibleCourses.some(c => normUuid(c.master_course_id) === want)) {
      return [];
    }

    const { data: modules } = await sb
      .from('master_course_modules')
      .select('id, title, sort_order')
      .eq('master_course_id', courseId)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true });

    if (!modules || modules.length === 0) return [];

    const { data: items } = await sb
      .from('master_course_items')
      .select('id, module_id, title, sort_order')
      .eq('master_course_id', courseId)
      .eq('publish_status', 'published')
      .eq('item_type', 'video')
      .order('sort_order', { ascending: true });

    const itemIds = (items ?? []).map(i => i.id);
    const progressRows = await selectProgressForStudent(sb, studentId, itemIds);

    const progressMap = new Map(progressRows.map(p => {
      const uniqueSec = Number(p.watched_seconds || 0);
      const totalWatchedSec = Number(p.total_watched_seconds || 0);
      const totalSec = Number(p.total_seconds || 0);
      const completionPercentage = totalSec > 0 ? Math.min(100, Math.round((uniqueSec / totalSec) * 100)) : 0;
      const completed = p.completed || completionPercentage >= 66;

      return [
        normUuid(p.item_id),
        {
          lesson_id: p.item_id,
          video_duration_seconds: totalSec,
          total_video_seconds_watched: totalWatchedSec,
          unique_watched_seconds: uniqueSec,
          completion_percentage: completionPercentage,
          completed,
          last_watched_at: p.updated_at
        }
      ];
    }));

    const result: ModuleAnalyticsDetail[] = [];

    for (const mod of modules) {
      const modItems = (items ?? []).filter(i => normUuid(i.module_id) === normUuid(mod.id));
      if (modItems.length === 0) continue;

      let watchedCount = 0;
      let completedCount = 0;
      let totalSecSum = 0;

      const videos: VideoAnalyticsDetail[] = modItems.map(item => {
        const prog = progressMap.get(normUuid(item.id));
        const uniqueSec = Number(prog?.unique_watched_seconds || 0);
        const totalWatchedSec = Number(prog?.total_video_seconds_watched || 0);
        const isCompleted = prog?.completed ?? false;

        if (uniqueSec > 0) watchedCount++;
        if (isCompleted) completedCount++;
        totalSecSum += totalWatchedSec;

        return {
          videoId: item.id,
          videoTitle: item.title,
          duration: Number(prog?.video_duration_seconds || 0),
          uniqueWatchedSeconds: uniqueSec,
          totalVideoSecondsWatched: totalWatchedSec,
          completionPercentage: Number(prog?.completion_percentage || 0),
          completed: isCompleted,
          lastWatchedAt: prog?.last_watched_at
            ? new Date(prog.last_watched_at).toISOString()
            : new Date(0).toISOString(),
        };
      });

      result.push({
        moduleId: mod.id,
        moduleTitle: mod.title,
        totalVideosInModule: videos.length,
        watchedVideosCount: watchedCount,
        completedVideosCount: completedCount,
        totalHoursWatchedInModule: Number((totalSecSum / 3600).toFixed(2)),
        videos,
      });
    }

    return result;
  }

  static async getDailyAnalytics(
    studentId: string,
    weekStartString: string,
    options?: { courseId?: string; pillarId?: string; isGlobal?: boolean; collegeId?: string | null }
  ): Promise<DailyAnalyticsRow[]> {
    if (options?.courseId || options?.pillarId) {
      return this.getDailyAnalyticsFallback(studentId, weekStartString, options);
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      options?.collegeId ?? null,
      options?.isGlobal ?? true,
      weekStartString,
      currentMonth
    );
    return payload.daily_analytics;
  }

  static async getDailyAnalyticsFallback(
    studentId: string,
    weekStartString: string,
    options?: { courseId?: string; pillarId?: string; isGlobal?: boolean; collegeId?: string | null }
  ): Promise<DailyAnalyticsRow[]> {
    const sb = createAdminClient();

    const accessibleCourses = await getStudentAccessibleCourses(studentId, {
      isGlobal: options?.isGlobal ?? true,
      collegeId: options?.collegeId ?? null,
    });
    let validCourses = accessibleCourses;
    if (options?.courseId) {
      const want = normUuid(options.courseId);
      validCourses = validCourses.filter(c => normUuid(c.master_course_id) === want);
    }
    if (options?.pillarId) {
      const want = normUuid(options.pillarId);
      validCourses = validCourses.filter(
        c => c.master_course && normUuid(c.master_course.pillar_id) === want
      );
    }
    const validCourseIds = new Set(validCourses.map(c => normUuid(c.master_course_id)));

    if (validCourseIds.size === 0) {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(`${weekStartString}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + i);
        return {
          date: d.toISOString().split('T')[0],
          watchedHours: 0,
          lecturesWatched: 0,
          completedLectures: 0,
        };
      });
    }

    const { data: allItems } = await sb
      .from('master_course_items')
      .select('id')
      .in('master_course_id', Array.from(validCourseIds));
    const validItemIds = new Set(allItems?.map(i => normUuid(i.id)) ?? []);

    const startDate = new Date(`${weekStartString}T00:00:00Z`);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const sessions = await selectSessionsForStudentInRange(sb, studentId, startDate, endDate);
    const filteredSessions = (sessions ?? []).filter(s => s.item_id && validItemIds.has(normUuid(s.item_id)));

    const { data: segmentsData } = await sb
      .from('video_watch_segments')
      .select('created_at, start_second, end_second, lesson_id, session_id')
      .eq('student_id', studentId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());
    const filteredSegments = (segmentsData ?? []).filter(s => s.lesson_id && validItemIds.has(normUuid(s.lesson_id)));

    const { data: allStudentSegs } = await sb
      .from('video_watch_segments')
      .select('session_id')
      .eq('student_id', studentId);
    const sessionIdsWithSegments = new Set((allStudentSegs ?? []).flatMap(s => s.session_id ? [s.session_id] : []));

    const progressActivity = await selectProgressForStudentUpdatedInRange(sb, studentId, startDate, endDate);
    const filteredProgress = (progressActivity ?? []).filter(p => p.item_id && validItemIds.has(normUuid(p.item_id)));

    const result: DailyAnalyticsRow[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = currentDay.toISOString().split('T')[0];
      const nextDay = new Date(currentDay.getTime() + 24 * 60 * 60 * 1000);

      // Sessions created on this day that do not have segments in the database (legacy)
      const dayNonSegSessions = filteredSessions.filter(s => {
        if (!s.created_at || !s.id) return false;
        if (sessionIdsWithSegments.has(s.id)) return false;
        const sDate = new Date(s.created_at);
        return sDate >= currentDay && sDate < nextDay;
      });

      // Segments created on this day
      const daySegments = filteredSegments.filter(s => {
        if (!s.created_at) return false;
        const sDate = new Date(s.created_at);
        return sDate >= currentDay && sDate < nextDay;
      });

      const dayProgress = filteredProgress.filter(p => {
        if (!p.updated_at) return false;
        const touchDate = new Date(p.updated_at);
        return touchDate >= currentDay && touchDate < nextDay;
      });

      const dayCompleted = filteredProgress.filter(p => {
        if (!p.completed) return false;
        if (!p.updated_at) return false;
        const cDate = new Date(p.updated_at);
        return cDate >= currentDay && cDate < nextDay;
      });

      const sessionSeconds = dayNonSegSessions.reduce(
        (acc, s) => acc + Number(s.watched_duration_seconds || 0),
        0,
      );
      const segmentSeconds = daySegments.reduce(
        (acc, s) => acc + Math.max(0, Number(s.end_second) - Number(s.start_second)),
        0,
      );
      const watchedSeconds = segmentSeconds + sessionSeconds;

      const distinctFromSessions = dayNonSegSessions.reduce((acc: string[], s) => {
        if (Number(s.watched_duration_seconds || 0) > 0 && s.item_id) acc.push(s.item_id);
        return acc;
      }, []);
      const distinctFromSegments = daySegments.reduce((acc: string[], s) => {
        const duration = Math.max(0, Number(s.end_second) - Number(s.start_second));
        if (duration > 0 && s.lesson_id) acc.push(s.lesson_id);
        return acc;
      }, []);
      const distinctFromProgress = dayProgress.flatMap(p => p.item_id ? [p.item_id] : []);

      const distinctLessonsWatched = new Set([
        ...distinctFromSessions,
        ...distinctFromSegments,
        ...distinctFromProgress
      ]).size;

      const distinctLessonsCompleted = new Set(dayCompleted.flatMap(p => p.item_id ? [p.item_id] : [])).size;

      result.push({
        date: dateStr,
        watchedHours: Number((watchedSeconds / 3600).toFixed(2)),
        lecturesWatched: distinctLessonsWatched,
        completedLectures: distinctLessonsCompleted,
      });
    }

    return result;
  }

  static async getWeeklyAnalytics(
    studentId: string,
    monthString: string,
    options: { courseId?: string; pillarId?: string; isGlobal?: boolean; collegeId?: string | null } = {}
  ): Promise<WeeklyAnalyticsRow[]> {
    if (options?.courseId || options?.pillarId) {
      return this.getWeeklyAnalyticsFallback(studentId, monthString, options);
    }
    const weekStart = getWeekStartString();
    const payload = await getSharedAnalyticsPayload(
      studentId,
      options?.collegeId ?? null,
      options?.isGlobal ?? true,
      weekStart,
      monthString
    );
    return payload.weekly_analytics;
  }

  static async getWeeklyAnalyticsFallback(
    studentId: string,
    monthString: string,
    options: { courseId?: string; pillarId?: string; isGlobal?: boolean; collegeId?: string | null } = {}
  ): Promise<WeeklyAnalyticsRow[]> {
    const sb = createAdminClient();

    const accessibleCourses = await getStudentAccessibleCourses(studentId, {
      isGlobal: options.isGlobal ?? true,
      collegeId: options.collegeId ?? null,
    });
    let validCourses = accessibleCourses;
    if (options.courseId) {
      const want = normUuid(options.courseId);
      validCourses = validCourses.filter(c => normUuid(c.master_course_id) === want);
    }
    if (options.pillarId) {
      const want = normUuid(options.pillarId);
      validCourses = validCourses.filter(
        c => c.master_course && normUuid(c.master_course.pillar_id) === want
      );
    }
    const validCourseIds = new Set(validCourses.map(c => normUuid(c.master_course_id)));

    const [year, month] = monthString.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const totalDaysInMonth = Math.round(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const numWeeks = Math.ceil(totalDaysInMonth / 7);

    if (validCourseIds.size === 0) {
      return Array.from({ length: numWeeks }, (_, i) => {
        const wStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        const wEnd = new Date(
          Math.min(endDate.getTime(), wStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        );
        return {
          weekStart: wStart.toISOString().split('T')[0],
          weekEnd: new Date(wEnd.getTime() - 1).toISOString().split('T')[0],
          watchedHours: 0,
          lecturesWatched: 0,
          completedLectures: 0,
        };
      });
    }

    const { data: allItems } = await sb
      .from('master_course_items')
      .select('id')
      .in('master_course_id', Array.from(validCourseIds));
    const validItemIds = new Set(allItems?.map(i => normUuid(i.id)) ?? []);

    const sessions = await selectSessionsForStudentInRange(sb, studentId, startDate, endDate);
    const filteredSessions = (sessions ?? []).filter(s => s.item_id && validItemIds.has(normUuid(s.item_id)));

    const { data: segmentsData } = await sb
      .from('video_watch_segments')
      .select('created_at, start_second, end_second, lesson_id, session_id')
      .eq('student_id', studentId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());
    const filteredSegments = (segmentsData ?? []).filter(s => s.lesson_id && validItemIds.has(normUuid(s.lesson_id)));

    const { data: allStudentSegs } = await sb
      .from('video_watch_segments')
      .select('session_id')
      .eq('student_id', studentId);
    const sessionIdsWithSegments = new Set((allStudentSegs ?? []).flatMap(s => s.session_id ? [s.session_id] : []));

    const completedProgress = await selectProgressForStudentUpdatedInRange(sb, studentId, startDate, endDate);
    const filteredCompleted = completedProgress.reduce((acc: typeof completedProgress, p) => {
      if (p.completed === true && p.item_id && validItemIds.has(normUuid(p.item_id))) acc.push(p);
      return acc;
    }, []);

    const result: WeeklyAnalyticsRow[] = [];

    for (let i = 0; i < numWeeks; i++) {
      const wStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(
        Math.min(endDate.getTime(), wStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      );

      const weekNonSegSessions = filteredSessions.filter(s => {
        if (!s.created_at || !s.id) return false;
        if (sessionIdsWithSegments.has(s.id)) return false;
        const sDate = new Date(s.created_at);
        return sDate >= wStart && sDate < wEnd;
      });

      const weekSegments = filteredSegments.filter(s => {
        if (!s.created_at) return false;
        const sDate = new Date(s.created_at);
        return sDate >= wStart && sDate < wEnd;
      });

      const weekCompleted = filteredCompleted.filter(p => {
        if (!p.updated_at) return false;
        const cDate = new Date(p.updated_at);
        return cDate >= wStart && cDate < wEnd;
      });

      const sessionSeconds = weekNonSegSessions.reduce(
        (acc, s) => acc + Number(s.watched_duration_seconds || 0),
        0,
      );
      const segmentSeconds = weekSegments.reduce(
        (acc, s) => acc + Math.max(0, Number(s.end_second) - Number(s.start_second)),
        0,
      );
      const watchedSeconds = segmentSeconds + sessionSeconds;

      const distinctLessonsWatchedIds = [
        ...weekNonSegSessions.map(s => s.item_id),
        ...weekSegments.map(s => s.lesson_id)
      ].filter(Boolean) as string[];
      const distinctLessonsWatched = new Set(distinctLessonsWatchedIds).size;
      const distinctLessonsCompleted = new Set(weekCompleted.flatMap(p => p.item_id ? [p.item_id] : [])).size;

      result.push({
        weekStart: wStart.toISOString().split('T')[0],
        weekEnd: new Date(wEnd.getTime() - 1).toISOString().split('T')[0],
        watchedHours: Number((watchedSeconds / 3600).toFixed(2)),
        lecturesWatched: distinctLessonsWatched,
        completedLectures: distinctLessonsCompleted,
      });
    }

    return result;
  }

  static async getPieChartData(
    studentId: string,
    options?: { pillarId?: string; isGlobal?: boolean; collegeId?: string | null }
  ): Promise<CoursePieChartData> {
    if (options?.pillarId) {
      const overview = await this.getOverview(studentId, options);
      return {
        totalAvailableCourses: overview.totalAvailableCourses,
        notStartedCourses: overview.notStartedCourses,
        startedCourses: overview.startedCourses,
        completedCourses: overview.completedCourses,
      };
    }
    const weekStart = getWeekStartString();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      options?.collegeId ?? null,
      options?.isGlobal ?? true,
      weekStart,
      currentMonth
    );
    return payload.pie_chart;
  }

  static async getAccessibleCourseList(
    studentId: string,
    options?: { isGlobal?: boolean; collegeId?: string | null }
  ): Promise<{ id: string; title: string }[]> {
    const weekStart = getWeekStartString();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      options?.collegeId ?? null,
      options?.isGlobal ?? true,
      weekStart,
      currentMonth
    );
    return payload.available_courses;
  }

  static async getTimeOfDayAnalytics(
    studentId: string,
    options?: { isGlobal?: boolean; collegeId?: string | null; days?: number }
  ): Promise<TimeOfDayAnalytics> {
    if (options?.days !== undefined && options.days !== 90) {
      return this.getTimeOfDayAnalyticsFallback(studentId, options);
    }
    const weekStart = getWeekStartString();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payload = await getSharedAnalyticsPayload(
      studentId,
      options?.collegeId ?? null,
      options?.isGlobal ?? true,
      weekStart,
      currentMonth
    );
    return payload.time_of_day;
  }

  static async getTimeOfDayAnalyticsFallback(
    studentId: string,
    options?: { isGlobal?: boolean; collegeId?: string | null; days?: number }
  ): Promise<TimeOfDayAnalytics> {
    const sb = createAdminClient();
    const days = options?.days ?? 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await sb
      .from(sessionsTable())
      .select('created_at, total_video_seconds_watched')
      .eq('student_id', studentId)
      .gte('created_at', startDate.toISOString())
      .gt('total_video_seconds_watched', 0);

    const rows = (result.data as unknown as Record<string, unknown>[] | null) ?? [];

    const hourBuckets = new Array(24).fill(0) as number[];
    const dayOfWeekBuckets = new Array(7).fill(0) as number[];
    let totalSeconds = 0;

    for (const row of rows) {
      const createdAt = row.created_at as string | null;
      const watchedSec = Number(row.total_video_seconds_watched || 0);
      if (!createdAt || watchedSec <= 0) continue;

      const date = new Date(createdAt);
      const hour = date.getUTCHours();
      const dayOfWeek = date.getUTCDay();

      hourBuckets[hour] += watchedSec;
      dayOfWeekBuckets[dayOfWeek] += watchedSec;
      totalSeconds += watchedSec;
    }

    const hourly = hourBuckets.map((seconds, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      seconds,
      hours: Number((seconds / 3600).toFixed(2)),
    }));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyBreakdown = dayOfWeekBuckets.map((seconds, dayIndex) => ({
      day: dayNames[dayIndex],
      dayIndex,
      seconds,
      hours: Number((seconds / 3600).toFixed(2)),
    }));

    const peakHour = hourly.reduce((max, curr) => (curr.seconds > max.seconds ? curr : max), hourly[0]);
    const peakDay = dailyBreakdown.reduce((max, curr) => (curr.seconds > max.seconds ? curr : max), dailyBreakdown[0]);

    const morningSeconds = hourBuckets.slice(5, 12).reduce((a, b) => a + b, 0);
    const afternoonSeconds = hourBuckets.slice(12, 17).reduce((a, b) => a + b, 0);
    const eveningSeconds = hourBuckets.slice(17, 21).reduce((a, b) => a + b, 0);
    const nightSeconds = hourBuckets.slice(21, 24).reduce((a, b) => a + b, 0) + hourBuckets.slice(0, 5).reduce((a, b) => a + b, 0);

    const periods = [
      { name: 'Morning', range: '5 AM – 12 PM', seconds: morningSeconds, hours: Number((morningSeconds / 3600).toFixed(1)) },
      { name: 'Afternoon', range: '12 PM – 5 PM', seconds: afternoonSeconds, hours: Number((afternoonSeconds / 3600).toFixed(1)) },
      { name: 'Evening', range: '5 PM – 9 PM', seconds: eveningSeconds, hours: Number((eveningSeconds / 3600).toFixed(1)) },
      { name: 'Night', range: '9 PM – 5 AM', seconds: nightSeconds, hours: Number((nightSeconds / 3600).toFixed(1)) },
    ];

    const dominantPeriod = periods.reduce((max, curr) => (curr.seconds > max.seconds ? curr : max), periods[0]);

    return {
      hourly,
      dailyBreakdown,
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(1)),
      peakHour: { hour: peakHour.hour, label: peakHour.label, hours: peakHour.hours },
      peakDay: { day: peakDay.day, hours: peakDay.hours },
      periods,
      dominantPeriod: { name: dominantPeriod.name, range: dominantPeriod.range, hours: dominantPeriod.hours },
    };
  }

  static async getCustomRangeAnalytics(
    studentId: string,
    startDate: string,
    endDate: string,
    options?: { courseId?: string; pillarId?: string; isGlobal?: boolean; collegeId?: string | null }
  ): Promise<CustomRangeAnalytics> {
    const sb = createAdminClient();

    const accessibleCourses = await getStudentAccessibleCourses(studentId, {
      isGlobal: options?.isGlobal ?? true,
      collegeId: options?.collegeId ?? null,
    });
    let validCourses = accessibleCourses;
    if (options?.courseId) {
      const want = normUuid(options.courseId);
      validCourses = validCourses.filter(c => normUuid(c.master_course_id) === want);
    }
    const validCourseIds = new Set(validCourses.map(c => normUuid(c.master_course_id)));

    if (validCourseIds.size === 0) {
      return {
        totalHoursWatched: 0,
        totalLecturesWatched: 0,
        totalLecturesCompleted: 0,
        daysActive: 0,
        averageHoursPerDay: 0,
        dailyData: [],
      };
    }

    const { data: allItems } = await sb
      .from('master_course_items')
      .select('id')
      .in('master_course_id', Array.from(validCourseIds));
    const validItemIds = new Set(allItems?.map(i => normUuid(i.id)) ?? []);

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);

    const sessions = await selectSessionsForStudentInRange(sb, studentId, start, end);
    const filteredSessions = sessions.filter(s => s.item_id && validItemIds.has(normUuid(s.item_id)));

    const progressActivity = await selectProgressForStudentUpdatedInRange(sb, studentId, start, end);
    const filteredProgress = progressActivity.filter(p => p.item_id && validItemIds.has(normUuid(p.item_id)));

    const dayMap = new Map<string, { seconds: number; lectures: Set<string>; completed: Set<string> }>();

    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / dayMs);

    for (let i = 0; i < totalDays; i++) {
      const currentDay = new Date(start.getTime() + i * dayMs);
      const dateStr = currentDay.toISOString().split('T')[0];
      dayMap.set(dateStr, { seconds: 0, lectures: new Set(), completed: new Set() });
    }

    for (const s of filteredSessions) {
      if (!s.created_at) continue;
      const dateStr = new Date(s.created_at).toISOString().split('T')[0];
      const entry = dayMap.get(dateStr);
      if (entry) {
        entry.seconds += Number(s.watched_duration_seconds || 0);
        if (s.item_id) entry.lectures.add(normUuid(s.item_id));
      }
    }

    for (const p of filteredProgress) {
      if (!p.updated_at) continue;
      const dateStr = new Date(p.updated_at).toISOString().split('T')[0];
      const entry = dayMap.get(dateStr);
      if (entry) {
        if (p.item_id) entry.lectures.add(normUuid(p.item_id));
        if (p.completed && p.item_id) entry.completed.add(normUuid(p.item_id));
      }
    }

    let totalSeconds = 0;
    let totalLectures = 0;
    let totalCompleted = 0;
    let daysActive = 0;

    const dailyData: { date: string; hours: number; lectures: number; completed: number }[] = [];

    for (const [date, data] of dayMap) {
      const hours = Number((data.seconds / 3600).toFixed(2));
      const lectures = data.lectures.size;
      const completed = data.completed.size;
      totalSeconds += data.seconds;
      totalLectures += lectures;
      totalCompleted += completed;
      if (data.seconds > 0) daysActive++;
      dailyData.push({ date, hours, lectures, completed });
    }

    const totalDaysInRange = Math.max(daysActive, 1);

    return {
      totalHoursWatched: Number((totalSeconds / 3600).toFixed(1)),
      totalLecturesWatched: totalLectures,
      totalLecturesCompleted: totalCompleted,
      daysActive,
      averageHoursPerDay: Number((totalSeconds / 3600 / totalDaysInRange).toFixed(1)),
      dailyData,
    };
  }

  // ── Heatmap: 16 weeks of daily watch activity ──

  static async getHeatmapData(
    studentId: string,
    _weeks: number = 16,
    options?: { isGlobal?: boolean; collegeId?: string | null }
  ): Promise<HeatmapData> {
    const sb = createAdminClient();
    const endDate = new Date();
    
    // Parallelize: earliest session + accessible courses (independent queries)
    const [{ data: earliestSession }, accessibleCourses] = await Promise.all([
      sb
        .from(sessionsTable())
        .select('created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })
        .limit(1),
      getStudentAccessibleCourses(studentId, {
        isGlobal: options?.isGlobal ?? true,
        collegeId: options?.collegeId ?? null,
      }),
    ]);

    let startDate = new Date();
    // Default to at least 16 days ago if they have no sessions yet to avoid empty graph
    startDate.setDate(endDate.getDate() - 16);

    if (earliestSession && earliestSession.length > 0 && earliestSession[0].created_at) {
      const dbStartDate = new Date(earliestSession[0].created_at);
      if (dbStartDate < endDate) {
        startDate = dbStartDate;
      }
    }

    const validCourseIds = new Set(accessibleCourses.map(c => normUuid(c.master_course_id)));

    if (validCourseIds.size === 0) {
      return { days: [], totalHours: 0, activeDays: 0, rangeText: '0 days' };
    }

    const { data: allItems } = await sb
      .from('master_course_items')
      .select('id')
      .in('master_course_id', Array.from(validCourseIds));
    const validItemIds = new Set(allItems?.map(i => normUuid(i.id)) ?? []);

    const sessions = await selectSessionsForStudentInRange(sb, studentId, startDate, endDate);
    const filteredSessions = sessions.filter(s => s.item_id && validItemIds.has(normUuid(s.item_id)));

    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs));
    const dayMap = new Map<string, number>();

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate.getTime() + i * dayMs);
      dayMap.set(d.toISOString().split('T')[0], 0);
    }

    for (const s of filteredSessions) {
      if (!s.created_at) continue;
      const dateStr = new Date(s.created_at).toISOString().split('T')[0];
      const existing = dayMap.get(dateStr);
      if (existing !== undefined) {
        dayMap.set(dateStr, existing + Number(s.unique_watched_seconds || s.watched_duration_seconds || 0));
      }
    }

    let totalSeconds = 0;
    let activeDays = 0;
    const days: HeatmapDay[] = [];

    for (const [date, seconds] of dayMap) {
      const hours = Number((seconds / 3600).toFixed(2));
      totalSeconds += seconds;
      if (seconds > 0) activeDays++;
      days.push({ date, hours, seconds });
    }

    let rangeText = '';
    if (totalDays <= 14) {
      rangeText = `${totalDays} days`;
    } else {
      const computedWeeks = Math.ceil(totalDays / 7);
      rangeText = `${computedWeeks} weeks`;
    }

    return {
      days,
      totalHours: Number((totalSeconds / 3600).toFixed(1)),
      activeDays,
      rangeText,
    };
  }

  // ── Recent Activity: last N video progress entries ──

  static async getRecentActivity(
    studentId: string,
    limit: number = 10,
    options?: { isGlobal?: boolean; collegeId?: string | null }
  ): Promise<RecentActivityItem[]> {
    const sb = createAdminClient();

    const accessibleCourses = await getStudentAccessibleCourses(studentId, {
      isGlobal: options?.isGlobal ?? true,
      collegeId: options?.collegeId ?? null,
    });
    const courseIdToTitle = new Map<string, string>();
    for (const c of accessibleCourses) {
      courseIdToTitle.set(normUuid(c.master_course_id), c.master_course?.title ?? 'Course');
    }

    const { data: progressRows } = await sb
      .from(progressTable())
      .select('lesson_id, course_id, module_id, unique_watched_seconds, video_duration_seconds, completed, last_watched_at, completion_percentage')
      .eq('student_id', studentId)
      .gt('unique_watched_seconds', 0)
      .order('last_watched_at', { ascending: false })
      .limit(limit * 2);

    if (!progressRows || progressRows.length === 0) return [];

    const lessonIds = [...new Set(progressRows.flatMap((row) => row.lesson_id ? [row.lesson_id] : []))];
    const lessonTitleMap = new Map<string, string>();
    if (lessonIds.length > 0) {
      const { data: lessons } = await sb
        .from('master_course_items')
        .select('id, title')
        .in('id', lessonIds);
      if (lessons) {
        for (const l of lessons) {
          lessonTitleMap.set(l.id, l.title);
        }
      }
    }

    const seen = new Set<string>();
    const items: RecentActivityItem[] = [];

    for (const row of progressRows) {
      const lessonId = row.lesson_id;
      if (!lessonId || seen.has(lessonId)) continue;
      seen.add(lessonId);

      const courseId = row.course_id ? normUuid(row.course_id) : '';
      const completionPct = Number(row.video_duration_seconds) > 0
        ? Math.min(100, Math.round((Number(row.unique_watched_seconds) / Number(row.video_duration_seconds)) * 100))
        : 0;
      const isCompleted = row.completed || completionPct >= 66;

      items.push({
        lessonId,
        lessonTitle: lessonTitleMap.get(lessonId) ?? 'Untitled',
        courseTitle: courseIdToTitle.get(courseId) ?? 'Course',
        watchSeconds: Number(row.unique_watched_seconds || 0),
        durationSeconds: Number(row.video_duration_seconds || 0),
        completionPercentage: completionPct,
        completed: isCompleted,
        lastWatchedAt: row.last_watched_at,
      });

      if (items.length >= limit) break;
    }

    return items;
  }

  // ── Video Watch History: all videos with watch data ──

  static async getVideoWatchHistory(
    studentId: string,
    options?: { isGlobal?: boolean; collegeId?: string | null }
  ): Promise<VideoWatchHistoryItem[]> {
    const sb = createAdminClient();

    const accessibleCourses = await getStudentAccessibleCourses(studentId, {
      isGlobal: options?.isGlobal ?? true,
      collegeId: options?.collegeId ?? null,
    });
    const courseIdToTitle = new Map<string, string>();
    for (const c of accessibleCourses) {
      courseIdToTitle.set(normUuid(c.master_course_id), c.master_course?.title ?? 'Course');
    }

    const { data: progressRows } = await sb
      .from(progressTable())
      .select('lesson_id, course_id, unique_watched_seconds, video_duration_seconds, completed, last_watched_at, completion_percentage')
      .eq('student_id', studentId)
      .order('last_watched_at', { ascending: false });

    if (!progressRows || progressRows.length === 0) return [];

    const lessonIds = [...new Set(progressRows.flatMap((row) => row.lesson_id ? [row.lesson_id] : []))];
    const lessonTitleMap = new Map<string, string>();
    if (lessonIds.length > 0) {
      const { data: lessons } = await sb
        .from('master_course_items')
        .select('id, title')
        .in('id', lessonIds);
      if (lessons) {
        for (const l of lessons) {
          lessonTitleMap.set(l.id, l.title);
        }
      }
    }

    const items: VideoWatchHistoryItem[] = [];
    const seen = new Set<string>();

    for (const row of progressRows) {
      const lessonId = row.lesson_id;
      if (!lessonId || seen.has(lessonId)) continue;
      seen.add(lessonId);

      const courseId = row.course_id ? normUuid(row.course_id) : '';
      const durationSec = Number(row.video_duration_seconds || 0);
      const watchedSec = Number(row.unique_watched_seconds || 0);
      const completionPct = durationSec > 0 ? Math.min(100, Math.round((watchedSec / durationSec) * 100)) : 0;
      const isCompleted = row.completed || completionPct >= 66;

      items.push({
        lessonId,
        lessonTitle: lessonTitleMap.get(lessonId) ?? 'Untitled',
        courseTitle: courseIdToTitle.get(courseId) ?? 'Course',
        durationSeconds: durationSec,
        watchedSeconds: watchedSec,
        completionPercentage: completionPct,
        completed: isCompleted,
        lastWatchedAt: row.last_watched_at,
      });
    }

    return items;
  }
}

// ── New types for heatmap, recent activity, video history ──

export interface HeatmapDay {
  date: string;
  hours: number;
  seconds: number;
}

export interface HeatmapData {
  days: HeatmapDay[];
  totalHours: number;
  activeDays: number;
  rangeText?: string;
}

export interface RecentActivityItem {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  watchSeconds: number;
  durationSeconds: number;
  completionPercentage: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface VideoWatchHistoryItem {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  durationSeconds: number;
  watchedSeconds: number;
  completionPercentage: number;
  completed: boolean;
  lastWatchedAt: string;
}

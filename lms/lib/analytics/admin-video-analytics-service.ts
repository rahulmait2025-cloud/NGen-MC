import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { normUuid } from '@/lib/utils';
import { resolveCollegeAssignedCourseIds } from '@/lib/services/course-access-manager';
import type {
  DailyAnalyticsRow,
  WeeklyAnalyticsRow,
  CoursePieChartData,
} from './student-video-analytics-service';

/**
 * Source-of-truth table selection (mirrors student-video-analytics-service).
 */
function progressTable(): 'student_video_progress' {
  return 'student_video_progress';
}
function sessionsTable(): 'video_watch_sessions' {
  return 'video_watch_sessions';
}
function progressSelectColumns(): string {
  return 'student_id, lesson_id as item_id, unique_watched_seconds as watched_seconds, video_duration_seconds as total_seconds, completed, last_watched_at as updated_at, completed_at';
}
function sessionsSelectColumns(): string {
  return 'created_at, total_video_seconds_watched as watched_duration_seconds, lesson_id as item_id, student_id';
}

interface AdminProgressRow {
  student_id: string | null;
  item_id: string | null;
  watched_seconds: number | null;
  total_seconds: number | null;
  completed: boolean | null;
  updated_at: string | null;
  completed_at: string | null;
}

interface AdminSessionRow {
  created_at: string | null;
  watched_duration_seconds: number | null;
  item_id: string | null;
  student_id: string | null;
}

async function selectAdminProgress(sb: ReturnType<typeof createAdminClient>, studentIds: string[]): Promise<AdminProgressRow[]> {
  if (studentIds.length === 0) return [];
  const result = await sb
    .from(progressTable())
    .select(progressSelectColumns())
    .in('student_id', studentIds);
  return (result.data as unknown as AdminProgressRow[] | null) ?? [];
}

async function selectAdminSessionsInRange(
  sb: ReturnType<typeof createAdminClient>,
  studentIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<AdminSessionRow[]> {
  if (studentIds.length === 0) return [];
  const result = await sb
    .from(sessionsTable())
    .select(sessionsSelectColumns())
    .in('student_id', studentIds)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString());
  return (result.data as unknown as AdminSessionRow[] | null) ?? [];
}

async function selectAdminProgressInRange(
  sb: ReturnType<typeof createAdminClient>,
  studentIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<AdminProgressRow[]> {
  if (studentIds.length === 0) return [];
  const result = await sb
    .from(progressTable())
    .select(progressSelectColumns())
    .in('student_id', studentIds)
    .gte('last_watched_at', startDate.toISOString())
    .lt('last_watched_at', endDate.toISOString());
  return (result.data as unknown as AdminProgressRow[] | null) ?? [];
}

export interface AdminAnalyticsOverview {
  totalStudents: number;
  totalHoursWatched: number;
  totalLecturesWatched: number;
  averageCompletionPercentage: number;
  mostWatchedCourseTitle: string;
  leastWatchedCourseTitle: string;
}

export interface AdminCourseAnalyticsRow {
  courseId: string;
  courseTitle: string;
  totalAssignedStudents: number;
  activeWatchers: number;
  totalHoursWatched: number;
  lecturesWatched: number;
  averageCompletionPercentage: number;
}

export interface AdminModuleVideoRow {
  videoId: string;
  videoTitle: string;
  duration: number;
  totalWatchers: number;
  totalHoursWatched: number;
  averageCompletionPercentage: number;
}

export interface AdminModuleAnalyticsRow {
  moduleId: string;
  moduleTitle: string;
  totalVideos: number;
  watchedVideosCount: number;
  totalWatchedHours: number;
  averageCompletionPercentage: number;
  videos: AdminModuleVideoRow[];
}

interface MasterCourseModuleRaw {
  id: string;
  title: string;
  sort_order: number;
}

interface MasterCourseItemRaw {
  id: string;
  master_course_module_id: string;
  title: string;
  sort_order: number;
  video_assets?: {
    duration: number;
  } | null;
}

/**
 * Shared cached context for admin analytics service methods.
 * Pre-fetches all common data (student IDs, course IDs, course items, master courses)
 * in a single parallel batch. Cached per collegeId for 1 minute.
 *
 * Build Sets for O(1) lookup to avoid repeated `.includes()` / `.filter()` on arrays.
 */
async function getAnalyticsSharedContext(collegeId: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag(`analytics-context-${collegeId}`);

  const sb = createAdminClient();

  const [studentIds, courseIds, courseItemsResult, coursesResult] = await Promise.all([
    (async () => {
      const { data } = await sb.from('students').select('id').eq('college_id', collegeId);
      return (data ?? []).map(s => s.id as string);
    })(),
    resolveCollegeAssignedCourseIds(collegeId),
    sb.from('master_course_items')
      .select('id, master_course_id')
      .eq('publish_status', 'published'),
    sb.from('master_courses')
      .select('id, title'),
  ]);

  const studentIdSet = new Set(studentIds);
  const courseIdSet = new Set(courseIds.map(c => normUuid(c)));
  const itemToCourse = new Map<string, string>();
  const allItemIds: string[] = [];

  for (const item of courseItemsResult.data ?? []) {
    const normItem = normUuid(item.id);
    const normCourse = normUuid(item.master_course_id);
    itemToCourse.set(normItem, normCourse);
    if (courseIdSet.has(normCourse)) {
      allItemIds.push(item.id);
    }
  }

  const itemIdSet = new Set(allItemIds.map(id => normUuid(id)));
  const courseTitleMap = new Map<string, string>();
  for (const c of coursesResult.data ?? []) {
    courseTitleMap.set(normUuid(c.id), c.title || 'Untitled Course');
  }

  return {
    studentIds,
    studentIdSet,
    courseIds,
    courseIdSet,
    courseItems: courseItemsResult.data ?? [],
    allItemIds,
    itemIdSet,
    itemToCourse,
    courses: coursesResult.data ?? [],
    courseTitleMap,
  };
}

export class AdminVideoAnalyticsService {
  /**
   * Get high-level cohort overview metrics.
   */
  static async getOverview(collegeId: string): Promise<AdminAnalyticsOverview> {
    const context = await getAnalyticsSharedContext(collegeId);
    const { studentIds, courseIds, itemToCourse, allItemIds, courseTitleMap } = context;

    if (studentIds.length === 0) {
      return {
        totalStudents: 0,
        totalHoursWatched: 0,
        totalLecturesWatched: 0,
        averageCompletionPercentage: 0,
        mostWatchedCourseTitle: 'N/A',
        leastWatchedCourseTitle: 'N/A',
      };
    }

    if (courseIds.length === 0) {
      return {
        totalStudents: studentIds.length,
        totalHoursWatched: 0,
        totalLecturesWatched: 0,
        averageCompletionPercentage: 0,
        mostWatchedCourseTitle: 'N/A',
        leastWatchedCourseTitle: 'N/A',
      };
    }

    const itemIds = allItemIds;
    if (itemIds.length === 0) {
      return {
        totalStudents: studentIds.length,
        totalHoursWatched: 0,
        totalLecturesWatched: 0,
        averageCompletionPercentage: 0,
        mostWatchedCourseTitle: 'N/A',
        leastWatchedCourseTitle: 'N/A',
      };
    }

    // Fetch progress
    const sb = createAdminClient();
    const progressRows = await selectAdminProgress(sb, studentIds);
    const filteredProgress = progressRows.filter(p => p.item_id && context.itemIdSet.has(normUuid(p.item_id)));

    let totalWatchSec = 0;
    let completedLectures = 0;
    let sumCompPct = 0;
    const courseHoursMap = new Map<string, number>();
    for (const row of filteredProgress) {
      const itemId = normUuid(row.item_id);
      const cid = itemToCourse.get(itemId);
      if (!cid) continue;

      const sec = Number(row.watched_seconds || 0);
      const tot = Number(row.total_seconds || 0);
      const pct = tot > 0 ? Math.min(100, Math.round((sec / tot) * 100)) : 0;
      const completed = row.completed || pct >= 66;

      totalWatchSec += sec;
      sumCompPct += pct;
      if (completed) {
        completedLectures += 1;
      }

      courseHoursMap.set(cid, (courseHoursMap.get(cid) ?? 0) + (sec / 3600));
    }

    const avgComp = filteredProgress.length > 0 ? sumCompPct / filteredProgress.length : 0;
    const totalHours = Math.round((totalWatchSec / 3600) * 10) / 10;

    let mostWatchedTitle = 'N/A';
    let leastWatchedTitle = 'N/A';

    if (courseHoursMap.size > 0) {
      let maxHours = -1;
      let minHours = Infinity;
      let maxCid = '';
      let minCid = '';

      for (const [cid, hrs] of courseHoursMap.entries()) {
        if (hrs > maxHours) {
          maxHours = hrs;
          maxCid = cid;
        }
        if (hrs < minHours) {
          minHours = hrs;
          minCid = cid;
        }
      }

      if (maxCid && courseTitleMap.has(maxCid)) mostWatchedTitle = courseTitleMap.get(maxCid)!;
      if (minCid && courseTitleMap.has(minCid)) leastWatchedTitle = courseTitleMap.get(minCid)!;
    }

    return {
      totalStudents: studentIds.length,
      totalHoursWatched: totalHours,
      totalLecturesWatched: completedLectures,
      averageCompletionPercentage: Math.round(avgComp),
      mostWatchedCourseTitle: mostWatchedTitle,
      leastWatchedCourseTitle: leastWatchedTitle,
    };
  }

  /**
   * Get course-by-course analytics breakdown for the cohort.
   */
  static async getCourseWiseAnalytics(collegeId: string): Promise<AdminCourseAnalyticsRow[]> {
    const context = await getAnalyticsSharedContext(collegeId);
    const { studentIds, courseIds, itemToCourse, courseTitleMap } = context;

    if (studentIds.length === 0) return [];
    if (courseIds.length === 0) return [];

    const sb = createAdminClient();
    const itemIds = context.allItemIds;
    if (itemIds.length === 0) return [];

    // Fetch progress
    const progressRows = await selectAdminProgress(sb, studentIds);
    const filteredProgress = progressRows.filter(p => p.item_id && context.itemIdSet.has(normUuid(p.item_id)));

    interface CourseStats {
      activeSet: Set<string>;
      totalSeconds: number;
      completedCount: number;
      sumCompPct: number;
      rowCount: number;
    }

    const statsMap = new Map<string, CourseStats>();
    for (const cid of courseIds) {
      statsMap.set(normUuid(cid), {
        activeSet: new Set(),
        totalSeconds: 0,
        completedCount: 0,
        sumCompPct: 0,
        rowCount: 0,
      });
    }

    for (const row of filteredProgress) {
      const itemId = normUuid(row.item_id);
      const cid = itemToCourse.get(itemId);
      if (!cid) continue;

      const st = statsMap.get(cid);
      if (!st) continue;

      const sec = Number(row.watched_seconds || 0);
      const tot = Number(row.total_seconds || 0);
      const pct = tot > 0 ? Math.min(100, Math.round((sec / tot) * 100)) : 0;
      const completed = row.completed || pct >= 66;

      if (sec > 0 && row.student_id) {
        st.activeSet.add(row.student_id);
      }
      st.totalSeconds += sec;
      if (completed) {
        st.completedCount += 1;
      }
      st.sumCompPct += pct;
      st.rowCount += 1;
    }

    const rows: AdminCourseAnalyticsRow[] = [];
    for (const [cid, st] of statsMap.entries()) {
      rows.push({
        courseId: cid,
        courseTitle: courseTitleMap.get(cid) || 'Untitled Course',
        totalAssignedStudents: studentIds.length,
        activeWatchers: st.activeSet.size,
        totalHoursWatched: Math.round((st.totalSeconds / 3600) * 10) / 10,
        lecturesWatched: st.completedCount,
        averageCompletionPercentage: st.rowCount > 0 ? Math.round(st.sumCompPct / st.rowCount) : 0,
      });
    }

    return rows.sort((a, b) => b.totalHoursWatched - a.totalHoursWatched);
  }

  /**
   * Get module and video breakdown for a selected course.
   */
  static async getModuleAnalytics(collegeId: string, courseId: string): Promise<AdminModuleAnalyticsRow[]> {
    const context = await getAnalyticsSharedContext(collegeId);
    const { studentIds } = context;

    if (studentIds.length === 0 || !courseId) return [];

    const sb = createAdminClient();
    const normCourseId = normUuid(courseId);

    const [modulesRes, itemsRes, progressRows] = await Promise.all([
      sb.from('master_course_modules').select('id, title, sort_order').eq('master_course_id', normCourseId).order('sort_order'),
      sb.from('master_course_items').select('id, master_course_module_id, title, sort_order, video_assets(duration)').eq('master_course_id', normCourseId).eq('publish_status', 'published').order('sort_order'),
      selectAdminProgress(sb, studentIds),
    ]);

    const modules = (modulesRes.data ?? []) as unknown as MasterCourseModuleRaw[];
    const items = (itemsRes.data ?? []) as unknown as MasterCourseItemRaw[];

    const validItemIds = new Set(items.map(i => normUuid(i.id)));
    const filteredProgress = progressRows.filter(p => validItemIds.has(normUuid(p.item_id)));

    interface ItemAgg {
      watchersSet: Set<string>;
      totalSeconds: number;
      sumCompPct: number;
      rowCount: number;
    }

    const itemAggs = new Map<string, ItemAgg>();
    for (const item of items) {
      itemAggs.set(normUuid(item.id), {
        watchersSet: new Set(),
        totalSeconds: 0,
        sumCompPct: 0,
        rowCount: 0,
      });
    }

    for (const p of filteredProgress) {
      const iid = normUuid(p.item_id);
      const agg = itemAggs.get(iid);
      if (!agg) continue;

      const sec = Number(p.watched_seconds || 0);
      const tot = Number(p.total_seconds || 0);
      const pct = tot > 0 ? Math.min(100, Math.round((sec / tot) * 100)) : 0;

      if (sec > 0 && p.student_id) {
        agg.watchersSet.add(p.student_id);
      }
      agg.totalSeconds += sec;
      agg.sumCompPct += pct;
      agg.rowCount += 1;
    }

    const result: AdminModuleAnalyticsRow[] = [];

    for (const mod of modules) {
      const modItems = items.filter(i => normUuid(i.master_course_module_id) === normUuid(mod.id));
      if (modItems.length === 0) continue;

      let modWatchedVideos = 0;
      let modTotalSec = 0;
      let modSumComp = 0;
      let modRowCount = 0;
      const videos: AdminModuleVideoRow[] = [];

      for (const i of modItems) {
        const iid = normUuid(i.id);
        const agg = itemAggs.get(iid)!;

        const dur = i.video_assets?.duration ?? 0;
        const watchHrs = Math.round((agg.totalSeconds / 3600) * 100) / 100;
        const avgComp = agg.rowCount > 0 ? Math.round(agg.sumCompPct / agg.rowCount) : 0;

        if (agg.watchersSet.size > 0) {
          modWatchedVideos += 1;
        }
        modTotalSec += agg.totalSeconds;
        modSumComp += agg.sumCompPct;
        modRowCount += agg.rowCount;

        videos.push({
          videoId: iid,
          videoTitle: i.title,
          duration: dur,
          totalWatchers: agg.watchersSet.size,
          totalHoursWatched: watchHrs,
          averageCompletionPercentage: avgComp,
        });
      }

      const modHrs = Math.round((modTotalSec / 3600) * 10) / 10;
      const modAvgComp = modRowCount > 0 ? Math.round(modSumComp / modRowCount) : 0;

      result.push({
        moduleId: normUuid(mod.id),
        moduleTitle: mod.title,
        totalVideos: modItems.length,
        watchedVideosCount: modWatchedVideos,
        totalWatchedHours: modHrs,
        averageCompletionPercentage: modAvgComp,
        videos,
      });
    }

    return result;
  }

  /**
   * Get daily cohort analytics for a selected week.
   */
  static async getDailyAnalytics(collegeId: string, weekStartStr: string, courseId?: string): Promise<DailyAnalyticsRow[]> {
    const context = await getAnalyticsSharedContext(collegeId);
    const { studentIds } = context;

    if (studentIds.length === 0) return [];

    const sb = createAdminClient();
    const startDt = new Date(`${weekStartStr}T00:00:00Z`);
    const endDt = new Date(startDt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDt.getTime() + i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }

    let itemIds: string[] = [];
    if (courseId) {
      const { data: items } = await sb
        .from('master_course_items')
        .select('id')
        .eq('master_course_id', normUuid(courseId));
      itemIds = items?.map(i => i.id) ?? [];
    } else {
      itemIds = context.allItemIds;
    }

    if (itemIds.length === 0) {
      return dates.map(date => ({ date, watchedHours: 0, lecturesWatched: 0, completedLectures: 0 }));
    }

    // Query sessions and progress in parallel
    const [sessions, completedRows] = await Promise.all([
      selectAdminSessionsInRange(sb, studentIds, startDt, endDt),
      selectAdminProgressInRange(sb, studentIds, startDt, endDt),
    ]);
    const completed = completedRows.reduce((acc: typeof completedRows, r) => {
      if (r.completed === true && r.item_id && itemIds.includes(normUuid(r.item_id))) acc.push(r);
      return acc;
    }, []);

    const map = new Map<string, { hours: number; lecturesWatched: Set<string>; completed: Set<string> }>();
    for (const dt of dates) {
      map.set(dt, { hours: 0, lecturesWatched: new Set(), completed: new Set() });
    }

    for (const r of sessions) {
      if (!r.created_at) continue;
      const sDate = new Date(r.created_at);
      const dStr = sDate.toISOString().split('T')[0];
      if (map.has(dStr)) {
        const curr = map.get(dStr)!;
        curr.hours += Number(r.watched_duration_seconds || 0);
        if (Number(r.watched_duration_seconds || 0) > 0 && r.item_id) {
          curr.lecturesWatched.add(r.item_id);
        }
      }
    }

    for (const r of completed) {
      // Rich schema doesn't have completed_at; fall back to updated_at
      // (which is set every time progress changes including completion).
      const cDateStr = r.completed_at ?? r.updated_at;
      if (!cDateStr) continue;
      const cDate = new Date(cDateStr);
      const dStr = cDate.toISOString().split('T')[0];
      if (map.has(dStr)) {
        const curr = map.get(dStr)!;
        if (r.item_id) curr.completed.add(r.item_id);
      }
    }

    const result: DailyAnalyticsRow[] = [];
    for (const dt of dates) {
      const item = map.get(dt)!;
      result.push({
        date: dt,
        watchedHours: Number((item.hours / 3600).toFixed(2)),
        lecturesWatched: item.lecturesWatched.size,
        completedLectures: item.completed.size,
      });
    }

    return result;
  }

  /**
   * Get weekly cohort analytics for a selected month.
   */
  static async getWeeklyAnalytics(collegeId: string, monthStr: string, courseId?: string): Promise<WeeklyAnalyticsRow[]> {
    const context = await getAnalyticsSharedContext(collegeId);
    const { studentIds } = context;

    if (studentIds.length === 0) return [];

    const sb = createAdminClient();
    const [yearStr, monStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monStr, 10) - 1;

    const startDt = new Date(Date.UTC(year, month, 1));
    const endDt = new Date(Date.UTC(year, month + 1, 1));

    const totalDaysInMonth = Math.round(
      (endDt.getTime() - startDt.getTime()) / (24 * 60 * 60 * 1000)
    );
    const numWeeks = Math.ceil(totalDaysInMonth / 7);

    const weeks: { start: string; end: string; startDate: Date; endDate: Date }[] = [];
    for (let i = 0; i < numWeeks; i++) {
      const wStart = new Date(startDt.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(
        Math.min(endDt.getTime(), wStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      );
      weeks.push({
        start: wStart.toISOString().split('T')[0],
        end: new Date(wEnd.getTime() - 1).toISOString().split('T')[0],
        startDate: wStart,
        endDate: wEnd,
      });
    }

    let itemIds: string[] = [];
    if (courseId) {
      const { data: items } = await sb
        .from('master_course_items')
        .select('id')
        .eq('master_course_id', normUuid(courseId));
      itemIds = items?.map(i => i.id) ?? [];
    } else {
      itemIds = context.allItemIds;
    }

    if (itemIds.length === 0) {
      return weeks.map(w => ({ weekStart: w.start, weekEnd: w.end, watchedHours: 0, lecturesWatched: 0, completedLectures: 0 }));
    }

    const [sessions, completedRows] = await Promise.all([
      selectAdminSessionsInRange(sb, studentIds, startDt, endDt),
      selectAdminProgressInRange(sb, studentIds, startDt, endDt),
    ]);
    const completed = completedRows.reduce((acc: typeof completedRows, r) => {
      if (r.completed === true && r.item_id && itemIds.includes(normUuid(r.item_id))) acc.push(r);
      return acc;
    }, []);

    const result: WeeklyAnalyticsRow[] = [];
    for (const w of weeks) {
      const weekSessions = sessions.filter(s => {
        if (!s.created_at) return false;
        const sDate = new Date(s.created_at);
        return sDate >= w.startDate && sDate < w.endDate;
      });

      const weekCompleted = completed.filter(p => {
        const cDateStr = p.completed_at ?? p.updated_at;
        if (!cDateStr) return false;
        const cDate = new Date(cDateStr);
        return cDate >= w.startDate && cDate < w.endDate;
      });

      const hoursSum = weekSessions.reduce((acc, s) => acc + Number(s.watched_duration_seconds || 0), 0);
      const lecturesWatchedIds = weekSessions.reduce((acc: string[], s) => {
        if (Number(s.watched_duration_seconds || 0) > 0 && s.item_id) acc.push(s.item_id);
        return acc;
      }, []);
      const lecturesWatched = new Set(lecturesWatchedIds).size;
      const completedLecturesIds = weekCompleted.reduce((acc: string[], p) => {
        if (p.item_id) acc.push(p.item_id);
        return acc;
      }, []);
      const completedLectures = new Set(completedLecturesIds).size;

      result.push({
        weekStart: w.start,
        weekEnd: w.end,
        watchedHours: Number((hoursSum / 3600).toFixed(2)),
        lecturesWatched,
        completedLectures,
      });
    }

    return result;
  }

  /**
   * Get cohort course progress distribution for pie chart.
   */
  static async getPieChartData(collegeId: string, courseId?: string): Promise<CoursePieChartData> {
    const context = await getAnalyticsSharedContext(collegeId);
    const { studentIds, courseIds, itemToCourse } = context;

    if (studentIds.length === 0) {
      return {
        totalAvailableCourses: 0,
        notStartedCourses: 0,
        startedCourses: 0,
        completedCourses: 0,
      };
    }

    let filteredCourseIds = courseIds;
    if (courseId) {
      const normCid = normUuid(courseId);
      filteredCourseIds = courseIds.filter(cid => normUuid(cid) === normCid);
    }

    if (filteredCourseIds.length === 0) {
      return {
        totalAvailableCourses: 0,
        notStartedCourses: 0,
        startedCourses: 0,
        completedCourses: 0,
      };
    }

    const sb = createAdminClient();

    // Build courseItemsMap from context
    const courseItemsMap = new Map<string, string[]>();
    for (const itemId of context.allItemIds) {
      const cid = itemToCourse.get(normUuid(itemId));
      if (cid && context.courseIdSet.has(cid)) {
        if (!courseItemsMap.has(cid)) courseItemsMap.set(cid, []);
        courseItemsMap.get(cid)!.push(normUuid(itemId));
      }
    }

    // Fetch progress
    const progressRows = await selectAdminProgress(sb, studentIds);
    const filteredProgress = progressRows.filter(p => p.item_id && context.itemIdSet.has(normUuid(p.item_id)));

    // Group progress by student and course
    const studentCourseProgress = new Map<string, Set<string>>(); // "studentId:courseId" -> Set of completed itemIds
    const studentCourseWatched = new Map<string, number>(); // "studentId:courseId" -> Sum of watched seconds

    const itemByNormId = new Map<string, { id: string; master_course_id: string }>();
    for (const i of context.courseItems ?? []) {
      itemByNormId.set(normUuid(i.id), i);
    }

    for (const row of filteredProgress) {
      const sid = normUuid(row.student_id);
      const itemId = normUuid(row.item_id);
      // find course
      const item = itemByNormId.get(itemId);
      if (!item) continue;
      const cid = normUuid(item.master_course_id);

      const key = `${sid}:${cid}`;
      const sec = Number(row.watched_seconds || 0);
      const tot = Number(row.total_seconds || 0);
      const pct = tot > 0 ? Math.min(100, Math.round((sec / tot) * 100)) : 0;
      const completed = row.completed || pct >= 66;

      if (completed) {
        if (!studentCourseProgress.has(key)) studentCourseProgress.set(key, new Set());
        studentCourseProgress.get(key)!.add(itemId);
      }
      studentCourseWatched.set(key, (studentCourseWatched.get(key) ?? 0) + sec);
    }

    let completed = 0;
    let started = 0;
    let notStarted = 0;

    for (const sid of studentIds) {
      const normSid = normUuid(sid);
      for (const cid of filteredCourseIds) {
        const normCid = normUuid(cid);
        const key = `${normSid}:${normCid}`;

        const completedItems = studentCourseProgress.get(key)?.size ?? 0;
        const totalItems = courseItemsMap.get(normCid)?.length ?? 0;
        const watchedSeconds = studentCourseWatched.get(key) ?? 0;

        if (totalItems > 0 && completedItems >= totalItems) {
          completed++;
        } else if (watchedSeconds > 0) {
          started++;
        } else {
          notStarted++;
        }
      }
    }

    return {
      totalAvailableCourses: completed + started + notStarted,
      notStartedCourses: notStarted,
      startedCourses: started,
      completedCourses: completed,
    };
  }
}

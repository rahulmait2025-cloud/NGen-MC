import 'server-only';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import {
  calculateCompletionPercentage,
  isCompletedLecture,
  isWatchedLecture,
  secondsToHours,
} from '../formatters';
import type { LearningAnalyticsStudentResult } from '../types';
import {
  applyProgressRow,
  averageCompletionFromAgg,
  buildChartsBundle,
  buildCourseFunnel,
  buildCompletionDistribution,
  buildDayOfWeekActivity,
  buildEngagementTiers,
  buildModuleBreakdown,
  buildStudentWatchSecondsMap,
  buildWeeklyRetention,
  createEmptyStudentAgg,
  fetchOptionalVideoProgressRepeat,
  fetchProgressRows,
  getAdminClient,
  getCurrentMonthWeekRanges,
  loadCourseTitles,
  loadModuleTitles,
  loadProfiles,
  loadVideoCatalog,
  resolveStudentDisplay,
  safeNumber,
  toIsoOrNull,
} from './shared';

const emptyCharts = {
  dailyCurrentWeek: [],
  weeklyCurrentMonth: [],
  contentPie: [],
};

export async function getStudentLearningAnalytics(
  collegeId: string,
  studentId: string,
): Promise<LearningAnalyticsStudentResult> {
  await requireSuperadmin();
  const admin = getAdminClient();

  const emptyTotals = {
    totalWatchSeconds: 0,
    totalWatchHours: 0,
    uniqueWatchSeconds: 0,
    uniqueWatchHours: 0,
    repeatWatchSeconds: null as number | null,
    repeatWatchHours: null as number | null,
    lecturesWatched: 0,
    completedLectures: 0,
    averageCompletionPercentage: 0,
    lastActivityAt: null as string | null,
  };

  const { data: studentRow, error: studentError } = await admin
    .from('students')
    .select('id, user_id, college_id')
    .eq('id', studentId)
    .eq('college_id', collegeId)
    .maybeSingle();

  if (studentError) throw new Error(studentError.message);

  if (!studentRow) {
    return {
      student: null,
      totals: emptyTotals,
      charts: emptyCharts,
      moduleBreakdown: [],
      watchedVideos: [],
      courseFunnel: [],
      detailedMetrics: {
        completionDistribution: [],
        dayOfWeekActivity: [],
        engagementTiers: [],
        weeklyRetention: [],
      },
    };
  }

  const { data: collegeRow, error: collegeError } = await admin
    .from('colleges')
    .select('id, name')
    .eq('id', collegeId)
    .maybeSingle();

  if (collegeError) throw new Error(collegeError.message);

  const profiles = await loadProfiles(admin, [studentRow.user_id]);
  const display = resolveStudentDisplay(
    { id: studentRow.id, user_id: studentRow.user_id, college_id: studentRow.college_id },
    profiles,
  );

  const catalog = await loadVideoCatalog(admin);

  const monthStart = getCurrentMonthWeekRanges()[0]?.start ?? new Date();
  const sinceIso = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString();

  const [allProgress, chartProgress] = await Promise.all([
    fetchProgressRows(admin, { studentIds: [studentId] }),
    fetchProgressRows(admin, { studentIds: [studentId], sinceIso }),
    fetchOptionalVideoProgressRepeat(admin, studentId),
  ]);

  const agg = createEmptyStudentAgg();
  for (const row of allProgress) {
    applyProgressRow(agg, row, catalog);
  }

  const uniqueWatchSeconds = agg.uniqueWatchSeconds;
  const repeatWatchSeconds: number | null = Math.max(0, agg.totalWatchSeconds - agg.uniqueWatchSeconds);

  const courseIds = Array.from(
    new Set(allProgress.reduce<string[]>((acc, r) => { const id = catalog.items.get(r.item_id)?.master_course_id; if (id) acc.push(id); return acc; }, [])),
  );
  const moduleIds = Array.from(
    new Set(allProgress.reduce<string[]>((acc, r) => { const id = catalog.items.get(r.item_id)?.module_id; if (id) acc.push(id); return acc; }, [])),
  );

  const [courseTitles, moduleTitles] = await Promise.all([
    loadCourseTitles(admin, courseIds.length ? courseIds : Array.from(catalog.itemsByCourse.keys())),
    loadModuleTitles(admin, moduleIds.length ? moduleIds : Array.from(catalog.itemsByModule.keys())),
  ]);

  const watchedVideos = allProgress.reduce((acc, row) => {
    if (catalog.itemIds.has(row.item_id) && isWatchedLecture(row.unique_watched_seconds)) {
      const item = catalog.items.get(row.item_id)!;
      const moduleMeta = moduleTitles.get(item.module_id);
      const watched = safeNumber(row.watched_seconds);
      const total = safeNumber(row.total_seconds);
      acc.push({
        itemId: row.item_id,
        videoTitle: item.title,
        courseId: item.master_course_id,
        courseTitle: courseTitles.get(item.master_course_id) ?? 'Untitled course',
        moduleId: item.module_id,
        moduleTitle: moduleMeta?.title ?? 'Untitled module',
        totalSeconds: total,
        watchedSeconds: watched,
        watchedHours: secondsToHours(watched),
        completionPercentage: calculateCompletionPercentage(row.unique_watched_seconds, total),
        completed: isCompletedLecture(row),
        lastPositionSeconds: row.last_position_seconds ?? null,
        lastWatchedAt: row.updated_at ?? null,
      });
    }
    return acc;
  }, [] as Array<{
    itemId: string;
    videoTitle: string;
    courseId: string;
    courseTitle: string;
    moduleId: string;
    moduleTitle: string;
    totalSeconds: number;
    watchedSeconds: number;
    watchedHours: number;
    completionPercentage: number;
    completed: boolean;
    lastPositionSeconds: number | null;
    lastWatchedAt: string | null;
  }>).sort((a, b) => b.watchedSeconds - a.watchedSeconds);

  const charts = buildChartsBundle(chartProgress, catalog, {
    lecturesWatched: agg.watchedItemIds.size,
    completedLectures: agg.completedItemIds.size,
  });

  const moduleBreakdown = buildModuleBreakdown({
    scopeProgress: allProgress,
    catalog,
    courseTitles,
    moduleTitles,
  });

  const courseFunnel = buildCourseFunnel(allProgress, catalog, courseTitles);

  const studentWatchSeconds = buildStudentWatchSecondsMap(allProgress, catalog);
  const detailedMetrics = {
    completionDistribution: buildCompletionDistribution(allProgress, catalog),
    dayOfWeekActivity: buildDayOfWeekActivity(allProgress, catalog),
    engagementTiers: buildEngagementTiers(studentWatchSeconds),
    weeklyRetention: buildWeeklyRetention(allProgress, catalog, 8),
  };

  return {
    student: {
      id: studentRow.id,
      userId: studentRow.user_id,
      name: display.name,
      email: display.email,
      collegeId,
      collegeName: collegeRow?.name ?? 'Unknown college',
    },
    totals: {
      totalWatchSeconds: agg.totalWatchSeconds,
      totalWatchHours: secondsToHours(agg.totalWatchSeconds),
      uniqueWatchSeconds,
      uniqueWatchHours: secondsToHours(uniqueWatchSeconds),
      repeatWatchSeconds,
      repeatWatchHours: repeatWatchSeconds != null ? secondsToHours(repeatWatchSeconds) : null,
      lecturesWatched: agg.watchedItemIds.size,
      completedLectures: agg.completedItemIds.size,
      averageCompletionPercentage: averageCompletionFromAgg(agg),
      lastActivityAt: toIsoOrNull(agg.lastActivityAt),
    },
    charts,
    moduleBreakdown,
    watchedVideos,
    courseFunnel,
    detailedMetrics,
  };
}

import 'server-only';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { formatWeekLabel, secondsToHours } from '../formatters';
import type { LearningAnalyticsCollegeResult, ProfileRecord } from '../types';
import {
  applyProgressRow,
  averageCompletionFromAgg,
  buildChartsBundle,
  buildCourseFunnel,
  buildDayOfWeekActivity,
  buildCompletionDistribution,
  buildEngagementTiers,
  buildModuleBreakdown,
  buildStudentWatchSecondsMap,
  buildWeeklyActiveTrend,
  buildWeeklyRetention,
  countCoursesStartedCompleted,
  createEmptyStudentAgg,
  fetchAtRiskStudentCount,
  fetchProgressRows,
  fetchStreakStats,
  getAdminClient,
  loadCourseTitles,
  loadModuleTitles,
  loadStudents,
  loadVideoCatalog,
  rankLeaderboard,
  resolveStudentDisplay,
  toIsoOrNull,
} from './shared';

export async function getCollegeLearningAnalytics(
  collegeId: string,
): Promise<LearningAnalyticsCollegeResult> {
  await requireSuperadmin();
  const admin = getAdminClient();

  const emptyCharts = {
    dailyCurrentWeek: [],
    weeklyCurrentMonth: [],
    contentPie: [],
  };

  const { data: collegeRow, error: collegeError } = await admin
    .from('colleges')
    .select('id, name, slug')
    .eq('id', collegeId)
    .maybeSingle();

  if (collegeError) throw new Error(collegeError.message);

  if (!collegeRow) {
    return {
      college: null,
      totals: {
        totalStudents: 0,
        activeLearningStudents: 0,
        totalWatchSeconds: 0,
        totalWatchHours: 0,
        lecturesWatched: 0,
        completedLectures: 0,
        averageCompletionPercentage: 0,
        lastActivityAt: null,
      },
      students: [],
      leaderboard: [],
      charts: emptyCharts,
      moduleBreakdown: [],
      weeklyActiveTrend: [],
      alertSummary: {
        atRiskStudentCount: null,
        totalStudentsWithStreaks: null,
        averageStreakLength: null,
        totalActiveStreaks: null,
      },
      courseFunnel: [],
      detailedMetrics: {
        completionDistribution: [],
        dayOfWeekActivity: [],
        engagementTiers: [],
        weeklyRetention: [],
      },
    };
  }

  const [catalog, students] = await Promise.all([
    loadVideoCatalog(admin),
    loadStudents(admin, collegeId),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sinceIso = monthStart.toISOString();

  const [allProgress, chartProgress] = await Promise.all([
    fetchProgressRows(admin, { collegeId }),
    fetchProgressRows(admin, { collegeId, sinceIso }),
  ]);

  const profiles = new Map<string, ProfileRecord>();
  for (const s of students) {
    if (s.profiles) {
      profiles.set(s.user_id, s.profiles);
    }
  }

  const courseIds = Array.from(new Set(Array.from(catalog.items.values()).map((i) => i.master_course_id)));
  const moduleIds = Array.from(catalog.itemsByModule.keys());
  const [courseTitles, moduleTitles] = await Promise.all([
    loadCourseTitles(admin, courseIds),
    loadModuleTitles(admin, moduleIds),
  ]);

  const studentAggs = new Map<string, ReturnType<typeof createEmptyStudentAgg>>();
  for (const student of students) {
    studentAggs.set(student.id, createEmptyStudentAgg());
  }

  for (const row of allProgress) {
    const agg = studentAggs.get(row.student_id);
    if (!agg) continue;
    applyProgressRow(agg, row, catalog);
  }

  let totalWatchSeconds = 0;
  let totalLecturesWatched = 0;
  let totalCompletedLectures = 0;
  let completionPctSum = 0;
  let progressRowCount = 0;
  let activeLearningStudents = 0;
  let lastActivity: Date | null = null;

  const studentRows = students.map((student) => {
    const agg = studentAggs.get(student.id) ?? createEmptyStudentAgg();
    const display = resolveStudentDisplay(student, profiles);
    const { coursesStarted, coursesCompleted } = countCoursesStartedCompleted(
      student.id,
      allProgress,
      catalog,
    );

    if (agg.watchedItemIds.size > 0) {
      activeLearningStudents += 1;
      totalWatchSeconds += agg.totalWatchSeconds;
      totalLecturesWatched += agg.watchedItemIds.size;
      totalCompletedLectures += agg.completedItemIds.size;
      completionPctSum += agg.completionPctSum;
      progressRowCount += agg.progressRowCount;
    }

    if (agg.lastActivityAt && (!lastActivity || agg.lastActivityAt > lastActivity)) {
      lastActivity = agg.lastActivityAt;
    }

    return {
      studentId: student.id,
      userId: student.user_id,
      name: display.name,
      email: display.email,
      totalWatchSeconds: agg.totalWatchSeconds,
      totalWatchHours: secondsToHours(agg.totalWatchSeconds),
      lecturesWatched: agg.watchedItemIds.size,
      completedLectures: agg.completedItemIds.size,
      averageCompletionPercentage: averageCompletionFromAgg(agg),
      coursesStarted,
      coursesCompleted,
      lastActivityAt: toIsoOrNull(agg.lastActivityAt),
    };
  });

  studentRows.sort((a, b) => b.totalWatchSeconds - a.totalWatchSeconds);

  const leaderboard = rankLeaderboard(
    studentRows.map((s) => ({
      studentId: s.studentId,
      name: s.name,
      email: s.email,
      totalWatchSeconds: s.totalWatchSeconds,
      totalWatchHours: s.totalWatchHours,
      lecturesWatched: s.lecturesWatched,
      completedLectures: s.completedLectures,
      averageCompletionPercentage: s.averageCompletionPercentage,
      lastActivityAt: s.lastActivityAt,
    })),
  );

  const charts = buildChartsBundle(chartProgress, catalog, {
    lecturesWatched: totalLecturesWatched,
    completedLectures: totalCompletedLectures,
  });

  const moduleBreakdown = buildModuleBreakdown({
    scopeProgress: allProgress,
    catalog,
    courseTitles,
    moduleTitles,
  });

  const weeklyActiveTrend = buildWeeklyActiveTrend(allProgress, catalog, 12).map((w) => ({
    weekLabel: formatWeekLabel(w.weekStart, w.weekEnd),
    weekStart: w.weekStart.toISOString().split('T')[0],
    activeStudents: w.activeStudents,
    totalWatchHours: secondsToHours(w.totalWatchSeconds),
  }));

  const courseFunnel = buildCourseFunnel(allProgress, catalog, courseTitles).slice(0, 15);

  const [atRiskCount, streakStats] = await Promise.all([
    fetchAtRiskStudentCount(admin),
    fetchStreakStats(admin),
  ]);

  const studentWatchSeconds = buildStudentWatchSecondsMap(allProgress, catalog);
  const detailedMetrics = {
    completionDistribution: buildCompletionDistribution(allProgress, catalog),
    dayOfWeekActivity: buildDayOfWeekActivity(allProgress, catalog),
    engagementTiers: buildEngagementTiers(studentWatchSeconds),
    weeklyRetention: buildWeeklyRetention(allProgress, catalog, 8),
  };

  return {
    college: {
      id: collegeRow.id,
      name: collegeRow.name,
      slug: collegeRow.slug ?? null,
    },
    totals: {
      totalStudents: students.length,
      activeLearningStudents,
      totalWatchSeconds,
      totalWatchHours: secondsToHours(totalWatchSeconds),
      lecturesWatched: totalLecturesWatched,
      completedLectures: totalCompletedLectures,
      averageCompletionPercentage:
        progressRowCount > 0 ? Number((completionPctSum / progressRowCount).toFixed(1)) : 0,
      lastActivityAt: toIsoOrNull(lastActivity),
    },
    students: studentRows,
    leaderboard,
    charts,
    moduleBreakdown,
    weeklyActiveTrend,
    alertSummary: {
      atRiskStudentCount: atRiskCount,
      totalStudentsWithStreaks: streakStats.totalStudentsWithStreaks,
      averageStreakLength: streakStats.averageStreakLength,
      totalActiveStreaks: streakStats.totalActiveStreaks,
    },
    courseFunnel,
    detailedMetrics,
  };
}

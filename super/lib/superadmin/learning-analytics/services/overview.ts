import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { formatWeekLabel, secondsToHours } from '../formatters';
import type { LearningAnalyticsOverviewResult } from '../types';
import {
  applyProgressRow,
  buildCatalogWatchStats,
  buildChartsBundle,
  buildCourseFunnel,
  buildDayOfWeekActivity,
  buildCompletionDistribution,
  buildEngagementTiers,
  buildStudentWatchSecondsMap,
  buildWeeklyActiveTrend,
  buildWeeklyRetention,
  createEmptyStudentAgg,
  fetchAtRiskStudentCount,
  fetchProgressRows,
  fetchStreakStats,
  getAdminClient,
  getCurrentMonthWeekRanges,
  loadColleges,
  loadCourseTitles,
  loadStudents,
  loadVideoCatalog,
  toIsoOrNull,
} from './shared';

export async function getLearningAnalyticsOverview(): Promise<LearningAnalyticsOverviewResult> {
  await requireSuperadmin();

  return _getLearningAnalyticsOverviewCached();
}

async function _getLearningAnalyticsOverviewCached(): Promise<LearningAnalyticsOverviewResult> {
  'use cache';
  cacheLife('minutes');
  cacheTag('learning-analytics');

  const admin = getAdminClient();

  const [catalog, colleges, students] = await Promise.all([
    loadVideoCatalog(admin),
    loadColleges(admin),
    loadStudents(admin),
  ]);

  const monthStart = getCurrentMonthWeekRanges()[0]?.start ?? new Date();
  monthStart.setHours(0, 0, 0, 0);
  const sinceIso = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString();

  // Removed all-time fetchProgressRows(admin) — the 90-day default window in
  // fetchProgressRows already bounds the scan. Use only that + month window for charts.
  const [progress90, chartProgress, atRiskCount, streakStats, courseTitles] = await Promise.all([
    fetchProgressRows(admin),
    fetchProgressRows(admin, { sinceIso }),
    fetchAtRiskStudentCount(admin),
    fetchStreakStats(admin),
    loadCourseTitles(admin, Array.from(catalog.itemsByCourse.keys())),
  ]);

  const collegeNameById = new Map(colleges.map((c) => [c.id, c.name]));
  const collegeSlugById = new Map(colleges.map((c) => [c.id, c.slug]));
  const studentsByCollege = new Map<string, string[]>();
  const studentCollegeMap = new Map<string, string>();

  for (const student of students) {
    studentCollegeMap.set(student.id, student.college_id);
    const list = studentsByCollege.get(student.college_id) ?? [];
    list.push(student.id);
    studentsByCollege.set(student.college_id, list);
  }

  const collegeAgg = new Map<
    string,
    {
      totalStudents: number;
      activeLearningStudents: Set<string>;
      studentAggs: Map<string, ReturnType<typeof createEmptyStudentAgg>>;
    }
  >();

  for (const college of colleges) {
    const studentIds = studentsByCollege.get(college.id) ?? [];
    collegeAgg.set(college.id, {
      totalStudents: studentIds.length,
      activeLearningStudents: new Set(),
      studentAggs: new Map(studentIds.map((id) => [id, createEmptyStudentAgg()])),
    });
  }

  const platformStudentAggs = new Map<string, ReturnType<typeof createEmptyStudentAgg>>();
  for (const student of students) {
    platformStudentAggs.set(student.id, createEmptyStudentAgg());
  }

  for (const row of progress90) {
    if (!catalog.itemIds.has(row.item_id)) continue;

    const studentAgg = platformStudentAggs.get(row.student_id) ?? createEmptyStudentAgg();
    if (!platformStudentAggs.has(row.student_id)) {
      platformStudentAggs.set(row.student_id, studentAgg);
    }
    applyProgressRow(studentAgg, row, catalog);

    const collegeId = studentCollegeMap.get(row.student_id);
    if (!collegeId) continue;
    const collegeBucket = collegeAgg.get(collegeId);
    if (!collegeBucket) continue;

    let cAgg = collegeBucket.studentAggs.get(row.student_id);
    if (!cAgg) {
      cAgg = createEmptyStudentAgg();
      collegeBucket.studentAggs.set(row.student_id, cAgg);
    }
    applyProgressRow(cAgg, row, catalog);
    if (cAgg.watchedItemIds.size > 0) {
      collegeBucket.activeLearningStudents.add(row.student_id);
    }
  }

  let totalWatchSeconds = 0;
  let totalLecturesWatched = 0;
  let totalCompletedLectures = 0;
  let completionPctSum = 0;
  let progressRowCount = 0;
  let activeLearningStudents = 0;

  for (const agg of platformStudentAggs.values()) {
    if (agg.watchedItemIds.size === 0) continue;
    activeLearningStudents += 1;
    totalWatchSeconds += agg.totalWatchSeconds;
    totalLecturesWatched += agg.watchedItemIds.size;
    totalCompletedLectures += agg.completedItemIds.size;
    completionPctSum += agg.completionPctSum;
    progressRowCount += agg.progressRowCount;
  }

  const catalogStats = buildCatalogWatchStats(progress90, catalog);
  const totalWatchedVideos = catalogStats.watchedVideoItemIds.size;

  const collegeRows = colleges.map((college) => {
    const bucket = collegeAgg.get(college.id);
    if (!bucket) {
      return {
        collegeId: college.id,
        collegeName: college.name,
        collegeSlug: college.slug ?? null,
        totalStudents: 0,
        activeLearningStudents: 0,
        totalWatchSeconds: 0,
        totalWatchHours: 0,
        lecturesWatched: 0,
        completedLectures: 0,
        averageCompletionPercentage: 0,
        lastActivityAt: null,
      };
    }

    let collegeWatchSeconds = 0;
    let collegeLecturesWatched = 0;
    let collegeCompleted = 0;
    let collegePctSum = 0;
    let collegeProgressRows = 0;
    let lastActivity: Date | null = null;

    for (const agg of bucket.studentAggs.values()) {
      collegeWatchSeconds += agg.totalWatchSeconds;
      collegeLecturesWatched += agg.watchedItemIds.size;
      collegeCompleted += agg.completedItemIds.size;
      collegePctSum += agg.completionPctSum;
      collegeProgressRows += agg.progressRowCount;
      if (agg.lastActivityAt && (!lastActivity || agg.lastActivityAt > lastActivity)) {
        lastActivity = agg.lastActivityAt;
      }
    }

    return {
      collegeId: college.id,
      collegeName: collegeNameById.get(college.id) ?? college.name,
      collegeSlug: collegeSlugById.get(college.id) ?? null,
      totalStudents: bucket.totalStudents,
      activeLearningStudents: bucket.activeLearningStudents.size,
      totalWatchSeconds: collegeWatchSeconds,
      totalWatchHours: secondsToHours(collegeWatchSeconds),
      lecturesWatched: collegeLecturesWatched,
      completedLectures: collegeCompleted,
      averageCompletionPercentage:
        collegeProgressRows > 0
          ? Number((collegePctSum / collegeProgressRows).toFixed(1))
          : 0,
      lastActivityAt: toIsoOrNull(lastActivity),
    };
  });

  collegeRows.sort((a, b) => b.totalWatchSeconds - a.totalWatchSeconds);

  const charts = buildChartsBundle(chartProgress, catalog, {
    lecturesWatched: totalLecturesWatched,
    completedLectures: totalCompletedLectures,
  });

  const weeklyActiveTrend = buildWeeklyActiveTrend(progress90, catalog, 12).map((w) => ({
    weekLabel: formatWeekLabel(w.weekStart, w.weekEnd),
    weekStart: w.weekStart.toISOString().split('T')[0],
    activeStudents: w.activeStudents,
    totalWatchHours: secondsToHours(w.totalWatchSeconds),
  }));

  const courseFunnel = buildCourseFunnel(progress90, catalog, courseTitles).slice(0, 15);

  const studentWatchSeconds = buildStudentWatchSecondsMap(progress90, catalog);
  const detailedMetrics = {
    completionDistribution: buildCompletionDistribution(progress90, catalog),
    dayOfWeekActivity: buildDayOfWeekActivity(progress90, catalog),
    engagementTiers: buildEngagementTiers(studentWatchSeconds),
    weeklyRetention: buildWeeklyRetention(progress90, catalog, 8),
  };

  return {
    totals: {
      totalColleges: colleges.length,
      totalStudents: students.length,
      activeLearningStudents,
      totalWatchSeconds,
      totalWatchHours: secondsToHours(totalWatchSeconds),
      totalLecturesWatched,
      totalCompletedLectures,
      averageCompletionPercentage:
        progressRowCount > 0 ? Number((completionPctSum / progressRowCount).toFixed(1)) : 0,
      totalAvailableVideos: catalog.totalAvailableVideos,
      totalWatchedVideos,
      totalNotStartedVideos: Math.max(0, catalog.totalAvailableVideos - totalWatchedVideos),
    },
    collegeRows,
    charts,
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

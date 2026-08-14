import { StudentVideoAnalyticsService } from '@/lib/analytics/student-video-analytics-service';
import {
  getStudentLearningActivities,
  buildHeatmapCountsFromActivities,
} from '@/lib/activity/student-learning-activity';
import { getDailyStreakCached } from '@/lib/streak/daily-streak';
import { StudentActivityDashboard } from '@/app/c/[collegeSlug]/student/(authenticated)/_components/student-activity-feed';

export default async function StudentActivityDeferred({
  studentId,
  isGlobal,
  collegeId,
}: {
  tenantId: string;
  userId: string;
  studentId: string;
  isGlobal: boolean;
  collegeId: string;
  eventName?: string;
  eventCategory?: string;
  from?: string;
  to?: string;
}) {
  const [streak, allActivities, overview] = await Promise.all([
    getDailyStreakCached(studentId),
    getStudentLearningActivities(studentId),
    StudentVideoAnalyticsService.getOverview(studentId, { isGlobal, collegeId }),
  ]);

  const dailyActivityCounts = buildHeatmapCountsFromActivities(allActivities);

  const assignmentsCompleted = allActivities.filter(
    (a) => a.kind === 'assignment_done',
  ).length;
  const quizzesTaken = allActivities.filter((a) => a.kind === 'quiz_taken').length;

  const totalWatchSeconds = overview.totalWatchSeconds;
  let displayWatchValue: number;
  let watchSuffix: string;
  if (totalWatchSeconds < 60) {
    displayWatchValue = Math.round(totalWatchSeconds);
    watchSuffix = 's';
  } else if (totalWatchSeconds < 3600) {
    displayWatchValue = Math.round(totalWatchSeconds / 60);
    watchSuffix = 'm';
  } else {
    displayWatchValue = Math.round(overview.totalHoursWatched * 10) / 10;
    watchSuffix = 'h';
  }

  return (
    <StudentActivityDashboard
      allActivities={allActivities}
      dailyActivityCounts={dailyActivityCounts}
      stats={{
        videosWatched: overview.totalLecturesWatched,
        assignmentsCompleted: assignmentsCompleted + quizzesTaken,
        dayStreak: streak.currentStreak,
        totalWatchHours: displayWatchValue,
        coursesActive: overview.startedCourses,
      }}
      watchSuffix={watchSuffix}
    />
  );
}

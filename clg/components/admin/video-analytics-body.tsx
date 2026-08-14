import {
  getCollegeVideoAnalyticsOverview,
  getCollegeStudentVideoStats,
  getCollegeVideoAnalyticsCharts,
  mapStudentStatsToLeaderboard,
  listCollegeVideoAnalyticsCourses,
  isCollegeVideoAnalyticsSchemaReady,
  VideoAnalyticsSchemaNotReadyError,
  type CollegeVideoAnalyticsOverview,
  type CollegeStudentLeaderboardEntry,
  type CollegeVideoAnalyticsChartData,
  type CollegeVideoAnalyticsFilters,
} from '@/lib/services/college-video-analytics';
import {
  parseVideoAnalyticsFilters,
  parseVideoAnalyticsChartPeriods,
} from '@/lib/college-admin/analytics/parse-video-analytics-filters';
import { CollegeEngagementService } from '@/lib/college-admin/analytics/services/engagement';
import { VideoAnalyticsContent } from '@/components/admin/video-analytics-content';

const EMPTY_OVERVIEW: CollegeVideoAnalyticsOverview = {
  totalStudents: 0,
  activeStudents: 0,
  inactiveStudents: 0,
  totalWatchSeconds: 0,
  totalWatchHours: 0,
  totalLecturesWatched: 0,
  totalCompletedLectures: 0,
  averageCompletionPercentage: 0,
};

const EMPTY_SEARCH_PARAMS: Record<string, string | string[] | undefined> = {};

async function loadVideoAnalyticsPayload(
  collegeId: string,
  tableFilters: CollegeVideoAnalyticsFilters,
  chartPeriods: ReturnType<typeof parseVideoAnalyticsChartPeriods>,
): Promise<{
  overview: CollegeVideoAnalyticsOverview;
  leaderboard: CollegeStudentLeaderboardEntry[];
  chartData: CollegeVideoAnalyticsChartData;
  courseOptions: Array<{ id: string; title: string }>;
  engagementTiers: Array<{ tier: string; count: number; percentage: number }>;
  dayOfWeekActivity: Array<{ dayLabel: string; activeStudents: number; watchHours: number }>;
  errorMessage?: string;
}> {
  const emptyChartData: CollegeVideoAnalyticsChartData = {
    weekStart: chartPeriods.weekStart ?? '',
    month: chartPeriods.month ?? '',
    dailyWeek: [],
    weeklyMonth: [],
    learningStatus: [],
  };

  try {
    const schemaReady = await isCollegeVideoAnalyticsSchemaReady();
    if (!schemaReady) {
      return {
        overview: EMPTY_OVERVIEW,
        leaderboard: [],
        chartData: emptyChartData,
        courseOptions: [],
        engagementTiers: [],
        dayOfWeekActivity: [],
        errorMessage: new VideoAnalyticsSchemaNotReadyError().message,
      };
    }

    const [overview, studentStats, chartData, courseOptions, engagementTiers, dayOfWeekActivity] =
      await Promise.all([
        getCollegeVideoAnalyticsOverview(collegeId),
        getCollegeStudentVideoStats(collegeId, tableFilters),
        getCollegeVideoAnalyticsCharts(collegeId, {
          weekStart: chartPeriods.weekStart ?? undefined,
          month: chartPeriods.month ?? undefined,
          filters: tableFilters,
        }),
        listCollegeVideoAnalyticsCourses(collegeId),
        CollegeEngagementService.getEngagementTiers(collegeId),
        CollegeEngagementService.getDayOfWeekActivity(collegeId),
      ]);

    return {
      overview,
      leaderboard: mapStudentStatsToLeaderboard(studentStats).slice(0, 25),
      chartData,
      courseOptions,
      engagementTiers,
      dayOfWeekActivity,
    };
  } catch (err) {
    const message =
      err instanceof VideoAnalyticsSchemaNotReadyError
        ? err.message
        : err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'An unexpected error occurred while loading video analytics.';
    console.error('[video-analytics] load failed:', message, 'collegeId=', collegeId);

    return {
      overview: EMPTY_OVERVIEW,
      leaderboard: [],
      chartData: emptyChartData,
      courseOptions: [],
      engagementTiers: [],
      dayOfWeekActivity: [],
      errorMessage: message,
    };
  }
}

export async function VideoAnalyticsBody({
  collegeId,
  collegeSlug,
  searchParams = EMPTY_SEARCH_PARAMS,
}: {
  collegeId: string;
  collegeSlug: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const basePath = `/c/${encodeURIComponent(collegeSlug)}/admin/activity/video`;
  const tableFilters = parseVideoAnalyticsFilters(searchParams);
  const chartPeriods = parseVideoAnalyticsChartPeriods(searchParams);

  const {
    overview,
    leaderboard,
    chartData,
    courseOptions,
    engagementTiers,
    dayOfWeekActivity,
    errorMessage,
  } = await loadVideoAnalyticsPayload(collegeId, tableFilters, chartPeriods);

  return (
    <VideoAnalyticsContent
      overview={overview}
      leaderboard={leaderboard}
      appliedFilters={tableFilters}
      chartPeriods={chartPeriods}
      basePath={basePath}
      collegeId={collegeId}
      chartData={chartData}
      courseOptions={courseOptions}
      engagementTiers={engagementTiers}
      dayOfWeekActivity={dayOfWeekActivity}
      errorMessage={errorMessage}
    />
  );
}

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { getFreePlaylistAnalyticsOverview } from '@/lib/superadmin/learning-analytics/services/free-playlists';
import { getLearningAnalyticsOverview } from '@/lib/superadmin/learning-analytics/services/overview';
import { LearningPageHeader } from '@/components/learning-analytics/learning-page-header';
import { MetricCarousel } from '@/components/learning-analytics/metric-carousel';
import type { MetricItem } from '@/components/learning-analytics/metric-carousel';
import { PageTransition, TransitionItem } from '@/components/learning-analytics/page-transition';
import { AlertBar } from '@/components/learning-analytics/alert-bar';
import { WeeklyTrendChart } from '@/components/learning-analytics/weekly-trend-chart';
import { ContentFunnelChart } from '@/components/learning-analytics/content-funnel-chart';
import { CompletionDistChart } from '@/components/learning-analytics/completion-dist-chart';
import { DayOfWeekChart } from '@/components/learning-analytics/day-of-week-chart';
import { EngagementTiersChart } from '@/components/learning-analytics/engagement-tiers-chart';
import { RetentionChart } from '@/components/learning-analytics/retention-chart';
import { DailyWeekChart } from '@/components/learning-analytics/daily-week-chart';
import { WeeklyMonthChart } from '@/components/learning-analytics/weekly-month-chart';
import { ContentPieChart } from '@/components/learning-analytics/content-pie-chart';
import { CollegeAnalyticsTable } from '@/components/learning-analytics/college-analytics-table';
import { LearningEmptyState } from '@/components/learning-analytics/learning-empty-state';
import { formatPercent, formatWatchHours } from '@/components/learning-analytics/format-display';
import { LearningAnalyticsShell } from '@/components/learning-analytics/learning-analytics-shell';
import { FreePlaylistAnalyticsSection } from '@/components/learning-analytics/free-playlist-analytics-section';

function LearningAnalyticsSkeleton() {
  return (
    <LearningAnalyticsShell>
      <div className="mx-auto w-full min-w-0 max-w-full space-y-8 pb-16 sm:space-y-10 xl:max-w-7xl">
        <div className="h-8 w-64 rounded-lg bg-muted/20 animate-pulse" />
        <div className="h-16 w-full rounded-xl bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-64 rounded-xl bg-muted/20 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="h-48 rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-48 rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-48 rounded-xl bg-muted/20 animate-pulse" />
        </div>
      </div>
    </LearningAnalyticsShell>
  );
}

async function LearningAnalyticsContent() {
  const [data, freePlaylistData] = await Promise.all([
    getLearningAnalyticsOverview(),
    getFreePlaylistAnalyticsOverview(),
  ]);
  const {
    totals,
    collegeRows,
    charts,
    weeklyActiveTrend,
    alertSummary,
    courseFunnel,
    detailedMetrics,
  } = data;

  const hasActivity =
    totals.activeLearningStudents > 0 ||
    collegeRows.some((c) => c.activeLearningStudents > 0);

  const metrics: MetricItem[] = [
    { label: 'Colleges', value: String(totals.totalColleges) },
    { label: 'Total students', value: totals.totalStudents.toLocaleString('en-IN') },
    { label: 'Active learners', value: totals.activeLearningStudents.toLocaleString('en-IN'), accent: true },
    { label: 'Watch hours', value: formatWatchHours(totals.totalWatchHours) },
    { label: 'Lectures watched', value: totals.totalLecturesWatched.toLocaleString('en-IN') },
    { label: 'Completed', value: totals.totalCompletedLectures.toLocaleString('en-IN') },
    { label: 'Avg completion', value: formatPercent(totals.averageCompletionPercentage) },
    { label: 'Video catalog', value: `${totals.totalWatchedVideos}/${totals.totalAvailableVideos}` },
  ];

  return (
    <PageTransition>
      <LearningAnalyticsShell>
      <div className="mx-auto w-full min-w-0 max-w-full space-y-8 pb-16 sm:space-y-10 xl:max-w-7xl">
        <TransitionItem>
          <LearningPageHeader
            title="Learning Analytics"
            subtitle="College-wise video learning engagement across the platform."
          />
        </TransitionItem>

        <TransitionItem>
          <MetricCarousel items={metrics} />
        </TransitionItem>

        {hasActivity ? (
          <TransitionItem>
            <AlertBar summary={alertSummary} />
          </TransitionItem>
        ) : null}

        {hasActivity ? (
          <>
            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
              <TransitionItem>
                <WeeklyTrendChart data={weeklyActiveTrend} />
              </TransitionItem>
              <TransitionItem>
                <ContentFunnelChart data={courseFunnel} />
              </TransitionItem>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
              <DailyWeekChart data={charts.dailyCurrentWeek} />
              <WeeklyMonthChart data={charts.weeklyCurrentMonth} />
              <ContentPieChart data={charts.contentPie} />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
              <TransitionItem>
                <CompletionDistChart data={detailedMetrics.completionDistribution} />
              </TransitionItem>
              <TransitionItem>
                <DayOfWeekChart data={detailedMetrics.dayOfWeekActivity} />
              </TransitionItem>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
              <TransitionItem>
                <EngagementTiersChart data={detailedMetrics.engagementTiers} />
              </TransitionItem>
              <TransitionItem>
                <RetentionChart data={detailedMetrics.weeklyRetention} />
              </TransitionItem>
            </div>
          </>
        ) : null}

        <TransitionItem>
          {!hasActivity ? (
            <LearningEmptyState
              title="No learning analytics available yet"
              description="Data will appear once students start watching lectures."
            />
          ) : collegeRows.length === 0 ? (
            <LearningEmptyState
              title="No colleges to display"
              description="Partner colleges will appear here when learning activity is recorded."
            />
          ) : (
            <CollegeAnalyticsTable rows={collegeRows} />
          )}
        </TransitionItem>

        <TransitionItem>
          <FreePlaylistAnalyticsSection data={freePlaylistData} />
        </TransitionItem>
      </div>
      </LearningAnalyticsShell>
    </PageTransition>
  );
}

export default async function LearningAnalyticsOverviewPage(): Promise<ReactNode> {
  return (
    <Suspense fallback={<LearningAnalyticsSkeleton />}>
      <LearningAnalyticsContent />
    </Suspense>
  );
}

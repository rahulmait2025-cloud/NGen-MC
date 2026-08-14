import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getCollegeLearningAnalytics } from '@/lib/superadmin/learning-analytics/services/college';
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
import { StudentLeaderboard } from '@/components/learning-analytics/student-leaderboard';
import { StudentAnalyticsTable } from '@/components/learning-analytics/student-analytics-table';
import { ModuleBreakdownTable } from '@/components/learning-analytics/module-breakdown-table';
import { LearningEmptyState } from '@/components/learning-analytics/learning-empty-state';
import { formatPercent, formatWatchHours } from '@/components/learning-analytics/format-display';
import { LearningAnalyticsShell } from '@/components/learning-analytics/learning-analytics-shell';

export default async function CollegeLearningAnalyticsPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}): Promise<ReactNode> {
  const { collegeId } = await params;
  const data = await getCollegeLearningAnalytics(collegeId);

  if (!data.college) {
    notFound();
  }

  const hasStudentActivity = data.totals.activeLearningStudents > 0;

  const metrics: MetricItem[] = [
    { label: 'Total students', value: String(data.totals.totalStudents) },
    { label: 'Active learners', value: String(data.totals.activeLearningStudents), accent: true },
    { label: 'Watch hours', value: formatWatchHours(data.totals.totalWatchHours) },
    { label: 'Lectures watched', value: String(data.totals.lecturesWatched) },
    { label: 'Completed', value: String(data.totals.completedLectures) },
    { label: 'Avg completion', value: formatPercent(data.totals.averageCompletionPercentage) },
  ];

  return (
    <PageTransition>
      <LearningAnalyticsShell>
      <div className="mx-auto w-full min-w-0 max-w-full space-y-8 pb-16 sm:space-y-10 xl:max-w-7xl">
        <TransitionItem>
          <LearningPageHeader
            title={data.college.name}
            subtitle="Student-wise video learning analytics."
            backHref="/learning-analytics"
            backLabel="All colleges"
          />
        </TransitionItem>

        <TransitionItem>
          <MetricCarousel items={metrics} />
        </TransitionItem>

        {hasStudentActivity ? (
          <TransitionItem>
            <AlertBar summary={data.alertSummary} />
          </TransitionItem>
        ) : null}

        {hasStudentActivity ? (
          <>
            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
              <TransitionItem>
                <WeeklyTrendChart data={data.weeklyActiveTrend} />
              </TransitionItem>
              <TransitionItem>
                <ContentFunnelChart data={data.courseFunnel} />
              </TransitionItem>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
              <DailyWeekChart data={data.charts.dailyCurrentWeek} />
              <WeeklyMonthChart data={data.charts.weeklyCurrentMonth} />
              <ContentPieChart data={data.charts.contentPie} />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
              <TransitionItem>
                <CompletionDistChart data={data.detailedMetrics.completionDistribution} />
              </TransitionItem>
              <TransitionItem>
                <DayOfWeekChart data={data.detailedMetrics.dayOfWeekActivity} />
              </TransitionItem>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
              <TransitionItem>
                <EngagementTiersChart data={data.detailedMetrics.engagementTiers} />
              </TransitionItem>
              <TransitionItem>
                <RetentionChart data={data.detailedMetrics.weeklyRetention} />
              </TransitionItem>
            </div>
          </>
        ) : null}

        {!hasStudentActivity ? (
          <TransitionItem>
            <LearningEmptyState
              title="No student learning activity found"
              description="No student learning activity found for this college yet."
            />
          </TransitionItem>
        ) : (
          <>
            <TransitionItem>
              <StudentLeaderboard collegeId={collegeId} rows={data.leaderboard} />
            </TransitionItem>
            <TransitionItem>
              <StudentAnalyticsTable collegeId={collegeId} rows={data.students} />
            </TransitionItem>
          </>
        )}

        {data.moduleBreakdown.length > 0 ? (
          <TransitionItem>
            <ModuleBreakdownTable rows={data.moduleBreakdown} />
          </TransitionItem>
        ) : null}
      </div>
      </LearningAnalyticsShell>
    </PageTransition>
  );
}

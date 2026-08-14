import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getStudentLearningAnalytics } from '@/lib/superadmin/learning-analytics/services/student';
import { LearningPageHeader } from '@/components/learning-analytics/learning-page-header';
import { MetricCarousel } from '@/components/learning-analytics/metric-carousel';
import type { MetricItem } from '@/components/learning-analytics/metric-carousel';
import { PageTransition, TransitionItem } from '@/components/learning-analytics/page-transition';
import { ContentFunnelChart } from '@/components/learning-analytics/content-funnel-chart';
import { CompletionDistChart } from '@/components/learning-analytics/completion-dist-chart';
import { DayOfWeekChart } from '@/components/learning-analytics/day-of-week-chart';
import { EngagementTiersChart } from '@/components/learning-analytics/engagement-tiers-chart';
import { RetentionChart } from '@/components/learning-analytics/retention-chart';
import { DailyWeekChart } from '@/components/learning-analytics/daily-week-chart';
import { WeeklyMonthChart } from '@/components/learning-analytics/weekly-month-chart';
import { ContentPieChart } from '@/components/learning-analytics/content-pie-chart';
import { ModuleBreakdownTable } from '@/components/learning-analytics/module-breakdown-table';
import { WatchedVideosTable } from '@/components/learning-analytics/watched-videos-table';
import { LearningEmptyState } from '@/components/learning-analytics/learning-empty-state';
import {
  formatActivityDate,
  formatPercent,
  formatWatchHours,
} from '@/components/learning-analytics/format-display';
import { LearningAnalyticsShell } from '@/components/learning-analytics/learning-analytics-shell';

export default async function StudentLearningAnalyticsPage({
  params,
}: {
  params: Promise<{ collegeId: string; studentId: string }>;
}): Promise<ReactNode> {
  const { collegeId, studentId } = await params;
  const data = await getStudentLearningAnalytics(collegeId, studentId);

  if (!data.student) {
    notFound();
  }

  const { student, totals, charts, moduleBreakdown, watchedVideos, courseFunnel, detailedMetrics } = data;

  const metrics: MetricItem[] = [
    { label: 'Watch hours', value: formatWatchHours(totals.totalWatchHours), accent: true },
    { label: 'Unique hours', value: formatWatchHours(totals.uniqueWatchHours) },
    { label: 'Lectures watched', value: String(totals.lecturesWatched) },
    { label: 'Completed', value: String(totals.completedLectures) },
    { label: 'Avg completion', value: formatPercent(totals.averageCompletionPercentage) },
    { label: 'Last active', value: formatActivityDate(totals.lastActivityAt) },
  ];

  if (totals.repeatWatchHours != null) {
    metrics.splice(2, 0, {
      label: 'Repeat hours',
      value: formatWatchHours(totals.repeatWatchHours),
    });
  }

  return (
    <PageTransition>
      <LearningAnalyticsShell>
      <div className="mx-auto w-full min-w-0 max-w-full space-y-8 pb-16 sm:space-y-10 xl:max-w-7xl">
        <TransitionItem>
          <LearningPageHeader
            title={student.name}
            subtitle={`${student.email || 'No email'} \u00B7 ${student.collegeName}`}
            backHref={`/learning-analytics/${collegeId}`}
            backLabel="College analytics"
          />
        </TransitionItem>

        {totals.repeatWatchHours == null ? (
          <TransitionItem>
            <p className="text-xs text-slate-400">
              Repeat watch time: Not available yet (requires enhanced video progress data).
            </p>
          </TransitionItem>
        ) : null}

        <TransitionItem>
          <MetricCarousel items={metrics} />
        </TransitionItem>

        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
          {courseFunnel.length > 0 ? (
            <ContentFunnelChart data={courseFunnel} title="Course progress" />
          ) : null}
          <DailyWeekChart data={charts.dailyCurrentWeek} />
          <WeeklyMonthChart data={charts.weeklyCurrentMonth} />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
          <ContentPieChart data={charts.contentPie} />
          <CompletionDistChart data={detailedMetrics.completionDistribution} />
          <DayOfWeekChart data={detailedMetrics.dayOfWeekActivity} />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
          <EngagementTiersChart data={detailedMetrics.engagementTiers} />
          <RetentionChart data={detailedMetrics.weeklyRetention} />
        </div>

        {moduleBreakdown.length > 0 ? (
          <TransitionItem>
            <ModuleBreakdownTable
              rows={moduleBreakdown}
              title="Module-wise analytics"
              subtitle="Progress by course module"
            />
          </TransitionItem>
        ) : null}

        <TransitionItem>
          {watchedVideos.length === 0 ? (
            <LearningEmptyState
              title="No watched lectures"
              description="This student has not watched any lectures yet."
            />
          ) : (
            <WatchedVideosTable rows={watchedVideos} />
          )}
        </TransitionItem>
      </div>
      </LearningAnalyticsShell>
    </PageTransition>
  );
}

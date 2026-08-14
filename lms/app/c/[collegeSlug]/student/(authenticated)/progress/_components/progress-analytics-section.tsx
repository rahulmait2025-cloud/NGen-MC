'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressDailyActivityChart } from './progress-daily-activity-chart';

const LearningHoursChart = dynamic(
  () =>
    import('../../analytics/_components/analytics-chart-sections').then(
      (m) => m.LearningHoursChart,
    ),
  { ssr: false },
);

interface ProgressAnalyticsSectionProps {
  collegeSlug: string;
  learningHours: { date: string; hours: number }[];
  activityDays: { day: string; hours: number }[];
  hasChartData: boolean;
}

export function ProgressAnalyticsSection({
  collegeSlug,
  learningHours,
  activityDays,
  hasChartData,
}: ProgressAnalyticsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Learning analytics</h2>
          <p className="text-sm text-muted-foreground">
            Watch trends from your lesson activity
          </p>
        </div>
        <Link
          href={`/c/${collegeSlug}/student/analytics`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <BarChart3 className="size-4" />
          Advanced analytics
        </Link>
      </div>

      {!hasChartData ? (
        <Card className="border border-border/60 bg-card rounded-2xl">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Analytics will appear once you start watching lessons in your enrolled courses.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {learningHours.length > 0 ? (
            <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
              <LearningHoursChart learningHours={learningHours} />
            </Card>
          ) : null}
          {activityDays.some((d) => d.hours > 0) ? (
            <ProgressDailyActivityChart activityDays={activityDays} />
          ) : null}
        </div>
      )}
    </section>
  );
}

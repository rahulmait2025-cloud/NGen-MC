'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BentoCard } from './bento-card';
import { BarChart3 } from 'lucide-react';
import type { LearningAnalyticsDailyPoint } from '@/lib/superadmin/learning-analytics/types';
import { chartSectionSubtitleClass, chartSectionTitleClass, useLearningChartColors } from './chart-colors';
import { useGsapInView } from '@/components/_hooks/use-gsap-in-view';

export function DailyWeekChart({ data, title = 'This week' }: { data: LearningAnalyticsDailyPoint[]; title?: string }) {
  const colors = useLearningChartColors();
  const chartConfig = useMemo(
    () =>
      ({
        watchedHours: { label: 'Watch hours', color: colors.bar },
        lecturesWatched: { label: 'Lectures', color: colors.primarySoft },
      }) satisfies ChartConfig,
    [colors]
  );
  const wrapperRef = useGsapInView<HTMLDivElement>();
  const hasData = data.length > 0 && data.some((d) => d.watchedHours > 0);

  return (
    <div ref={wrapperRef} className="min-w-0">
      <BentoCard>
        <div className="p-8">
          <div className="mb-6">
            <h3 className={chartSectionTitleClass}>{title}</h3>
            <p className={chartSectionSubtitleClass}>Daily watch hours this week</p>
          </div>
          {hasData ? (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} dy={6} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} fontWeight={600} dx={-8} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: colors.track, opacity: 0.3 }} />
                <Bar dataKey="watchedHours" fill={colors.bar} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-3"><BarChart3 className="size-6 text-muted-foreground/30" /></div>
              <p className="text-sm font-semibold text-muted-foreground">No data this week</p>
            </div>
          )}
        </div>
      </BentoCard>
    </div>
  );
}

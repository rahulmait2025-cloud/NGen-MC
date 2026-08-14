'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BentoCard } from './bento-card';
import { BentoCardBody } from './bento-card-body';
import { AreaChart as AreaChartIcon } from 'lucide-react';
import type { WeeklyActiveTrendPoint } from '@/lib/superadmin/learning-analytics/types';
import {
  chartSectionSubtitleClass,
  chartSectionTitleClass,
  useLearningChartColors,
} from './chart-colors';
import { useGsapInView } from '@/components/_hooks/use-gsap-in-view';

export function WeeklyTrendChart({
  data,
  dataKey = 'activeStudents',
  title = 'Weekly active students',
}: {
  data: WeeklyActiveTrendPoint[];
  dataKey?: 'activeStudents' | 'totalWatchHours';
  title?: string;
}) {
  const colors = useLearningChartColors();
  const chartConfig = useMemo(
    () =>
      ({
        activeStudents: { label: 'Active students', color: colors.primary },
        totalWatchHours: { label: 'Watch hours', color: colors.primarySoft },
      }) satisfies ChartConfig,
    [colors]
  );
  const wrapperRef = useGsapInView<HTMLDivElement>();
  const hasData = data.some((d) => d[dataKey] > 0);

  return (
    <div ref={wrapperRef} className="min-w-0 max-w-full">
      <BentoCard>
        <BentoCardBody>
          <div className="mb-6">
            <h3 className={chartSectionTitleClass}>{title}</h3>
            <p className={chartSectionSubtitleClass}>12-week rolling view</p>
          </div>
          {hasData ? (
            <ChartContainer config={chartConfig} className="h-[240px] w-full max-w-full">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFillO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.primary} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="weekLabel" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} dy={6} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} fontSize={10} fontWeight={600} dx={-8} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey={dataKey} stroke={colors.areaStroke} strokeWidth={2} fill="url(#trendFillO)" dot={false} activeDot={{ r: 4, fill: colors.primary, stroke: colors.primarySoft, strokeWidth: 2 }} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-3"><AreaChartIcon className="size-6 text-muted-foreground/30" /></div>
              <p className="text-sm font-semibold text-muted-foreground">No trend data yet</p>
              <p className="max-w-[220px] text-xs text-muted-foreground">Weekly activity trends will appear once students start learning.</p>
            </div>
          )}
        </BentoCardBody>
      </BentoCard>
    </div>
  );
}

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
import { AreaChart as AreaChartIcon } from 'lucide-react';
import type { WeeklyRetentionPoint } from '@/lib/superadmin/learning-analytics/types';
import { chartSectionSubtitleClass, chartSectionTitleClass, useLearningChartColors } from './chart-colors';
import { useGsapInView } from '@/components/_hooks/use-gsap-in-view';

export function RetentionChart({ data, title = 'Weekly retention' }: { data: WeeklyRetentionPoint[]; title?: string }) {
  const colors = useLearningChartColors();
  const chartConfig = useMemo(
    () => ({ retentionRate: { label: 'Retention rate', color: colors.primary } }) satisfies ChartConfig,
    [colors]
  );
  const wrapperRef = useGsapInView<HTMLDivElement>();
  const hasData = data.length > 0 && data.some((d) => d.retentionRate > 0);

  return (
    <div ref={wrapperRef} className="min-w-0">
      <BentoCard>
        <div className="p-8">
          <div className="mb-6">
            <h3 className={chartSectionTitleClass}>{title}</h3>
            <p className={chartSectionSubtitleClass}>% of active students who return the following week</p>
          </div>
          {hasData ? (
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="retentionFillO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.primary} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="weekLabel" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} dy={6} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} fontSize={10} fontWeight={600} dx={-8} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(1)}%`} />} />
                <Area type="monotone" dataKey="retentionRate" stroke={colors.areaStroke} strokeWidth={2} fill="url(#retentionFillO)" dot={false} activeDot={{ r: 4, fill: colors.primary, stroke: colors.primarySoft, strokeWidth: 2 }} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-3"><AreaChartIcon className="size-6 text-muted-foreground/30" /></div>
              <p className="text-sm font-semibold text-muted-foreground">No retention data yet</p>
              <p className="max-w-[220px] text-xs text-muted-foreground">Student retention rates will be computed over consecutive weeks of activity.</p>
            </div>
          )}
        </div>
      </BentoCard>
    </div>
  );
}

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
import type { CompletionDistributionPoint } from '@/lib/superadmin/learning-analytics/types';
import { chartSectionSubtitleClass, chartSectionTitleClass, useLearningChartColors } from './chart-colors';
import { useGsapInView } from '@/components/_hooks/use-gsap-in-view';

export function CompletionDistChart({ data, title = 'Completion distribution' }: { data: CompletionDistributionPoint[]; title?: string }) {
  const colors = useLearningChartColors();
  const chartConfig = useMemo(
    () => ({ studentCount: { label: 'Students', color: colors.bar } }) satisfies ChartConfig,
    [colors]
  );
  const wrapperRef = useGsapInView<HTMLDivElement>();
  const hasData = data.length > 0 && data.some((d) => d.studentCount > 0);

  return (
    <div ref={wrapperRef} className="min-w-0">
      <BentoCard>
        <div className="p-8">
          <div className="mb-6">
            <h3 className={chartSectionTitleClass}>{title}</h3>
            <p className={chartSectionSubtitleClass}>How students are distributed by average completion rate</p>
          </div>
          {hasData ? (
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} dy={6} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} fontWeight={600} dx={-8} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: colors.track, opacity: 0.3 }} />
                <Bar dataKey="studentCount" fill={colors.bar} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-3"><BarChart3 className="size-6 text-muted-foreground/30" /></div>
              <p className="text-sm font-semibold text-muted-foreground">No completion data yet</p>
              <p className="max-w-[220px] text-xs text-muted-foreground">Distribution will populate as students watch lectures.</p>
            </div>
          )}
        </div>
      </BentoCard>
    </div>
  );
}

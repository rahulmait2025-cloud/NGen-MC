'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BentoCard } from './bento-card';
import { BarChart3 } from 'lucide-react';
import type { EngagementTierPoint } from '@/lib/superadmin/learning-analytics/types';

import { chartSectionSubtitleClass, chartSectionTitleClass, useLearningChartColors } from './chart-colors';
import { useGsapInView } from '@/components/_hooks/use-gsap-in-view';

export function EngagementTiersChart({ data, title = 'Student engagement tiers' }: { data: EngagementTierPoint[]; title?: string }) {
  const colors = useLearningChartColors();
  const tierColors: Record<string, string> = colors.tier;
  const chartConfig = useMemo(
    () => ({ studentCount: { label: 'Students', color: colors.primary } }) satisfies ChartConfig,
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
            <p className={chartSectionSubtitleClass}>Students grouped by total watch hours</p>
          </div>
          {hasData ? (
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} allowDecimals={false} />
                <YAxis type="category" dataKey="tier" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} width={90} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: colors.track, opacity: 0.3 }} />
                <Bar dataKey="studentCount" radius={[0, 4, 4, 0]}>
                  {data.map((entry) => (<Cell key={entry.tier} fill={tierColors[entry.tier] ?? colors.bar} />))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-3"><BarChart3 className="size-6 text-muted-foreground/30" /></div>
              <p className="text-sm font-semibold text-muted-foreground">No engagement data yet</p>
              <p className="max-w-[220px] text-xs text-muted-foreground">Tier distribution will appear as students accumulate watch time.</p>
            </div>
          )}
        </div>
      </BentoCard>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { Pie, PieChart, Cell } from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BentoCard } from './bento-card';
import { BentoCardBody } from './bento-card-body';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { LearningAnalyticsPieSlice } from '@/lib/superadmin/learning-analytics/types';
import {
  chartSectionSubtitleClass,
  chartSectionTitleClass,
  useLearningChartColors,
} from './chart-colors';
import { useGsapInView } from '@/components/_hooks/use-gsap-in-view';

export function ContentPieChart({ data, title = 'Content status' }: { data: LearningAnalyticsPieSlice[]; title?: string }) {
  const colors = useLearningChartColors();
  const sliceColors = useMemo(() => [...colors.pie], [colors]);
  const chartConfig = useMemo(
    () => ({ value: { label: 'Lectures', color: colors.primary } }) satisfies ChartConfig,
    [colors]
  );
  const wrapperRef = useGsapInView<HTMLDivElement>();
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div ref={wrapperRef} className="min-w-0 max-w-full">
      <BentoCard>
        <BentoCardBody>
          <div className="mb-6">
            <h3 className={chartSectionTitleClass}>{title}</h3>
            <p className={chartSectionSubtitleClass}>Lecture completion breakdown</p>
          </div>
          {total > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-6">
              <ChartContainer config={chartConfig} className="h-[180px] w-full max-w-[180px] shrink-0">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    stroke={colors.track}
                    strokeWidth={2}
                  >
                    {data.map((slice, i) => {
                      const fill = sliceColors[i % sliceColors.length];
                      return <Cell key={slice.name} fill={fill} style={{ fill }} />;
                    })}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="space-y-2">
                {data.map((slice, i) => (
                  <div key={slice.name} className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: sliceColors[i % sliceColors.length] }} />
                    <span className="text-xs text-muted-foreground">{slice.name}</span>
                    <span className="ml-auto text-xs font-semibold text-foreground">{slice.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[180px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-3"><PieChartIcon className="size-6 text-muted-foreground/30" /></div>
              <p className="text-sm font-semibold text-muted-foreground">No content data yet</p>
            </div>
          )}
        </BentoCardBody>
      </BentoCard>
    </div>
  );
}

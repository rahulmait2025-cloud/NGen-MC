'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BentoCard } from './bento-card';
import { BentoCardBody } from './bento-card-body';
import { BarChart3 } from 'lucide-react';
import type { ContentFunnelPoint } from '@/lib/superadmin/learning-analytics/types';
import {
  chartSectionSubtitleClass,
  chartSectionTitleClass,
  useLearningChartColors,
} from './chart-colors';
import { useGsapInView } from '@/components/_hooks/use-gsap-in-view';

export function ContentFunnelChart({ data, title = 'Course engagement funnel' }: { data: ContentFunnelPoint[]; title?: string }) {
  const colors = useLearningChartColors();
  const chartConfig = useMemo(
    () =>
      ({
        totalVideos: { label: 'Total lectures', color: colors.funnel.total },
        watchedVideos: { label: 'Watched', color: colors.funnel.watched },
        completedVideos: { label: 'Completed', color: colors.funnel.completed },
      }) satisfies ChartConfig,
    [colors]
  );
  const funnelFills = useMemo(
    () =>
      [
        { key: 'totalVideos' as const, fill: colors.funnel.total },
        { key: 'watchedVideos' as const, fill: colors.funnel.watched },
        { key: 'completedVideos' as const, fill: colors.funnel.completed },
      ] as const,
    [colors]
  );
  const wrapperRef = useGsapInView<HTMLDivElement>();
  const hasData = data.length > 0 && data.some((d) => d.watchedVideos > 0);

  return (
    <div ref={wrapperRef} className="min-w-0 max-w-full">
      <BentoCard>
        <BentoCardBody>
          <div className="mb-4 sm:mb-6">
            <h3 className={chartSectionTitleClass}>{title}</h3>
            <p className={chartSectionSubtitleClass}>How far students progress through each course</p>
          </div>
          {hasData ? (
            <div className="w-full min-w-0 max-w-full">
              <ChartContainer config={chartConfig} className="h-[240px] w-full max-w-full sm:h-[260px]">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} allowDecimals={false} />
                  <YAxis type="category" dataKey="courseTitle" tickLine={false} axisLine={false} width={1} tick={false} />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: colors.track, opacity: 0.6 }} />
                  {funnelFills.map(({ key, fill }) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={fill}
                      style={{ fill }}
                      radius={[0, 4, 4, 0]}
                    />
                  ))}
                  <ChartLegend
                    content={
                      <ChartLegendContent className="flex-wrap justify-center gap-x-4 gap-y-2 pt-2" />
                    }
                  />
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center sm:h-[260px]">
              <div className="rounded-full bg-muted p-3"><BarChart3 className="size-6 text-muted-foreground/30" /></div>
              <p className="text-sm font-semibold text-muted-foreground">No funnel data yet</p>
              <p className="max-w-[220px] text-xs text-muted-foreground">Course-level engagement breakdown will appear as students enroll and start watching.</p>
            </div>
          )}
        </BentoCardBody>
      </BentoCard>
    </div>
  );
}

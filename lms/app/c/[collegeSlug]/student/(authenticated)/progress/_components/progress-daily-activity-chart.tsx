'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from '@/lib/recharts-client';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const activityChartConfig = {
  hours: {
    label: 'Hours',
    color: 'oklch(0.72 0.19 45)',
  },
} satisfies ChartConfig;

interface ProgressDailyActivityChartProps {
  activityDays: { day: string; hours: number }[];
}

export function ProgressDailyActivityChart({ activityDays }: ProgressDailyActivityChartProps) {
  return (
    <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Last 7 days</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Watch hours per day</p>
        </div>
        <div className="h-[180px] sm:h-[220px] min-w-0">
          <ChartContainer
            id="progress-daily-activity"
            config={activityChartConfig}
            className="h-full w-full"
          >
            <BarChart data={activityDays} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="progressBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.19 45)" stopOpacity={1} />
                  <stop offset="100%" stopColor="oklch(0.72 0.19 45)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                opacity={0.05}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                cursor={{ fill: 'currentColor', opacity: 0.04 }}
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="hours" fill="url(#progressBarGradient)" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

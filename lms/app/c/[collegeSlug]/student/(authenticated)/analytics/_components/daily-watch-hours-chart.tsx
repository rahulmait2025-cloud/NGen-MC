'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { WeekDatePicker } from './week-date-picker';

const dailyChartConfig = {
  hours: {
    label: 'Hours',
    color: 'oklch(0.72 0.19 45)',
  },
  lectures: {
    label: 'Lectures',
    color: 'oklch(0.6 0.15 250)',
  },
} satisfies ChartConfig;

interface DailyWatchHoursChartProps {
  weekStart: string;
  formattedDaily: Array<{ day: string; hours: number; lectures: number }>;
  onWeekChange: (week: string) => void;
}

export function DailyWatchHoursChart({
  weekStart,
  formattedDaily,
  onWeekChange,
}: DailyWatchHoursChartProps) {
  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 pt-5 pb-3 border-b border-border/30 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
            <Calendar className="size-4 text-primary" />
            Daily Watch Hours
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Week of {weekStart}
          </CardDescription>
        </div>
        <WeekDatePicker value={weekStart} onChange={onWeekChange} />
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer
          config={dailyChartConfig}
          className="h-[200px] sm:h-[260px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={formattedDaily}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <defs>
              <linearGradient id="fillHours" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-hours)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-hours)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillLectures" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-lectures)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-lectures)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="hours"
              type="natural"
              fill="url(#fillHours)"
              fillOpacity={0.4}
              stroke="var(--color-hours)"
              stackId="a"
            />
            <Area
              dataKey="lectures"
              type="natural"
              fill="url(#fillLectures)"
              fillOpacity={0.4}
              stroke="var(--color-lectures)"
              stackId="b"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { MonthPicker } from './month-picker';

const weeklyChartConfig = {
  hours: {
    label: 'Hours',
    color: 'oklch(0.72 0.19 45)',
  },
  lectures: {
    label: 'Lectures',
    color: 'oklch(0.6 0.15 250)',
  },
} satisfies ChartConfig;

interface WeeklyWatchHoursChartProps {
  month: string;
  formattedWeekly: Array<{ week: string; hours: number; lectures: number }>;
  onMonthChange: (month: string) => void;
}

export function WeeklyWatchHoursChart({
  month,
  formattedWeekly,
  onMonthChange,
}: WeeklyWatchHoursChartProps) {
  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 pt-5 pb-3 border-b border-border/30 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
            <Calendar className="size-4 text-primary" />
            Weekly Watch Hours
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">Month {month}</CardDescription>
        </div>
        <MonthPicker value={month} onChange={onMonthChange} />
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer
          config={weeklyChartConfig}
          className="h-[200px] sm:h-[260px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={formattedWeekly}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
            <Bar dataKey="lectures" fill="var(--color-lectures)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

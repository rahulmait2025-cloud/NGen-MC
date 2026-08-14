'use client';

import React from 'react';
import { PlayCircle, BookOpen } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const courseProgressConfig = {
  completed: {
    label: 'Completed',
    color: 'oklch(0.6 0.2 160)',
  },
  started: {
    label: 'Started',
    color: 'oklch(0.72 0.19 45)',
  },
  notStarted: {
    label: 'Not Started',
    color: 'oklch(0.5 0.02 250)',
  },
} satisfies ChartConfig;

interface CourseProgressPieChartProps {
  courseProgressData: Array<{ name: string; value: number; fill: string }>;
}

export function CourseProgressPieChart({ courseProgressData }: CourseProgressPieChartProps) {
  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 pt-5 pb-3 border-b border-border/30 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
          <PlayCircle className="size-4 text-primary" />
          Course Progress
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Enrollment status across your curriculum
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {courseProgressData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
            <BookOpen className="size-8 mb-2 opacity-50" />
            <p>No course enrollments.</p>
          </div>
        ) : (
          <ChartContainer
            config={courseProgressConfig}
            className="mx-auto aspect-square h-[200px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={courseProgressData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                strokeWidth={2}
                stroke="var(--background)"
              >
                {courseProgressData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        {courseProgressData.length > 0 && (
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/30">
            {courseProgressData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: `var(--color-${d.name.toLowerCase().replace(' ', '')})` }}
                />
                <span className="text-xs text-muted-foreground">{d.name}</span>
                <span className="text-xs font-semibold ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

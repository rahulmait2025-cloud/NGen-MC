'use client';

import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
} from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BentoCardBody } from '@/components/student/bento-card';
import { Calendar, Clock, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const PIE_COLORS = ['oklch(0.72 0.19 45)', 'oklch(0.55 0.02 260)', 'oklch(0.65 0.2 45)', 'oklch(0.75 0.15 85)', 'oklch(0.5 0.15 145)'];

interface CourseProgressDatum {
  course: string;
  progress: number;
  totalHours: number;
  completedLectures: number;
  totalLectures: number;
}

interface LearningHoursDatum {
  date: string;
  hours: number;
}

export function LearningHoursChart({
  learningHours,
}: {
  learningHours: LearningHoursDatum[];
}) {
  return (
    <BentoCardBody className="!p-0">
      <div className="px-6 pt-5 pb-3 border-b border-border/20 flex items-center gap-2">
        <Calendar className="size-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Learning Hours Trend</h3>
          <p className="text-[10px] text-muted-foreground">Daily learning hours over the past 30 days</p>
        </div>
      </div>
      <div className="p-4">
        {learningHours.length > 0 ? (
          <div className="h-[200px] sm:h-[260px] min-w-0">
            <ChartContainer id="hours-trend-chart" config={{ hours: { label: 'Hours', color: 'oklch(0.72 0.19 45)' } } satisfies ChartConfig} className="h-full w-full">
              <AreaChart data={learningHours} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.19 45)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="oklch(0.72 0.19 45)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.4 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="hours" stroke="oklch(0.72 0.19 45)" strokeWidth={2} fill="url(#hoursGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }} />
              </AreaChart>
            </ChartContainer>
          </div>
        ) : (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No learning data</EmptyTitle>
              <EmptyDescription>
                Start watching to see your learning hours trend.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </BentoCardBody>
  );
}

export function TimeInvestmentChart({
  courseProgress,
}: {
  courseProgress: CourseProgressDatum[];
}) {
  return (
    <BentoCardBody className="!p-0">
      <div className="px-6 pt-5 pb-3 border-b border-border/20 flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Time Investment by Course</h3>
          <p className="text-[10px] text-muted-foreground">Hours spent per enrolled course</p>
        </div>
      </div>
      <div className="p-4">
        {courseProgress.length > 0 ? (
          <>
            <div className="h-[220px] sm:h-[280px] min-w-0 flex items-center justify-center">
              <ChartContainer id="time-investment-chart" config={{}} className="h-full w-full">
                <PieChart>
                  <Pie
                    data={courseProgress}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="totalHours"
                    nameKey="course"
                    strokeWidth={2}
                    stroke="var(--card)"
                  >
                    {courseProgress.map((c, i) => (
                      <Cell key={c.course} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {courseProgress.slice(0, 4).map((c, i) => (
                <div key={c.course} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[10px] text-muted-foreground">{c.course}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PieChartIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No course data</EmptyTitle>
              <EmptyDescription>
                Time investment will appear here once you start courses.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </BentoCardBody>
  );
}

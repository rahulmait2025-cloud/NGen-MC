'use client';

import type { ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
} from '@/lib/recharts-client';
import { CalendarDays, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker, MonthPicker } from '@/components/admin/date-picker';
import { BentoCard, BentoCardBody } from '@/components/admin/bento-card';
import { TransitionItem } from '@/components/admin/page-transition';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { CollegeVideoAnalyticsChartData } from '@/lib/services/college-video-analytics';
import type { CollegeVideoAnalyticsFilters } from '@/lib/services/college-video-analytics';
import { buildVideoAnalyticsSearchParams } from '@/lib/college-admin/analytics/parse-video-analytics-filters';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export { EngagementTiersChart, DayOfWeekActivityChart, ContentPieChart } from './analytics-charts';

/** Literal colors - SVG does not resolve hsl(var(--primary)) correctly. */
const HOURS_COLOR = 'oklch(0.7 0.19 45)';
const LECTURES_COLOR = 'oklch(0.65 0.15 250)';

const dailyChartConfig = {
  watchedHours: {
    label: 'Hours watched',
    color: HOURS_COLOR,
  },
  lecturesWatched: {
    label: 'Lectures watched',
    color: LECTURES_COLOR,
  },
} satisfies ChartConfig;

const weeklyChartConfig = {
  watchedHours: {
    label: 'Hours watched',
    color: HOURS_COLOR,
  },
  lecturesWatched: {
    label: 'Lectures watched',
    color: LECTURES_COLOR,
  },
} satisfies ChartConfig;

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] text-center text-sm text-muted-foreground px-4">
      <TrendingUp className="size-8 opacity-20 mb-2" />
      <p>{message}</p>
    </div>
  );
}

function WatchActivityLineChart({
  data,
  config,
  xKey,
  hoursGradientId,
  lecturesGradientId,
  xAxisProps,
}: {
  data: object[];
  config: ChartConfig;
  xKey: string;
  hoursGradientId: string;
  lecturesGradientId: string;
  xAxisProps?: ComponentProps<typeof XAxis>;
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  return (
    <ChartContainer
      config={config}
      className="relative h-[280px] w-full min-h-[280px] min-w-0 max-w-full [&_.recharts-surface]:overflow-visible"
    >
      <AreaChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
        <defs>
          <linearGradient id={hoursGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={HOURS_COLOR} stopOpacity={0.4} />
            <stop offset="100%" stopColor={HOURS_COLOR} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id={lecturesGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LECTURES_COLOR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={LECTURES_COLOR} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#e5e7eb" strokeOpacity={0.6} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          dy={8}
          {...xAxisProps}
        />
        <YAxis
          yAxisId="hours"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={44}
          tickFormatter={(v) => `${v}h`}
        />
        <YAxis
          yAxisId="lectures"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={36}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          yAxisId="hours"
          type="monotone"
          dataKey="watchedHours"
          stroke={HOURS_COLOR}
          strokeWidth={2.5}
          fill={`url(#${hoursGradientId})`}
          dot={{ r: 4, fill: HOURS_COLOR, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: HOURS_COLOR, stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={!prefersReducedMotion}
        />
        <Area
          yAxisId="lectures"
          type="monotone"
          dataKey="lecturesWatched"
          stroke={LECTURES_COLOR}
          strokeWidth={2.5}
          fill={`url(#${lecturesGradientId})`}
          dot={{ r: 4, fill: LECTURES_COLOR, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: LECTURES_COLOR, stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={!prefersReducedMotion}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function VideoAnalyticsCharts({
  basePath,
  appliedFilters,
  chartPeriods,
  chartData,
}: {
  basePath: string;
  appliedFilters: CollegeVideoAnalyticsFilters;
  chartPeriods: { weekStart: string | null; month: string | null };
  chartData: CollegeVideoAnalyticsChartData;
}) {
  const router = useRouter();

  const weekInputValue = chartPeriods.weekStart ?? chartData.weekStart;
  const monthInputValue = chartPeriods.month ?? chartData.month;

  const applyChartPeriods = (weekStart: string, month: string) => {
    const query = buildVideoAnalyticsSearchParams(appliedFilters, {
      weekStart,
      month,
    });
    router.push(query ? `${basePath}?${query}` : basePath);
  };

  const showGlobalEmpty =
    chartData.dailyWeek.every((d) => d.watchedHours === 0 && d.lecturesWatched === 0) &&
    (chartData.weeklyMonth.length === 0 ||
      chartData.weeklyMonth.every((w) => w.watchedHours === 0 && w.lecturesWatched === 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-xl border border-border/40 bg-muted/20 p-4">
        <div>
          <label htmlFor="date-week-start" className="text-xs text-muted-foreground block mb-1">
            Week starting (daily chart)
          </label>
          <DatePicker
            id="date-week-start"
            value={weekInputValue}
            onChange={(val) => {
              if (val) applyChartPeriods(val, monthInputValue);
            }}
            className="sm:w-44"
          />
        </div>
        <div>
          <label htmlFor="month-picker" className="text-xs text-muted-foreground block mb-1">
            Month (weekly chart)
          </label>
          <MonthPicker
            id="month-picker"
            value={monthInputValue}
            onChange={(val) => {
              if (val) applyChartPeriods(weekInputValue, val);
            }}
            className="sm:w-44"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-full sm:ml-auto"
          onClick={() => applyChartPeriods(chartData.weekStart, chartData.month)}
        >
          Reset periods
        </Button>
      </div>

      {showGlobalEmpty ? (
        <TransitionItem>
          <BentoCard>
            <BentoCardBody>
              <ChartEmpty message="No chart data for the selected period and filters. Try another week or month." />
            </BentoCardBody>
          </BentoCard>
        </TransitionItem>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
          <TransitionItem>
            <BentoCard className="overflow-hidden">
              <BentoCardBody className="!p-0">
                <div className="px-6 pt-5 pb-3 border-b border-border/20">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                    <CalendarDays className="size-4 text-primary" />
                    Daily watch activity
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Week of {chartData.weekStart} (UTC)
                  </p>
                </div>
                <div className="px-2 sm:px-4 pb-6 pt-4">
                  {chartData.dailyWeek.every((d) => d.watchedHours === 0 && d.lecturesWatched === 0) ? (
                    <ChartEmpty message="No daily watch activity this week." />
                  ) : (
                    <WatchActivityLineChart
                      data={chartData.dailyWeek}
                      config={dailyChartConfig}
                      xKey="dayLabel"
                      hoursGradientId="daily-hours-fill"
                      lecturesGradientId="daily-lectures-fill"
                    />
                  )}
                </div>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>

          <TransitionItem>
            <BentoCard className="overflow-hidden">
              <BentoCardBody className="!p-0">
                <div className="px-6 pt-5 pb-3 border-b border-border/20">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                    <CalendarDays className="size-4 text-primary" />
                    Weekly watch activity
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Month {chartData.month}</p>
                </div>
                <div className="px-2 sm:px-4 pb-6 pt-4">
                  {chartData.weeklyMonth.length === 0 ||
                  chartData.weeklyMonth.every((w) => w.watchedHours === 0 && w.lecturesWatched === 0) ? (
                    <ChartEmpty message="No weekly watch activity this month." />
                  ) : (
                    <WatchActivityLineChart
                      data={chartData.weeklyMonth}
                      config={weeklyChartConfig}
                      xKey="weekLabel"
                      hoursGradientId="weekly-hours-fill"
                      lecturesGradientId="weekly-lectures-fill"
                      xAxisProps={{
                        interval: 0,
                        angle: -10,
                        textAnchor: 'end',
                        height: 44,
                      }}
                    />
                  )}
                </div>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>
        </div>
      )}
    </div>
  );
}

const STATUS_PIE_COLORS: Record<string, string> = {
  not_started: 'oklch(0.5 0.02 250)',
  started: 'oklch(0.62 0.18 230)',
  active: 'oklch(0.7 0.19 45)',
  completed_lecture: 'oklch(0.6 0.2 160)',
};

const statusPieConfig = {
  count: { label: 'Students' },
} satisfies ChartConfig;

export function LearningStatusPieChart({
  data,
}: {
  data: Array<{ status: string; label: string; count: number }>
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const prefersReducedMotion = usePrefersReducedMotion()

  if (total === 0) {
    return (
      <div className="flex h-[200px] sm:h-[260px] lg:h-[280px] items-center justify-center text-xs text-muted-foreground">
        No student learning status data yet
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-4 h-[200px] sm:h-[260px] lg:h-[280px]">
      <ChartContainer
        config={statusPieConfig}
        className="relative h-full w-full min-w-0 max-w-[200px] aspect-square shrink-0 sm:max-w-none"
      >
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            strokeWidth={0}
            isAnimationActive={!prefersReducedMotion}
          >
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_PIE_COLORS[d.status] ?? 'oklch(0.5 0.02 250)'} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ChartContainer>
      <div className="flex flex-col gap-2.5 min-w-0">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2 min-w-0">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_PIE_COLORS[d.status] ?? 'oklch(0.5 0.02 250)' }}
            />
            <span className="text-xs text-muted-foreground truncate">{d.label}</span>
            <span className="text-xs font-semibold tabular-nums ml-auto">
              {Math.round((d.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

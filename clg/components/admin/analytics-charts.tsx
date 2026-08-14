'use client'

import { useMemo } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from '@/lib/recharts-client'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const performanceConfig = {
  avgScore: { label: "Avg Score", color: "oklch(0.7 0.19 45)" },
  submissions: { label: "Submissions", color: "oklch(0.65 0.15 250)" },
} satisfies ChartConfig;

const scoreDistConfig = {
  students: { label: "Students", color: "oklch(0.7 0.19 45)" },
} satisfies ChartConfig;

export function PerformanceTrendChart({ data }: { data: Array<{ week: string; avgScore: number; submissions: number }> }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  return (
    <ChartContainer config={performanceConfig} className="h-[200px] w-full min-w-0 max-w-full sm:h-[260px] lg:h-[280px]">
      <AreaChart data={data.length > 0 ? data : []}>
        <defs>
          <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.7 0.19 45)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="oklch(0.7 0.19 45)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area type="monotone" dataKey="avgScore" stroke="oklch(0.7 0.19 45)" fill="url(#perfGrad)" strokeWidth={2} isAnimationActive={!prefersReducedMotion} />
        <Area type="monotone" dataKey="submissions" stroke="oklch(0.65 0.15 250)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" isAnimationActive={!prefersReducedMotion} />
      </AreaChart>
    </ChartContainer>
  )
}

export function ScoreDistributionChart({ data }: { data: Array<{ range: string; students: number }> }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  return (
    <ChartContainer config={scoreDistConfig} className="h-[200px] w-full min-w-0 max-w-full sm:h-[260px] lg:h-[280px]">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="students" fill="oklch(0.7 0.19 45)" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
      </BarChart>
    </ChartContainer>
  )
}

const PIE_COLORS = [
  'oklch(0.65 0.22 160)',
  'oklch(0.7 0.19 45)',
  'oklch(0.55 0.12 250)',
]

const pieConfig = {
  value: { label: 'Lectures' },
} satisfies ChartConfig

export function ContentPieChart({
  data,
}: {
  data: { completed: number; inProgress: number; notStarted: number }
}) {
  const total = data.completed + data.inProgress + data.notStarted
  const prefersReducedMotion = usePrefersReducedMotion()
  const chartData = [
    { name: 'Completed', value: data.completed },
    { name: 'In Progress', value: data.inProgress },
    { name: 'Not Started', value: data.notStarted },
  ].filter((d) => d.value > 0)

  if (total === 0) {
    return (
      <div className="flex h-[200px] sm:h-[260px] lg:h-[280px] items-center justify-center text-xs text-muted-foreground">
        No lecture data yet
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 h-[200px] sm:h-[260px] sm:flex-row lg:h-[280px]">
      <ChartContainer config={pieConfig} className="h-full w-full min-w-0 max-w-[200px] aspect-square shrink-0 sm:max-w-none">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            strokeWidth={0}
            isAnimationActive={!prefersReducedMotion}
          >
            {chartData.map((d) => (
              <Cell key={d.name} fill={PIE_COLORS[chartData.indexOf(d) % PIE_COLORS.length]} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ChartContainer>
      <div className="flex flex-col gap-2.5 min-w-0">
        {chartData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 min-w-0">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="text-xs text-muted-foreground truncate">{d.name}</span>
            <span className="text-xs font-semibold tabular-nums ml-auto">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const tierConfig = {
  count: { label: 'Students', color: 'oklch(0.7 0.19 45)' },
} satisfies ChartConfig

const TIER_COLORS: Record<string, string> = {
  Dormant: 'oklch(0.78 0.06 45)',
  Occasional: 'oklch(0.75 0.1 45)',
  Regular: 'oklch(0.7 0.16 45)',
  Engaged: 'oklch(0.65 0.22 45)',
  Power: 'oklch(0.58 0.26 45)',
}

export function EngagementTiersChart({
  data,
}: {
  data: Array<{ tier: string; count: number; percentage: number }>
}) {
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data])
  const prefersReducedMotion = usePrefersReducedMotion()

  const sorted = useMemo(
    () => {
      const TIER_ORDER = ['Dormant', 'Occasional', 'Regular', 'Engaged', 'Power']
      return data.toSorted(
        (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
      )
    },
    [data],
  )

  if (total === 0) {
    return (
      <div className="flex h-[200px] sm:h-[260px] lg:h-[280px] items-center justify-center text-xs text-muted-foreground">
        No student engagement data yet
      </div>
    )
  }

  return (
    <ChartContainer config={tierConfig} className="h-[200px] w-full min-w-0 max-w-full sm:h-[260px] lg:h-[280px]">
      <BarChart data={sorted} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="tier" type="category" tick={{ fontSize: 11 }} width={80} />
        <ChartTooltip
          content={<ChartTooltipContent />}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={!prefersReducedMotion}>
          {sorted.map((entry) => (
            <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? 'oklch(0.7 0.19 45)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

const dayOfWeekConfig = {
  activeStudents: { label: 'Active Students', color: 'oklch(0.7 0.19 45)' },
  watchHours: { label: 'Watch Hours', color: 'oklch(0.6 0.15 250)' },
} satisfies ChartConfig

export function DayOfWeekActivityChart({
  data,
}: {
  data: Array<{ dayLabel: string; activeStudents: number; watchHours: number }>
}) {
  const total = useMemo(() => data.reduce((s, d) => s + d.activeStudents, 0), [data])
  const prefersReducedMotion = usePrefersReducedMotion()

  if (total === 0) {
    return (
      <div className="flex h-[200px] sm:h-[260px] lg:h-[280px] items-center justify-center text-xs text-muted-foreground">
        No weekly activity data yet
      </div>
    )
  }

  return (
    <ChartContainer config={dayOfWeekConfig} className="h-[200px] w-full min-w-0 max-w-full sm:h-[260px] lg:h-[280px]">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="activeStudents"
          fill="oklch(0.7 0.19 45)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={!prefersReducedMotion}
        />
        <Bar
          dataKey="watchHours"
          fill="oklch(0.6 0.15 250)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={!prefersReducedMotion}
        />
      </BarChart>
    </ChartContainer>
  )
}

const courseFunnelConfig = {
  total: { label: 'Total', color: 'oklch(0.75 0.08 45)' },
  watched: { label: 'Watched', color: 'oklch(0.68 0.18 45)' },
  completed: { label: 'Completed', color: 'oklch(0.6 0.25 45)' },
} satisfies ChartConfig

export function CourseFunnelChart({
  data,
}: {
  data: Array<{ courseTitle: string; totalLectures: number; watchedLectures: number; completedLectures: number }>
}) {
  const hasData = data.some((d) => d.totalLectures > 0)
  const prefersReducedMotion = usePrefersReducedMotion()

  const chartData = useMemo(
    () => data.map((d) => ({
      course: d.courseTitle.length > 20 ? `${d.courseTitle.slice(0, 20)}...` : d.courseTitle,
      total: d.totalLectures,
      watched: d.watchedLectures,
      completed: d.completedLectures,
    })),
    [data],
  )

  if (!hasData) {
    return (
      <div className="flex h-[200px] sm:h-[260px] lg:h-[280px] items-center justify-center text-xs text-muted-foreground">
        No course lecture data yet
      </div>
    )
  }

  return (
    <ChartContainer config={courseFunnelConfig} className="h-[200px] w-full min-w-0 max-w-full sm:h-[260px] lg:h-[280px]">
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="course" type="category" tick={{ fontSize: 10 }} width={110} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="total" stackId="a" fill="oklch(0.75 0.08 45)" radius={[0, 0, 0, 0]} isAnimationActive={!prefersReducedMotion} />
        <Bar dataKey="watched" stackId="a" fill="oklch(0.68 0.18 45)" isAnimationActive={!prefersReducedMotion} />
        <Bar dataKey="completed" stackId="a" fill="oklch(0.6 0.25 45)" radius={[0, 4, 4, 0]} isAnimationActive={!prefersReducedMotion} />
      </BarChart>
    </ChartContainer>
  )
}

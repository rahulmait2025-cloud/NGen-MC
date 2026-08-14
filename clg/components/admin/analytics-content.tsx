'use client';

import { useRef, useMemo, Suspense, memo } from 'react';
import dynamic from 'next/dynamic';
import {
  Users,
  Award,
  BookOpen,
  AlertTriangle,
  Target,
  Mail,
  Clock,
  Play,
  BarChart3,
  Activity,
  Layers,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { BentoCard, BentoCardBody } from '@/components/admin/bento-card';
import { PageTransition, TransitionItem } from '@/components/admin/page-transition';
import {
  PlacementPipelinePanel,
  LectureCompletionPanel,
  WeeklyEngagementSparkline,
} from '@/components/admin/performance-visuals';

const PerformanceTrendChart = dynamic(
  () => import('./analytics-charts').then((mod) => mod.PerformanceTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
    ),
  },
);

const ScoreDistributionChart = dynamic(
  () => import('./analytics-charts').then((mod) => mod.ScoreDistributionChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
    ),
  },
);

const ContentPieChart = dynamic(
  () => import('./analytics-charts').then((mod) => mod.ContentPieChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
    ),
  },
);

const EngagementTiersChart = dynamic(
  () => import('./analytics-charts').then((mod) => mod.EngagementTiersChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
    ),
  },
);

const DayOfWeekActivityChart = dynamic(
  () => import('./analytics-charts').then((mod) => mod.DayOfWeekActivityChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
    ),
  },
);

const CourseFunnelChart = dynamic(
  () => import('./analytics-charts').then((mod) => mod.CourseFunnelChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
    ),
  },
);

const AnimatedCounter = dynamic(
  () => import('./gsap-animation').then((mod) => mod.AnimatedCounter),
  { ssr: false, loading: () => <span className="text-xl font-bold text-foreground tabular-nums">0</span> },
);

interface KpiCardProps {
  label: string;
  value: number;
  suffix: string;
  icon: React.ComponentType<{ className?: string }>;
}

const KpiCard = memo(function KpiCard({ label, value, suffix, icon: Icon }: KpiCardProps) {
  return (
    <div className="min-w-0 rounded-[1.25rem] border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm transition-shadow duration-200 ease-[var(--ease-out)] hover:shadow-md sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-orange-soft flex items-center justify-center shrink-0">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium truncate">{label}</p>
          <AnimatedCounter
            value={value}
            suffix={suffix}
            className="text-xl font-bold text-foreground tabular-nums"
          />
        </div>
      </div>
    </div>
  );
});

interface AtRiskStudent {
  student_id: string;
  student_name: string;
  student_email: string;
  risk_status: string;
  last_active_at: string | null;
  avg_score: number | null;
  total_items: number;
  completed_items: number;
}

interface WatchMetricsData {
  totalWatchHours: number;
  totalWatchedLectures: number;
  totalCompletedLectures: number;
}

interface EngagementTierRow {
  tier: string;
  count: number;
  percentage: number;
}

interface RawWeeklyPerfRow {
  week_start: string;
  avg_score: number | string;
  submissions_count: number | string;
}

interface RawPlacementFunnel {
  not_ready_count: number;
  needs_improvement_count: number;
  interview_ready_count: number;
  placed_count: number;
  total_profiles: number;
}

interface RawLectureCompletionRow {
  courseTitle: string;
  totalLectures: number;
  watchedLectures: number;
  completedLectures: number;
  completionRate: number;
}

interface RawWeeklyEngagementRow {
  report_day: string;
  active_students: number;
}

interface RawScoreDistRow {
  score_range: string;
  student_count: number;
}

interface RawDayOfWeekRow {
  dayLabel: string;
  activeStudents: number;
  watchHours: number;
}

interface AnalyticsContentProps {
  kpis: {
    totalStudents: number;
    completionRate: number;
    placementRate: number;
    activeCourses: number;
    atRiskStudents: number;
    activeLearners: number;
    watchHours: number;
    avgCompletionPct: number;
  };
  rawWeeklyPerf: RawWeeklyPerfRow[];
  rawPlacementFunnel: RawPlacementFunnel | null;
  rawLectureCompletion: RawLectureCompletionRow[];
  rawWeeklyEngagement: RawWeeklyEngagementRow[];
  atRiskDetails?: AtRiskStudent[];
  rawScoreDist: RawScoreDistRow[];
  watchMetrics: WatchMetricsData;
  engagementTiers: EngagementTierRow[];
  rawDayOfWeekActivity: RawDayOfWeekRow[];
}

const EMPTY_RISK_DETAILS: AtRiskStudent[] = [];

function KpiGrid({ kpis }: { kpis: AnalyticsContentProps['kpis'] }) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <KpiCard label="Total Students" value={kpis.totalStudents} suffix="" icon={Users} />
      <KpiCard label="Completion Rate" value={kpis.completionRate} suffix="%" icon={Award} />
      <KpiCard label="Placement Rate" value={kpis.placementRate} suffix="%" icon={Target} />
      <KpiCard label="Active Courses" value={kpis.activeCourses} suffix="" icon={BookOpen} />
      <KpiCard label="At-Risk" value={kpis.atRiskStudents} suffix="" icon={AlertTriangle} />
      <KpiCard label="Active Learners" value={kpis.activeLearners} suffix="" icon={Play} />
      <KpiCard label="Watch Hours" value={kpis.watchHours} suffix="h" icon={BarChart3} />
      <KpiCard label="Avg Completion" value={kpis.avgCompletionPct} suffix="%" icon={Activity} />
    </div>
  );
}

function AtRiskTable({ students }: { students: AtRiskStudent[] }) {
  return (
    <BentoCard className="overflow-hidden">
      <BentoCardBody className="!p-0">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-rose-500">
            <AlertTriangle className="size-4" />
            At-Risk Students
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider pl-6">
                  Student
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">
                  Risk Reason
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">
                  Last Active
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">
                  Avg Score
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-right pr-6">
                  Progress
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => (
                  <TableRow
                    key={student.student_id}
                    className="border-border/30 hover:bg-muted/30 group transition-colors"
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {student.student_name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          {student.student_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-tighter',
                          student.risk_status.includes('Inactive')
                            ? 'border-rose-500/50 text-rose-500'
                            : student.risk_status.includes('Low')
                              ? 'border-amber-500/50 text-amber-500'
                              : 'border-zinc-500/50 text-zinc-400',
                        )}
                      >
                        {student.risk_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        <Clock className="size-3" />
                        <span>
                          {student.last_active_at
                            ? new Date(student.last_active_at).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm font-mono font-bold',
                          (student.avg_score ?? 0) < 40 ? 'text-rose-500' : 'text-foreground',
                        )}
                      >
                        {student.avg_score ? `${Math.round(student.avg_score)}%` : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-sm font-mono font-bold">
                          {student.total_items
                            ? Math.round((student.completed_items / student.total_items) * 100)
                            : 0}
                          %
                        </span>
<Progress
                            value={student.total_items ? (student.completed_items / student.total_items) * 100 : 0}
                            className="w-20 h-1.5"
                          />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-40 text-center text-muted-foreground italic"
                  >
                    No at-risk students detected in this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </BentoCardBody>
    </BentoCard>
  );
}

export function AnalyticsContent({
  kpis,
  rawWeeklyPerf,
  rawPlacementFunnel,
  rawLectureCompletion,
  rawWeeklyEngagement,
  atRiskDetails = EMPTY_RISK_DETAILS,
  rawScoreDist,
  watchMetrics: _watchMetrics,
  engagementTiers,
  rawDayOfWeekActivity,
}: AnalyticsContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const performanceTrend = useMemo(
    () =>
      rawWeeklyPerf.map((w, i) => ({
        week: `W${i + 1}`,
        avgScore: Math.round(Number(w.avg_score)),
        submissions: Number(w.submissions_count),
      })),
    [rawWeeklyPerf],
  );

  const placementPipeline = useMemo(
    () => [
      { stage: 'Not Ready', count: rawPlacementFunnel?.not_ready_count || 0 },
      { stage: 'Needs Work', count: rawPlacementFunnel?.needs_improvement_count || 0 },
      { stage: 'Interview Ready', count: rawPlacementFunnel?.interview_ready_count || 0 },
      { stage: 'Placed', count: rawPlacementFunnel?.placed_count || 0 },
    ],
    [rawPlacementFunnel],
  );

  const lectureCompletion = useMemo(
    () =>
      rawLectureCompletion.map((row) => ({
        courseTitle: row.courseTitle,
        totalLectures: row.totalLectures,
        watchedLectures: row.watchedLectures,
        completedLectures: row.completedLectures,
        completionRate: row.completionRate,
      })),
    [rawLectureCompletion],
  );

  const weeklyEngagement = useMemo(
    () =>
      rawWeeklyEngagement.map((row) => ({
        day: row.report_day,
        activeStudents: row.active_students,
      })),
    [rawWeeklyEngagement],
  );

  const scoreDistribution = useMemo(
    () =>
      rawScoreDist.map((s) => ({
        range: s.score_range,
        students: s.student_count,
      })),
    [rawScoreDist],
  );

  const dayOfWeekActivity = useMemo(
    () =>
      rawDayOfWeekActivity.map((d) => ({
        dayLabel: d.dayLabel,
        activeStudents: d.activeStudents,
        watchHours: d.watchHours,
      })),
    [rawDayOfWeekActivity],
  );

  const totalContent = useMemo(
    () =>
      lectureCompletion.reduce(
        (acc, row) => ({
          total: acc.total + row.totalLectures,
          watched: acc.watched + row.watchedLectures,
          completed: acc.completed + row.completedLectures,
        }),
        { total: 0, watched: 0, completed: 0 },
      ),
    [lectureCompletion],
  );

  const contentPie = useMemo(
    () => ({
      completed: totalContent.completed,
      inProgress: totalContent.watched - totalContent.completed,
      notStarted: totalContent.total - totalContent.watched,
    }),
    [totalContent],
  );

  return (
    <PageTransition>
      <div ref={containerRef} className="mx-auto w-full min-w-0 max-w-full space-y-10 overflow-x-hidden pb-16 xl:max-w-7xl">
        <TransitionItem>
          <KpiGrid kpis={kpis} />
        </TransitionItem>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4 min-w-0">
                  <h3 className="text-sm font-semibold text-card-foreground">Performance Trend</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Weekly avg. completion % and active learners
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
                  }
                >
                  <PerformanceTrendChart data={performanceTrend} />
                </Suspense>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>

          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-card-foreground">Score Distribution</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Students grouped by average assessment score
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
                  }
                >
                  <ScoreDistributionChart data={scoreDistribution} />
                </Suspense>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4 min-w-0">
                  <h3 className="text-sm font-semibold text-card-foreground">Content Summary</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lecture completion status across all courses
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
                  }
                >
                  <ContentPieChart data={contentPie} />
                </Suspense>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>

          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-card-foreground">Engagement Tiers</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Students classified by total watch time
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
                  }
                >
                  <EngagementTiersChart data={engagementTiers} />
                </Suspense>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4 min-w-0">
                  <h3 className="text-sm font-semibold text-card-foreground">Day-of-Week Activity</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Active students and watch hours by weekday
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
                  }
                >
                  <DayOfWeekActivityChart data={dayOfWeekActivity} />
                </Suspense>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>

          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                    <Layers className="size-4 text-primary" />
                    Course Funnel
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total, watched, and completed lectures per course
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="h-[200px] sm:h-[260px] lg:h-[280px] animate-pulse bg-muted/30 rounded-lg" />
                  }
                >
                  <CourseFunnelChart data={lectureCompletion} />
                </Suspense>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4 min-w-0">
                  <h3 className="text-sm font-semibold text-card-foreground">Weekly Engagement</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Unique students with video activity per day (last 4 weeks)
                  </p>
                </div>
                <WeeklyEngagementSparkline data={weeklyEngagement} />
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>

          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-card-foreground">Placement Pipeline</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Readiness stages from placement profiles
                  </p>
                </div>
                <PlacementPipelinePanel data={placementPipeline} />
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>
        </div>

        <TransitionItem>
          <AtRiskTable students={atRiskDetails} />
        </TransitionItem>

        <TransitionItem>
          <BentoCard>
            <BentoCardBody>
              <div className="mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                  <BookOpen className="size-4 text-primary" />
                  Lecture Completion by Course
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  How many published lectures have been watched or fully completed (college-wide)
                </p>
              </div>
              <LectureCompletionPanel data={lectureCompletion} />
            </BentoCardBody>
          </BentoCard>
        </TransitionItem>
      </div>
    </PageTransition>
  );
}

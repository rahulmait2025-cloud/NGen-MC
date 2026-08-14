'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Play, Target, Gauge, BarChart3, Layers, RefreshCw } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell } from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { TransitionItem } from '@/components/student/page-transition';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenant } from '@/providers/tenant-provider';
import { cn } from '@/lib/utils';
import type { ModuleAnalyticsDetail } from '@/lib/analytics/student-video-analytics-service';
import { getStudentVideoAnalytics } from '@/lib/api/student-client';
import { KpiCard } from '../kpi-card';
import { CourseCard } from '../course-card';
import {
  SUBJECT_COLORS,
  ENGAGEMENT_CONFIG,
  type CourseProgressDatum,
  type AvailableCourse,
} from '../unified-analytics';

export function CoursesTabContent({
  kpis,
  courseProgress,
  availableCourses,
  initialModules = [],
}: {
  kpis: {
    coursesEnrolled: number;
    completedCourses: number;
    startedCourses: number;
    avgCompletion: number;
    totalWatchSeconds: number;
  };
  courseProgress: CourseProgressDatum[];
  availableCourses: AvailableCourse[];
  initialModules?: ModuleAnalyticsDetail[];
}) {
  const { slug: collegeSlug } = useTenant();
  const useMinutes = kpis.totalWatchSeconds < 3600;
  
  const [coursePage, setCoursePage] = useState(1);
  const COURSES_PER_PAGE = 12;

  // Selected course to load module progress
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    availableCourses[0]?.id || ''
  );
  const [moduleProgress, setModuleProgress] = useState<ModuleAnalyticsDetail[]>(initialModules);
  const [loadingModules, setLoadingModules] = useState(false);

  // Client-side fetch for the selected course's modules
  useEffect(() => {
    // If the selected course is the first one, and we already have the initialModules, skip fetching.
    if (selectedCourseId === availableCourses[0]?.id && initialModules.length > 0) {
      return;
    }

    if (!selectedCourseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale data on selection change
      setModuleProgress([]);
      return;
    }

    let active = true;
    setLoadingModules(true);

    getStudentVideoAnalytics<{ ok: boolean; analytics: { moduleAnalytics?: ModuleAnalyticsDetail[] } }>({
      courseId: selectedCourseId,
      collegeSlug,
    })
      .then(json => {
        if (active && json.ok) {
          setModuleProgress(json.analytics.moduleAnalytics || []);
        }
      })
      .catch(err => console.error('[courses-tab] failed to fetch modules:', err))
      .finally(() => {
        if (active) setLoadingModules(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCourseId, collegeSlug, availableCourses, initialModules]);

  const courseCardData = useMemo(() => courseProgress.map((c, i) => ({
    name: c.course,
    progress: c.progress,
    displayTime: useMinutes ? `${Math.round(c.totalHours * 60)}m` : `${c.totalHours}h`,
    lessons: `${c.completedLectures}/${c.totalLectures}`,
    status: c.progress >= 100 ? 'complete' as const : c.progress > 0 ? 'active' as const : 'not-started' as const,
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    modules: [
      { name: 'Overall Progress', done: c.completedLectures, total: c.totalLectures },
    ],
  })), [courseProgress, useMinutes]);

  const totalCoursePages = Math.ceil(courseCardData.length / COURSES_PER_PAGE);
  const paginatedCourseData = useMemo(() => {
    const start = (coursePage - 1) * COURSES_PER_PAGE;
    return courseCardData.slice(start, start + COURSES_PER_PAGE);
  }, [courseCardData, coursePage]);

  const selectedCourseName = useMemo(() => {
    return availableCourses.find(c => c.id === selectedCourseId)?.title || '';
  }, [availableCourses, selectedCourseId]);

  const allMods = useMemo(() => {
    return moduleProgress.map((mod, gi) => ({
      name: mod.moduleTitle,
      course: selectedCourseName,
      done: mod.completedVideosCount,
      total: mod.totalVideosInModule,
      color: SUBJECT_COLORS[gi % SUBJECT_COLORS.length],
    }));
  }, [moduleProgress, selectedCourseName]);

  const courseEngagementData = useMemo(() => {
    return courseProgress.map((c, i) => {
      const hours = c.totalHours;
      const completion = c.progress;
      const velocity = c.totalHours > 0 ? Math.round((hours / c.totalHours) * 100) : 0;
      const score = Math.round(completion * 0.6 + Math.min(hours / 10, 1) * 40);
      return {
        course: c.course.length > 22 ? c.course.substring(0, 20) + '…' : c.course,
        fullCourse: c.course,
        hours: useMinutes ? Math.round(hours * 60) : hours,
        completion,
        velocity,
        score,
        color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
        totalLectures: c.totalLectures,
        completedLectures: c.completedLectures,
      };
    }).sort((a, b) => b.score - a.score);
  }, [courseProgress, useMinutes]);

  const moduleDifficultyData = useMemo(() => {
    return allMods
      .filter(m => m.total > 0)
      .map(m => {
        const pct = Math.round((m.done / m.total) * 100);
        return { ...m, pct, difficulty: pct < 40 ? 'Hard' : pct < 70 ? 'Medium' : 'Easy' };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 12);
  }, [allMods]);

  const courseTimeData = useMemo(() => {
    return courseProgress
      .filter(c => c.totalHours > 0)
      .map((c, i) => ({
        course: c.course.length > 18 ? c.course.substring(0, 16) + '…' : c.course,
        hours: useMinutes ? Math.round(c.totalHours * 60) : c.totalHours,
        fill: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);
  }, [courseProgress, useMinutes]);

  const courseEngagementBarData = useMemo(() => {
    return courseProgress.slice(0, 6).map(c => ({
      course: c.course.length > 16 ? c.course.substring(0, 14) + '…' : c.course,
      [useMinutes ? 'minutes' : 'hours']: useMinutes ? Math.round(c.totalHours * 60) : c.totalHours,
      completion: c.progress,
    }));
  }, [courseProgress, useMinutes]);

  return (
    <div className="space-y-8 mt-0 animate-in fade-in duration-300">
      <TransitionItem index={1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={BookOpen} label="Enrolled" value={kpis.coursesEnrolled} subtext="courses" index={0} />
          <KpiCard icon={CheckCircle2} label="Completed" value={kpis.completedCourses} subtext="courses finished" accent index={1} />
          <KpiCard icon={Play} label="In progress" value={kpis.startedCourses} subtext="actively learning" index={2} />
          <KpiCard icon={Target} label="Avg. score" value={kpis.avgCompletion} suffix="%" index={3} />
        </div>
      </TransitionItem>

      <TransitionItem index={2}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paginatedCourseData.map((c) => (
              <CourseCard key={c.name} {...c} />
            ))}
            {courseCardData.length === 0 && (
              <div className="col-span-2">
                <Empty className="py-12"><EmptyHeader><EmptyMedia variant="icon"><BookOpen className="size-6" /></EmptyMedia><EmptyTitle>No enrolled courses</EmptyTitle></EmptyHeader></Empty>
              </div>
            )}
          </div>
          {totalCoursePages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCoursePage(p => Math.max(1, p - 1))}
                    aria-disabled={coursePage === 1}
                    className={cn(coursePage === 1 && 'pointer-events-none opacity-50')}
                  />
                </PaginationItem>
                {Array.from({ length: totalCoursePages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === coursePage}
                      onClick={() => setCoursePage(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCoursePage(p => Math.min(totalCoursePages, p + 1))}
                    aria-disabled={coursePage === totalCoursePages}
                    className={cn(coursePage === totalCoursePages && 'pointer-events-none opacity-50')}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </TransitionItem>

      <TransitionItem index={3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Gauge className="size-4 text-primary" /></div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-semibold">Course engagement scores</h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="size-4 rounded-full bg-muted/50 flex items-center justify-center text-[9px] font-bold cursor-help">?</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Composite score: 60% course completion + 40% time investment relative to total course hours</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Completion + time investment combined</p>
              </div>
            </div>
            {courseEngagementData.length > 0 ? (
              <div className="space-y-3">
                {courseEngagementData.map((c) => (
                  <div key={c.fullCourse} className="group flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="size-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold cursor-help" style={{ background: `${c.color}20`, color: c.color }}>
                            {c.score}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Engagement: 60% completion + 40% time investment</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{c.fullCourse}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.completion}%`, background: c.color }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{c.completion}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold">{c.hours}{useMinutes ? 'm' : 'h'}</p>
                      <p className="text-[10px] text-muted-foreground">watched</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty className="h-[200px]"><EmptyHeader><EmptyMedia variant="icon"><Gauge className="size-6" /></EmptyMedia><EmptyTitle>No engagement data</EmptyTitle></EmptyHeader></Empty>
            )}
          </div>

          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="size-4 text-primary" /></div>
              <div>
                <h2 className="text-sm font-semibold">{useMinutes ? "Minutes vs completion" : "Hours vs completion"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Time invested alongside progress</p>
              </div>
            </div>
            {courseEngagementBarData.length > 0 ? (
              <div className="h-[220px]">
                <ChartContainer config={ENGAGEMENT_CONFIG} className="h-full w-full">
                  <BarChart data={courseEngagementBarData} margin={{ left: -20, right: 10 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                    <XAxis dataKey="course" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar yAxisId="left" dataKey={useMinutes ? "minutes" : "hours"} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} name={useMinutes ? "Minutes" : "Hours"} />
                    <Bar yAxisId="right" dataKey="completion" fill="var(--success)" radius={[4, 4, 0, 0]} maxBarSize={28} name="Completion %" opacity={0.7} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <Empty className="h-[220px]"><EmptyHeader><EmptyMedia variant="icon"><BarChart3 className="size-6" /></EmptyMedia><EmptyTitle>No data</EmptyTitle></EmptyHeader></Empty>
            )}
          </div>
        </div>
      </TransitionItem>

      <TransitionItem index={4}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-semibold">Course & Module Drill-down</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Select a course to inspect its module-level metrics.</p>
            </div>
            {availableCourses.length > 0 && (
              <div className="flex items-center gap-3">
                {loadingModules && <div className="animate-spin"><RefreshCw className="size-4 text-primary" /></div>}
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="w-full sm:w-[260px] h-9">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCourses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Target className="size-4 text-primary" /></div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-semibold">Module completion ranking</h2>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="size-4 rounded-full bg-muted/50 flex items-center justify-center text-[9px] font-bold cursor-help">?</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Ranked from lowest to highest completion rate</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Modules ranked by completion rate</p>
                </div>
              </div>
              {moduleProgress.length > 0 ? (
                <div className="space-y-2">
                  {moduleDifficultyData.map((m, idx) => {
                    return (
                      <div key={`${m.course}-${m.name}-${idx}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                        <span className="text-xs text-muted-foreground w-5 text-right font-mono">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium truncate">{m.name}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{m.course}</p>
                        </div>
                        <span className="text-xs font-mono font-semibold shrink-0">{m.pct}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty className="h-[200px]"><EmptyHeader><EmptyMedia variant="icon"><Target className="size-6" /></EmptyMedia><EmptyTitle>{loadingModules ? "Loading modules..." : "No modules found"}</EmptyTitle></EmptyHeader></Empty>
              )}
            </div>

            <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Layers className="size-4 text-primary" /></div>
                <div>
                  <h2 className="text-sm font-semibold">Time distribution</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{useMinutes ? "Minutes spent per course" : "Hours spent per course"}</p>
                </div>
              </div>
              {courseTimeData.length > 0 ? (
                <>
                  <div className="flex items-center justify-center h-[160px]">
                    <ChartContainer config={ENGAGEMENT_CONFIG} className="h-full w-full max-w-[180px]">
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="min-w-[11rem]" />} />
                        <Pie data={courseTimeData} dataKey="hours" nameKey="course" innerRadius={45} outerRadius={72} strokeWidth={2} stroke="var(--background)">
                          {courseTimeData.map((entry) => <Cell key={entry.course} fill={entry.fill} />)}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </div>
                  <div className="space-y-1.5">
                    {courseTimeData.slice(0, 5).map((c, i) => (
                      <div key={c.course} className="flex items-center gap-2 text-xs">
                        <span className="size-2.5 rounded-sm shrink-0" style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                        <span className="text-muted-foreground truncate flex-1">{c.course}</span>
                        <span className="font-semibold">{c.hours}{useMinutes ? 'm' : 'h'}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Empty className="h-[200px]"><EmptyHeader><EmptyMedia variant="icon"><Layers className="size-6" /></EmptyMedia><EmptyTitle>No time data</EmptyTitle></EmptyHeader></Empty>
              )}
            </div>
          </div>
        </div>
      </TransitionItem>

      <TransitionItem index={5}>
        <div className="border border-border/60 bg-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-4">
            <h2 className="text-sm font-semibold">Module progress</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Completion status for modules in the selected course</p>
          </div>
          {moduleProgress.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6">Module</TableHead>
                    <TableHead className="px-4">Course</TableHead>
                    <TableHead className="px-4 text-right">Videos</TableHead>
                    <TableHead className="px-4 w-40">Progress</TableHead>
                    <TableHead className="px-4 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMods.map((mod, idx) => {
                    const pct = Math.round((mod.done / Math.max(mod.total, 1)) * 100);
                    const status = mod.done >= mod.total ? 'Complete' : mod.done > 0 ? 'In progress' : 'Not started';
                    const statusClass = status === 'Complete' ? 'bg-success/15 text-success' : status === 'In progress' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' : 'bg-muted/50 text-muted-foreground';
                    return (
                      <TableRow key={`${mod.course}-${mod.name}-${idx}`}>
                        <TableCell className="px-6 font-medium">{mod.name}</TableCell>
                        <TableCell className="px-4 text-muted-foreground text-xs">{mod.course}</TableCell>
                        <TableCell className="px-4 text-right font-mono">{mod.done}/{mod.total}</TableCell>
                        <TableCell className="px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: mod.color }} />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold', statusClass)}>{status}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {loadingModules ? "Loading modules..." : "No modules found for the selected course"}
            </div>
          )}
        </div>
      </TransitionItem>
    </div>
  );
}

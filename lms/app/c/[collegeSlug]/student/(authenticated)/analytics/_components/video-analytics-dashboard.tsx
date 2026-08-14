'use client';

import React, { useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import {
  Clock,
  BookOpen,
  Target,
  Trophy,
  BarChart3,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useTenant } from '@/providers/tenant-provider';
import { Card, CardContent } from '@/components/ui/card';
import { PageTransition, TransitionItem } from '@/components/student/page-transition';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  StudentAnalyticsOverview,
  DailyAnalyticsRow,
  WeeklyAnalyticsRow,
  ModuleAnalyticsDetail,
  CoursePieChartData,
} from '@/lib/analytics/student-video-analytics-service';
import { getStudentVideoAnalytics } from '@/lib/api/student-client';

import { KpiCard } from './kpi-card';
import { DailyWatchHoursChart } from './daily-watch-hours-chart';
import { WeeklyWatchHoursChart } from './weekly-watch-hours-chart';
import { ModuleWiseAnalyticsList } from './module-wise-analytics-list';
import { CourseProgressPieChart } from './course-progress-pie-chart';

interface AvailableCourse {
  id: string;
  title: string;
}

interface AnalyticsApiResponse {
  overview: StudentAnalyticsOverview;
  pieChart: CoursePieChartData;
  dailyAnalytics: DailyAnalyticsRow[];
  weeklyAnalytics: WeeklyAnalyticsRow[];
  moduleAnalytics: ModuleAnalyticsDetail[];
  availableCourses: AvailableCourse[];
}

type DashboardAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_DATA'; data: AnalyticsApiResponse | null }
  | { type: 'SET_WEEK'; week: string }
  | { type: 'SET_MONTH'; month: string }
  | { type: 'SET_COURSE'; courseId: string }
  | { type: 'TOGGLE_MODULE'; moduleId: string }
  | { type: 'FETCH_SUCCESS'; data: AnalyticsApiResponse }
  | { type: 'FETCH_ERROR'; error: string };

interface DashboardState {
  loading: boolean;
  error: string | null;
  data: AnalyticsApiResponse | null;
  weekStart: string;
  month: string;
  selectedCourseId: string;
  expandedModuleId: string | null;
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_DATA':
      return { ...state, data: action.data };
    case 'SET_WEEK':
      return { ...state, weekStart: action.week };
    case 'SET_MONTH':
      return { ...state, month: action.month };
    case 'SET_COURSE':
      return { ...state, selectedCourseId: action.courseId };
    case 'TOGGLE_MODULE':
      return {
        ...state,
        expandedModuleId: state.expandedModuleId === action.moduleId ? null : action.moduleId,
      };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.data };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

export function VideoAnalyticsDashboard({ initialData }: { initialData?: AnalyticsApiResponse }) {
  const { slug: collegeSlug } = useTenant();

  const initialWeekStart = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  })();

  const initialMonth = new Date().toISOString().slice(0, 7);
  const initialCourseId = initialData?.availableCourses?.[0]?.id ?? '';

  const [state, dispatch] = useReducer(dashboardReducer, {
    loading: !initialData,
    error: null,
    data: initialData ?? null,
    weekStart: initialWeekStart,
    month: initialMonth,
    selectedCourseId: initialCourseId,
    expandedModuleId: null,
  });

  const courseIdRef = useRef(state.selectedCourseId);
  courseIdRef.current = state.selectedCourseId;

  const fetchInFlightRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);

  const fetchAnalytics = useCallback(async (courseIdOverride?: string) => {
    const activeCourseId = courseIdOverride !== undefined ? courseIdOverride : courseIdRef.current;
    const requestKey = `${state.weekStart}:${state.month}:${collegeSlug}:${activeCourseId}`;

    if (fetchInFlightRef.current === requestKey) {
      return;
    }
    fetchInFlightRef.current = requestKey;

    try {
      dispatch({ type: 'SET_ERROR', error: null });
      const json = await getStudentVideoAnalytics<{ ok: boolean; error?: string; analytics: AnalyticsApiResponse }>({
        weekStart: state.weekStart,
        month: state.month,
        collegeSlug,
        courseId: activeCourseId,
      });

      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch video analytics');
      }

      const analyticsData = json.analytics as AnalyticsApiResponse;
      dispatch({ type: 'FETCH_SUCCESS', data: analyticsData });

      if (!activeCourseId && analyticsData.availableCourses?.length > 0 && !courseIdRef.current) {
        dispatch({ type: 'SET_COURSE', courseId: analyticsData.availableCourses[0].id });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch({ type: 'FETCH_ERROR', error: msg });
    } finally {
      if (fetchInFlightRef.current === requestKey) {
        fetchInFlightRef.current = null;
      }
    }
  }, [state.weekStart, state.month, collegeSlug]);

  const fetchAnalyticsRef = useRef(fetchAnalytics);
  fetchAnalyticsRef.current = fetchAnalytics;

  useEffect(() => {
    if (isInitialMountRef.current && initialData) {
      isInitialMountRef.current = false;
      return;
    }
    fetchAnalyticsRef.current(state.selectedCourseId);
  }, [state.selectedCourseId, state.weekStart, state.month, initialData]);

  const handleCourseChange = (courseId: string) => {
    dispatch({ type: 'SET_COURSE', courseId });
    fetchAnalytics(courseId);
  };

  const toggleModule = (modId: string) => {
    dispatch({ type: 'TOGGLE_MODULE', moduleId: modId });
  };

  const formattedDaily = useMemo(() => {
    if (!state.data) return [];
    return state.data.dailyAnalytics.map((d) => ({
      day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      hours: d.watchedHours,
      lectures: d.lecturesWatched,
    }));
  }, [state.data]);

  const formattedWeekly = useMemo(() => {
    if (!state.data) return [];
    return state.data.weeklyAnalytics.map((w, idx) => ({
      week: `Week ${idx + 1}`,
      hours: w.watchedHours,
      lectures: w.lecturesWatched,
    }));
  }, [state.data]);

  const courseProgressData = useMemo(() => {
    if (!state.data) return [];
    const result = [];
    if (state.data.pieChart.completedCourses > 0) {
      result.push({ name: 'Completed', value: state.data.pieChart.completedCourses, fill: 'var(--color-completed)' });
    }
    if (state.data.pieChart.startedCourses > 0) {
      result.push({ name: 'Started', value: state.data.pieChart.startedCourses, fill: 'var(--color-started)' });
    }
    if (state.data.pieChart.notStartedCourses > 0) {
      result.push({ name: 'Not Started', value: state.data.pieChart.notStartedCourses, fill: 'var(--color-notStarted)' });
    }
    return result;
  }, [state.data]);

  if (state.loading && !state.data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[340px] rounded-2xl" />
          <Skeleton className="h-[340px] rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (state.error && !state.data) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center gap-3">
            <AlertCircle className="size-10 text-destructive opacity-80" />
            <h3 className="text-sm font-semibold text-foreground">Unable to Load Analytics</h3>
            <p className="text-sm text-muted-foreground max-w-md">{state.error}</p>
            <Button
              variant="default"
              size="sm"
              onClick={() => { dispatch({ type: 'SET_LOADING', loading: true }); fetchAnalytics(); }}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" /> Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  if (!state.data) return null;

  const { overview, moduleAnalytics, availableCourses } = state.data;

  return (
    <PageTransition>
      <div className="space-y-8">
        <TransitionItem index={0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard
              icon={Clock}
              label={overview.totalWatchSeconds < 3600 ? 'Watch Time' : 'Hours Watched'}
              value={
                overview.totalWatchSeconds < 60
                  ? Math.round(overview.totalWatchSeconds)
                  : overview.totalWatchSeconds < 3600
                  ? Math.round(overview.totalWatchSeconds / 60)
                  : Math.round(overview.totalHoursWatched * 10) / 10
              }
              suffix={overview.totalWatchSeconds < 60 ? 's' : overview.totalWatchSeconds < 3600 ? 'm' : 'h'}
            />
            <KpiCard
              icon={BookOpen}
              label="Lectures Watched"
              value={overview.totalLecturesWatched}
              subtext={`of ${overview.totalAvailableLectures} available`}
            />
            <KpiCard icon={Target} label="Enrolled Courses" value={overview.totalAvailableCourses} />
            <KpiCard icon={Trophy} label="Avg Completion" value={overview.averageCompletionPercentage} suffix="%" />
            <KpiCard icon={BarChart3} label="Courses in Progress" value={overview.startedCourses} />
          </div>
        </TransitionItem>

        <TransitionItem index={1}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyWatchHoursChart
              weekStart={state.weekStart}
              formattedDaily={formattedDaily}
              onWeekChange={(week) => dispatch({ type: 'SET_WEEK', week })}
            />
            <WeeklyWatchHoursChart
              month={state.month}
              formattedWeekly={formattedWeekly}
              onMonthChange={(m) => dispatch({ type: 'SET_MONTH', month: m })}
            />
          </div>
        </TransitionItem>

        <TransitionItem index={2}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ModuleWiseAnalyticsList
              selectedCourseId={state.selectedCourseId}
              availableCourses={availableCourses}
              moduleAnalytics={moduleAnalytics}
              expandedModuleId={state.expandedModuleId}
              onCourseChange={handleCourseChange}
              onToggleModule={toggleModule}
            />
            <CourseProgressPieChart courseProgressData={courseProgressData} />
          </div>
        </TransitionItem>
      </div>
    </PageTransition>
  );
}

'use client';

import { useCallback, useReducer, useRef } from 'react';
import { Loader2, User, BookOpen, Layers, PlayCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  CollegeStudentVideoDetailBundle,
  CollegeVideoAnalyticsFilters,
} from '@/lib/services/college-video-analytics';
import { buildVideoAnalyticsSearchParams } from '@/lib/college-admin/analytics/parse-video-analytics-filters';

function formatLastActive(iso: string | null): string {
  if (!iso) {
    return 'Never';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Never';
  }
  return date.toLocaleString();
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function buildDetailQuery(
  collegeId: string,
  studentId: string,
  courseId: string | null,
  appliedFilters: CollegeVideoAnalyticsFilters,
): string {
  const params = new URLSearchParams({ collegeId, studentId });
  if (courseId) {
    params.set('courseId', courseId);
  }
  const filterQuery = buildVideoAnalyticsSearchParams(appliedFilters);
  if (filterQuery) {
    const extra = new URLSearchParams(filterQuery);
    extra.forEach((value, key) => {
      params.set(key, value);
    });
  }
  return params.toString();
}

interface SummaryItemProps {
  label: string;
  value: string | number;
}

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-semibold tabular-nums mt-1">{value}</p>
    </div>
  );
}

type DetailState = {
  bundle: CollegeStudentVideoDetailBundle | null;
  loading: boolean;
  error: string | null;
};

type DetailAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; bundle: CollegeStudentVideoDetailBundle }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'RESET' };

function detailReducer(state: DetailState, action: DetailAction): DetailState {
  switch (action.type) {
    case 'LOAD_START':
      return { bundle: null, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return { bundle: action.bundle, loading: false, error: null };
    case 'LOAD_ERROR':
      return { bundle: null, loading: false, error: action.error };
    case 'RESET':
      return { bundle: null, loading: false, error: null };
  }
}

export function VideoAnalyticsStudentDetailSheet({
  collegeId,
  studentId,
  appliedFilters,
  open,
  onOpenChange,
}: {
  collegeId: string;
  studentId: string | null;
  appliedFilters: CollegeVideoAnalyticsFilters;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, dispatch] = useReducer(detailReducer, { bundle: null, loading: false, error: null });
  const selectedCourseId = state.bundle?.selectedCourseId ?? null;

  const prevOpenRef = useRef(open);
  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    if (!open) {
      dispatch({ type: 'RESET' });
    }
  }

  const loadDetail = useCallback(
    async (courseId: string | null) => {
      if (!studentId) {
        return;
      }
      dispatch({ type: 'LOAD_START' });
      try {
        const query = buildDetailQuery(collegeId, studentId, courseId, appliedFilters);
        const res = await fetch(`/api/admin/video-analytics/student-detail?${query}`);
        const json = (await res.json()) as {
          ok: boolean;
          data?: CollegeStudentVideoDetailBundle;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.error ?? 'Failed to load student detail.');
        }
        dispatch({ type: 'LOAD_SUCCESS', bundle: json.data });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load student detail.';
        dispatch({ type: 'LOAD_ERROR', error: message });
      }
    },
    [collegeId, studentId, appliedFilters],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && studentId) {
        loadDetail(null);
      }
      onOpenChange(nextOpen);
    },
    [studentId, loadDetail, onOpenChange],
  );

  const handleCourseChange = (courseId: string) => {
    loadDetail(courseId);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0"
      >
        <SheetHeader className="px-6 py-5 border-b border-border/30 text-left space-y-1">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <User className="size-5 text-primary" />
            Student video analytics
          </SheetTitle>
          <SheetDescription>
            Detailed learning progress from verified watch data (â‰¥90% or completed).
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6">
          {state.loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
              <Loader2 className="size-5 animate-spin" />
              Loading student analytics...
            </div>
          )}

          {!state.loading && state.error && (
            <Card className="border-destructive/30">
              <CardContent className="p-6 text-sm text-destructive">{state.error}</CardContent>
            </Card>
          )}

          {!state.loading && !state.error && state.bundle && (
            <>
              <StudentSummaryCard
                studentName={state.bundle.summary.studentName}
                studentEmail={state.bundle.summary.studentEmail}
                summary={state.bundle.summary}
              />

              <CourseProgressTable
                courses={state.bundle.courses}
                selectedCourseId={selectedCourseId}
                onCourseSelect={handleCourseChange}
              />

              {state.bundle.courses.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Module detail for</span>
                  <Select
                    value={selectedCourseId ?? undefined}
                    onValueChange={handleCourseChange}
                  >
                    <SelectTrigger className="h-9 text-sm w-full sm:max-w-md">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.bundle.courses.map((course) => (
                        <SelectItem key={course.courseId} value={course.courseId}>
                          {course.courseTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedCourseId && state.bundle.modules.length > 0 && (
                <ModuleProgressCard modules={state.bundle.modules} />
              )}

              <WatchedVideosTable
                videos={state.bundle.modules.flatMap((mod) => mod.videos)}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function roundHours(seconds: number): number {
  return Number((seconds / 3600).toFixed(2));
}

function StudentSummaryCard({
  studentName,
  studentEmail,
  summary,
}: {
  studentName: string | null;
  studentEmail: string | null;
  summary: CollegeStudentVideoDetailBundle['summary'];
}) {
  return (
    <>
      <div className="space-y-2">
        <h3 className="text-base font-semibold">{studentName ?? 'Unknown'}</h3>
        <p className="text-sm text-muted-foreground">{studentEmail ?? '-'}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryItem label="Hours watched" value={summary.totalWatchHours} />
        <SummaryItem label="Lectures watched" value={summary.lecturesWatched} />
        <SummaryItem label="Completed lectures" value={summary.completedLectures} />
        <SummaryItem
          label="Avg completion"
          value={`${Math.round(summary.averageCompletionPercentage)}%`}
        />
        <SummaryItem label="Courses started" value={summary.coursesStarted} />
        <SummaryItem label="Courses completed" value={summary.coursesCompleted} />
        <SummaryItem
          label="Last active"
          value={formatLastActive(summary.lastWatchedAt)}
        />
      </div>
    </>
  );
}

function CourseProgressTable({
  courses,
  selectedCourseId,
  onCourseSelect,
}: {
  courses: CollegeStudentVideoDetailBundle['courses'];
  selectedCourseId: string | null;
  onCourseSelect: (courseId: string) => void;
}) {
  return (
    <Card className="card-tier-1 border-0">
      <CardHeader className="py-4 px-5 border-b border-border/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          Course-wise progress
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {courses.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No course-level video progress recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-xs uppercase">Course</TableHead>
                  <TableHead className="text-xs uppercase text-right">Hours</TableHead>
                  <TableHead className="text-xs uppercase text-right">Watched</TableHead>
                  <TableHead className="text-xs uppercase text-right">Completed</TableHead>
                  <TableHead className="text-xs uppercase text-right pr-5">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow
                    key={course.courseId}
                    className={cn(
                      'cursor-pointer',
                      selectedCourseId === course.courseId && 'bg-primary/[0.04]',
                    )}
                    onClick={() => onCourseSelect(course.courseId)}
                  >
                    <TableCell className="pl-5 py-2.5 font-medium text-sm">
                      {course.courseTitle}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {course.totalWatchHours}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {course.lecturesWatched}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {course.completedLectures}
                    </TableCell>
                    <TableCell className="text-right pr-5 font-mono text-sm tabular-nums">
                      {Math.round(course.averageCompletionPercentage)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleProgressCard({
  modules,
}: {
  modules: CollegeStudentVideoDetailBundle['modules'];
}) {
  return (
    <Card className="card-tier-1 border-0">
      <CardHeader className="py-4 px-5 border-b border-border/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          Module-wise progress
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border/20">
        {modules.map((mod) => (
          <div key={mod.moduleId} className="px-5 py-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-sm">{mod.moduleTitle}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {mod.watchedVideos}/{mod.totalVideos} watched
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {mod.completedVideos} completed
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {roundHours(mod.totalWatchSeconds)}h
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WatchedVideosTable({
  videos,
}: {
  videos: CollegeStudentVideoDetailBundle['modules'][number]['videos'];
}) {
  const watchedVideos = videos.filter(
    (v) => v.completed || v.completionPercentage >= 90 || v.uniqueWatchedSeconds > 0,
  );

  return (
    <Card className="card-tier-1 border-0">
      <CardHeader className="py-4 px-5 border-b border-border/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PlayCircle className="size-4 text-primary" />
          Watched videos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {watchedVideos.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No watched videos for the selected course.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-xs uppercase min-w-[140px]">Lecture</TableHead>
                  <TableHead className="text-xs uppercase">Module</TableHead>
                  <TableHead className="text-xs uppercase text-right">Duration</TableHead>
                  <TableHead className="text-xs uppercase text-right">Unique</TableHead>
                  <TableHead className="text-xs uppercase text-right">Total</TableHead>
                  <TableHead className="text-xs uppercase text-right">Repeat</TableHead>
                  <TableHead className="text-xs uppercase text-right">%</TableHead>
                  <TableHead className="text-xs uppercase text-right">Done</TableHead>
                  <TableHead className="text-xs uppercase text-right pr-5">Last watched</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchedVideos.map((video) => (
                  <TableRow key={video.lessonId}>
                    <TableCell className="pl-5 py-2.5 text-sm font-medium max-w-[160px] truncate">
                      {video.lessonTitle}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {video.moduleTitle}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">
                      {formatSeconds(video.videoDurationSeconds)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">
                      {formatSeconds(video.uniqueWatchedSeconds)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">
                      {formatSeconds(video.totalVideoSecondsWatched)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">
                      {formatSeconds(video.repeatWatchedSeconds)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">
                      {Math.round(video.completionPercentage)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {video.completed ? (
                        <Badge className="text-[10px]">Yes</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-right pr-5 text-xs text-muted-foreground whitespace-nowrap"
                      suppressHydrationWarning
                    >
                      {formatLastActive(video.lastWatchedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

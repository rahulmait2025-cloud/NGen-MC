'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface CourseProgressRow {
  course: string;
  completion: number;
  enrolled: number;
}

export interface LectureCompletionRow {
  courseTitle: string;
  totalLectures: number;
  watchedLectures: number;
  completedLectures: number;
  completionRate: number;
}

export interface PipelineStageRow {
  stage: string;
  count: number;
}

export interface WeeklyEngagementRow {
  day: string;
  activeStudents: number;
}

const PIPELINE_STYLES: Record<string, { bar: string; badge: string }> = {
  'Not Ready': { bar: 'bg-zinc-400', badge: 'bg-zinc-500/15 text-zinc-600' },
  'Needs Work': { bar: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-700' },
  'Interview Ready': { bar: 'bg-primary', badge: 'bg-primary/15 text-primary' },
  Placed: { bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-700' },
};

function EmptyPanel({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint ? <p className="mt-1 max-w-sm text-xs text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

export function PlacementPipelinePanel({ data }: { data: PipelineStageRow[] }) {
  const total = data.reduce((sum, row) => sum + row.count, 0);

  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  if (total === 0) {
    return (
      <EmptyPanel
        message="No placement profiles for this college yet."
        hint="Students need placement profiles created before the readiness funnel appears here."
      />
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
      {data.map((row) => {
        const styles = PIPELINE_STYLES[row.stage] ?? PIPELINE_STYLES['Not Ready'];
        const heightPct = row.count > 0 ? Math.max(12, (row.count / maxCount) * 100) : 4;

        return (
          <div
            key={row.stage}
            className="flex flex-col rounded-lg border border-border/50 bg-muted/10 p-3"
          >
            <div className="flex flex-1 flex-col items-center justify-end gap-2 min-h-[120px]">
              <div className="relative flex w-full max-w-[48px] flex-1 items-end justify-center">
                <div
                  className={cn('w-full rounded-t-md transition-[height] duration-300', styles.bar)}
                  style={{ height: `${heightPct}%`, minHeight: row.count > 0 ? '1.5rem' : '4px' }}
                />
              </div>
              <span className="text-2xl font-bold tabular-nums text-foreground">{row.count}</span>
            </div>
            <p className="mt-2 text-center text-[11px] font-medium leading-tight text-muted-foreground">
              {row.stage}
            </p>
            <span
              className={cn(
                'mt-1.5 mx-auto inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                styles.badge,
              )}
            >
              {total > 0 ? Math.round((row.count / total) * 100) : 0}% of cohort
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LectureCompletionPanel({ data }: { data: LectureCompletionRow[] }) {
  const withActivity = useMemo(() => data.filter((row) => row.watchedLectures > 0 || row.completedLectures > 0), [data]);

  if (withActivity.length === 0) {
    const hasCourses = data.length > 0;
    return (
      <EmptyPanel
        message={
          hasCourses
            ? 'Lectures are assigned but none have been watched yet.'
            : 'No published lectures on assigned courses.'
        }
        hint="Data comes from student watch progress - same source as Video & leaderboard."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {withActivity.map((row) => {
        const watchPct =
          row.totalLectures > 0
            ? Math.round((row.watchedLectures / row.totalLectures) * 100)
            : 0;

        return (
          <div
            key={row.courseTitle}
            className="rounded-lg border border-border/50 bg-muted/15 p-4"
          >
            <p className="text-sm font-semibold text-foreground truncate">{row.courseTitle}</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
              <div>
                <p className="text-lg font-bold tabular-nums">{row.totalLectures}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-primary">{row.watchedLectures}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Watched</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-emerald-600">
                  {row.completedLectures}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Done</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Watch coverage</span>
                <span className="font-medium text-foreground">{watchPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${watchPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Fully completed</span>
                <span className="font-medium text-foreground">{row.completionRate}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${row.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WeeklyEngagementSparkline({ data }: { data: WeeklyEngagementRow[] }) {
  const max = useMemo(() => Math.max(...data.map((d) => d.activeStudents), 1), [data]);
  const hasActivity = data.some((d) => d.activeStudents > 0);

  if (!hasActivity) {
    return (
      <EmptyPanel
        message="No daily video activity in the last 4 weeks."
        hint="Engagement is counted when students open lectures (video sessions)."
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-end gap-1 h-[140px] sm:h-[160px]">
        {data.map((row) => {
          const heightPct = (row.activeStudents / max) * 100;
          return (
            <div
              key={row.day}
              className="group flex flex-1 flex-col items-center justify-end gap-1 min-w-0"
              title={`${row.day}: ${row.activeStudents} active`}
            >
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {row.activeStudents > 0 ? row.activeStudents : ''}
              </span>
              <div
                className={cn(
                  'w-full max-w-[20px] rounded-t-sm bg-primary/80 transition-[height]',
                  row.activeStudents === 0 && 'bg-muted',
                )}
                style={{ height: `${Math.max(heightPct, row.activeStudents > 0 ? 8 : 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {data.map((row, i) => (
          <span
            key={`${row.day}-label`}
            className={cn(
              'flex-1 text-center text-[9px] text-muted-foreground truncate min-w-0',
              i % 7 === 0 && 'font-medium',
            )}
          >
            {row.day.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

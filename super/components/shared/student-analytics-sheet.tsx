'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { BarChart3, BookOpen, Clock, GraduationCap, TrendingUp, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentAnalyticsAction } from '@/app/(app)/students/actions';
import type { LearningAnalyticsStudentResult } from '@/lib/superadmin/learning-analytics/types';

function formatWatchHours(hours: number): string {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return '0h';
  return `${h.toLocaleString('en-IN', { maximumFractionDigits: 1 })}h`;
}

function formatPercent(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
}

function formatActivityDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function KpiCard({ label, value, icon: Icon, accent }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className={cn('rounded-lg p-1.5 shrink-0', accent)}>
        <Icon className="size-3.5" />
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-base font-black tracking-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function CourseFunnelBar({ title, watched, total, completion }: {
  title: string;
  watched: number;
  total: number;
  completion: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{title}</p>
        <Progress
          value={Math.min(100, completion)}
          className="mt-1.5 h-1.5 bg-orange-500 [&>span]:bg-orange-500"
        />
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-black tabular-nums">{formatPercent(completion)}</p>
        <p className="text-[9px] text-muted-foreground">{watched}/{total} videos</p>
      </div>
    </div>
  );
}

interface StudentAnalyticsSheetProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  collegeId: string;
  studentName: string | null;
  studentEmail: string | null;
}

export function StudentAnalyticsSheet({
  open,
  onClose,
  studentId,
  collegeId,
  studentName,
  studentEmail,
}: StudentAnalyticsSheetProps) {
  const [data, setData] = useState<LearningAnalyticsStudentResult | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (!open || !studentId || !collegeId) return;
    const requestId = ++requestRef.current;
    getStudentAnalyticsAction(studentId, collegeId).then((res) => {
      if (requestId !== requestRef.current) return;
      if (res.ok && res.data) {
        setData(res.data);
      } else {
        setError(res.error ?? 'Failed to load analytics.');
      }
    });
  }, [open, studentId, collegeId]);

  const loading = data === undefined && !error && open;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:w-[460px] max-w-full sm:max-w-[460px] flex flex-col overflow-y-auto">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-orange-500" />
            Student Analytics
          </SheetTitle>
          {(studentName || studentEmail) && (
            <p className="text-xs text-muted-foreground font-medium">
              {studentName ?? '—'} &middot; {studentEmail ?? '—'}
            </p>
          )}
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="size-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              <p className="text-xs text-muted-foreground">Loading analytics...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <KpiCard
                  label="Watch Hours"
                  value={formatWatchHours(data.totals.totalWatchHours)}
                  icon={Clock}
                  accent="bg-orange-500/10 text-orange-600"
                />
                <KpiCard
                  label="Unique Hours"
                  value={formatWatchHours(data.totals.uniqueWatchHours)}
                  icon={TrendingUp}
                  accent="bg-emerald-500/10 text-emerald-600"
                />
                <KpiCard
                  label="Lectures Watched"
                  value={String(data.totals.lecturesWatched)}
                  icon={Video}
                  accent="bg-blue-500/10 text-blue-600"
                />
                <KpiCard
                  label="Completed"
                  value={String(data.totals.completedLectures)}
                  icon={BookOpen}
                  accent="bg-violet-500/10 text-violet-600"
                />
                <KpiCard
                  label="Avg Completion"
                  value={formatPercent(data.totals.averageCompletionPercentage)}
                  icon={GraduationCap}
                  accent="bg-amber-500/10 text-amber-600"
                />
                <KpiCard
                  label="Last Active"
                  value={formatActivityDate(data.totals.lastActivityAt)}
                  icon={Clock}
                  accent="bg-slate-500/10 text-slate-600"
                />
              </div>

              {data.courseFunnel.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Course Progress</p>
                  <div className="space-y-3 rounded-lg border border-border/50 bg-muted/5 p-3">
                    {data.courseFunnel.map((course) => (
                      <CourseFunnelBar
                        key={course.courseId}
                        title={course.courseTitle}
                        watched={course.watchedVideos}
                        total={course.totalVideos}
                        completion={course.completionPercentage}
                      />
                    ))}
                  </div>
                </div>
              )}

              {data.courseFunnel.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/40 bg-muted/5 p-6 text-center">
                  <p className="text-xs text-muted-foreground">No course enrollment data yet.</p>
                </div>
              )}

              {data.moduleBreakdown.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Module Breakdown</p>
                  <div className="space-y-1.5">
                    {data.moduleBreakdown.slice(0, 6).map((mod) => (
                      <div key={mod.moduleId} className="flex items-center justify-between gap-2 rounded-md border border-border/30 bg-muted/5 px-3 py-2">
                        <p className="truncate text-xs font-semibold flex-1">{mod.moduleTitle}</p>
                        <span className="shrink-0 text-[10px] font-black tabular-nums text-muted-foreground">
                          {formatPercent(mod.averageCompletionPercentage)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Play, BookOpen, CheckCircle, TrendingUp, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { getStudentDetail } from '@/lib/services/student';

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Play;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card-tier-1 rounded-xl p-4 flex items-center gap-4">
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

function getCompletionColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-amber-500'
        : 'bg-red-500';
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-200 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export default async function StudentActivityPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; id: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, id } = await params;

  const { tenant } = await requireCollegeAdmin(collegeSlug);
  if (!tenant) notFound();

  const data = await getStudentDetail(tenant.id, id);
  if (!data) notFound();

  const { student, performance, courses, recentActivity } = data;
  const backHref = `/c/${collegeSlug}/admin/students`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Students
      </Link>

      <div className="card-tier-1 rounded-xl p-5 sm:p-6 flex items-center gap-5">
        <Avatar className="size-14">
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {getInitials(student.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {student.full_name ?? 'Unknown Student'}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>{student.email ?? '—'}</span>
            {student.student_code && (
              <>
                <span className="text-border hidden sm:inline">|</span>
                <Badge variant="outline" className="font-mono text-[10px] border-border/40">
                  {student.student_code}
                </Badge>
              </>
            )}
            {performance?.lastWatchedAt && (
              <>
                <span className="text-border hidden sm:inline">|</span>
                <span className="text-xs">
                  Last active: {formatDate(performance.lastWatchedAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {performance ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              icon={Play}
              label="Watch Hours"
              value={performance.totalWatchHours.toFixed(1)}
            />
            <KpiCard
              icon={BookOpen}
              label="Lectures Watched"
              value={performance.lecturesWatched}
            />
            <KpiCard
              icon={CheckCircle}
              label="Completed"
              value={performance.completedLectures}
            />
            <KpiCard
              icon={Target}
              label="Avg Completion"
              value={`${Math.round(performance.averageCompletionPercentage)}%`}
            />
            <KpiCard
              icon={TrendingUp}
              label="Courses Started"
              value={performance.coursesStarted}
            />
            <KpiCard
              icon={TrendingUp}
              label="Courses Done"
              value={performance.coursesCompleted}
            />
          </div>

          {courses.length > 0 && (
            <div className="card-tier-1 rounded-xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <BookOpen className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Course Progress</h2>
              </div>
              <div className="space-y-4">
                {courses.map((course, i) => (
                  <div
                    key={course.courseId}
                    className="space-y-2"
                    style={{
                      animation: `row-enter 0.3s ease-out both`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-foreground truncate">
                        {course.courseTitle}
                      </p>
                      <span
                        className={`text-xs font-semibold tabular-nums shrink-0 ${getCompletionColor(course.averageCompletionPercentage)}`}
                      >
                        {Math.round(course.averageCompletionPercentage)}%
                      </span>
                    </div>
                    <ProgressBar pct={course.averageCompletionPercentage} />
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{course.completedLectures} / {course.lecturesWatched} lectures</span>
                      <span className="text-border">|</span>
                      <span>{course.totalWatchHours.toFixed(1)} hrs watched</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card-tier-1 rounded-xl p-8 text-center">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Target className="size-5 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-foreground">No performance data yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Performance tracking data will appear once the student starts engaging with course content.
          </p>
        </div>
      )}

      <div className="card-tier-1 rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        </div>

        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-3">
              <Clock className="size-4 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">No recent activity logged</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border/20">
            {recentActivity.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 py-3"
                style={{
                  animation: `row-enter 0.3s ease-out both`,
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{entry.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(entry.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

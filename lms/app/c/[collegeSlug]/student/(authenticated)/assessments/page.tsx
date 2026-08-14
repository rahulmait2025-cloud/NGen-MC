import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAssignedAssessments } from '@/lib/services/assessments';
import { PlayCircle, CheckCircle2, Clock, Sparkles, Trophy, Target, ArrowRight } from 'lucide-react';
import { studentBasePath } from '@/lib/student/student-home-route';

type StudentAssessmentsPageProps = {
  params: Promise<{ collegeSlug: string }>;
};

function AssessmentsListSkeleton(): ReactNode {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-2xl border border-border/50 bg-card/40 p-6" />
      ))}
    </div>
  );
}

async function AssessmentsList({ collegeSlug }: { collegeSlug: string }): Promise<ReactNode> {
  const assignments = await getAssignedAssessments(collegeSlug);
  const base = studentBasePath(collegeSlug);

  const completedCount = assignments.filter((a) => {
    const last = a.attempts?.[a.attempts.length - 1];
    return last?.status === 'submitted' || last?.status === 'time_expired' || last?.status === 'auto_submitted';
  }).length;

  const pendingCount = assignments.length - completedCount;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-xs backdrop-blur-xl">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Target className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Assigned</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{assignments.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-xs backdrop-blur-xl">
          <div className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Action</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{pendingCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-xs backdrop-blur-xl">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Trophy className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Assessment List */}
      {assignments.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-border/70 bg-card/40 p-10 sm:p-14 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <CheckCircle2 className="size-7" />
          </div>
          <h3 className="text-xl font-bold text-foreground">You&apos;re All Caught Up!</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            You have no pending assessments assigned by your mentors at this time. Keep practicing your skills with courses or problem sheets!
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="rounded-xl font-semibold shadow-sm">
              <Link href={`${base}/courses`}>
                Browse Courses <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl font-semibold">
              <Link href={`${base}/sheets`}>
                Practice Sheets
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {assignments.map((assignment) => {
            const hasAttempts = assignment.attempts?.length > 0;
            const latestAttempt = hasAttempts ? assignment.attempts[assignment.attempts.length - 1] : null;
            const isCompleted =
              latestAttempt?.status === 'submitted' ||
              latestAttempt?.status === 'time_expired' ||
              latestAttempt?.status === 'auto_submitted';
            const isInProgress = latestAttempt?.status === 'in_progress';
            const attemptsCount = assignment.attempts?.length || 0;
            const maxAttempts = assignment.assessment.max_attempts;
            const canAttempt = attemptsCount < maxAttempts;

            return (
              <li key={assignment.id}>
                <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl border border-border/60 bg-card p-6 shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-300">
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg font-bold text-foreground truncate">
                        {assignment.assessment.title}
                      </h3>
                      {isCompleted ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15">
                          <CheckCircle2 className="size-3 mr-1" /> Completed
                        </Badge>
                      ) : isInProgress ? (
                        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/15">
                          <Clock className="size-3 mr-1 animate-pulse" /> In Progress
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Pending
                        </Badge>
                      )}
                      {assignment.assessment.time_limit_minutes ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <Clock className="size-3 mr-1" /> {assignment.assessment.time_limit_minutes}m limit
                        </Badge>
                      ) : null}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {assignment.assessment.description || 'No specific instructions provided for this assessment.'}
                    </p>

                    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground pt-1">
                      <span className="rounded-lg bg-muted/50 px-2.5 py-1">
                        Attempts used: <strong className="text-foreground">{attemptsCount} / {maxAttempts}</strong>
                      </span>
                      {assignment.due_date ? (
                        <span className="rounded-lg bg-muted/50 px-2.5 py-1" suppressHydrationWarning>
                          Due: <strong className="text-foreground">{new Date(assignment.due_date).toLocaleDateString()}</strong>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    {isCompleted ? (
                      <Button variant="outline" size="sm" asChild className="rounded-xl font-semibold border-border/80">
                        <Link href={`/c/${encodeURIComponent(collegeSlug)}/student/assessments/${assignment.id}/result`}>
                          View Results
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        asChild
                        disabled={!canAttempt && !isInProgress}
                        className="rounded-xl font-semibold shadow-sm bg-[var(--landing-orange)] text-white hover:bg-[var(--landing-orange)]/90"
                      >
                        <Link href={`/c/${encodeURIComponent(collegeSlug)}/student/assessments/${assignment.id}/attempt`}>
                          <PlayCircle className="size-4 mr-1.5" />
                          {isInProgress ? 'Resume Attempt' : 'Start Assessment'}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default async function StudentAssessmentsPage({
  params,
}: StudentAssessmentsPageProps): Promise<ReactNode> {
  const { collegeSlug } = await params;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16 pt-4">
      {/* Header Banner */}
      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-4 py-1.5 animate-badge-shimmer animate-badge-pulse-glow">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
          </span>
          <Sparkles className="size-3.5 text-[var(--landing-orange)] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--landing-orange)]">
            Assessments & Quizzes
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
          My Assessments
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Complete your assigned quizzes, coding tests, and timed skill evaluations to track your knowledge and unlock certificates.
        </p>
      </div>

      <Suspense fallback={<AssessmentsListSkeleton />}>
        <AssessmentsList collegeSlug={collegeSlug} />
      </Suspense>
    </div>
  );
}

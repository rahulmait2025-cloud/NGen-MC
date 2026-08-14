import { Suspense } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentRouteLoadingShell } from '@/components/student/student-route-loading-shell';
import { requireStudent } from '@/lib/auth/require-student';
import {
  getDashboardAnalyticsPresentation,
  getDashboardContinueLearning,
  getDashboardCoursesData,
  getDashboardTodos,
  getDashboardBundlesAndMentorshipData,
} from '@/lib/services/dashboard-data';
import type { DashboardSummaryMetric, DashboardCourseRow, DashboardTodoData } from '@/lib/services/dashboard-data';
import type { StudentLearningContext } from '@/lib/services/student-courses';
import type { Todo } from '@/lib/actions/student-todos';
import { DashboardSummaryCards } from './_components/dashboard-summary-cards';
import { DashboardGreeting } from './_components/dashboard-greeting';

export type { DashboardSummaryMetric, DashboardCourseRow, DashboardTodoData };

// ─── Section components ───────────────────────────────────────────────────────

async function DashboardAnalyticsSection({
  firstName,
  context,
  collegeSlug,
}: {
  firstName: string;
  context: StudentLearningContext;
  collegeSlug: string;
}) {
  const [analytics, continueCard] = await Promise.all([
    getDashboardAnalyticsPresentation(context),
    getDashboardContinueLearning(collegeSlug, context),
  ]);

  const { DashboardStreakCalendar } = await import('./_components/dashboard-streak-calendar');
  const { DashboardWeeklyActivity } = await import('./_components/dashboard-weekly-activity');
  const { DashboardContinueLearning } = await import('./_components/dashboard-continue-learning');

  return (
    <>
      <DashboardGreeting firstName={firstName} streak={analytics.streak.currentStreak} />
      <DashboardSummaryCards metrics={analytics.metrics} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <DashboardStreakCalendar
            currentStreak={analytics.streak.currentStreak}
            longestStreak={analytics.streak.longestStreak}
            visitDates={analytics.streak.visitDates}
            activeDaysThisMonth={analytics.streak.activeDaysThisMonth}
            todayLocalDate={analytics.streak.todayLocalDate}
            joinedAt={undefined}
          />
        </div>
        <div className="lg:col-span-3 space-y-4 sm:space-y-6 flex flex-col justify-between">
          <DashboardWeeklyActivity analytics={analytics.weekly} />
          {continueCard && <DashboardContinueLearning card={continueCard} />}
        </div>
      </div>
    </>
  );
}

async function CoursesSection({
  collegeSlug,
  context,
}: {
  collegeSlug: string;
  context: StudentLearningContext;
}) {
  const { courses } = await getDashboardCoursesData(collegeSlug, context);
  const { DashboardCourses } = await import('./_components/dashboard-courses');
  return <DashboardCourses courses={courses} collegeSlug={collegeSlug} />;
}

async function TodoListSection({ collegeSlug, context }: { collegeSlug: string; context: StudentLearningContext }) {
  const allTodos = await getDashboardTodos(context.studentId);
  const { DashboardTodoList } = await import('./_components/dashboard-todo-list');
  return (
    <DashboardTodoList
      collegeSlug={collegeSlug}
      initialTodos={allTodos as unknown as Record<string, Todo[]>}
    />
  );
}

async function BundlesSection({
  collegeSlug,
  context,
}: {
  collegeSlug: string;
  context: StudentLearningContext;
}) {
  const { purchasedBundles, upcomingMentorshipSessions, upcomingPaidBookings } =
    await getDashboardBundlesAndMentorshipData(collegeSlug, context.studentId, context.userId, context.collegeId);

  const bundlesComp = purchasedBundles && purchasedBundles.length > 0
    ? (await import('./_components/dashboard-bundles')).DashboardBundles
    : null;
  const mentorshipComp = upcomingMentorshipSessions.length > 0
    ? (await import('./_components/dashboard-mentorship-sessions')).DashboardMentorshipSessions
    : null;
  const paidComp = upcomingPaidBookings.length > 0
    ? (await import('./_components/dashboard-paid-bookings')).DashboardPaidBookings
    : null;

  const BundlesComp = bundlesComp;
  const MentorshipComp = mentorshipComp;
  const PaidComp = paidComp;

  return (
    <>
      {BundlesComp && <BundlesComp bundles={purchasedBundles} collegeSlug={collegeSlug} />}
      {PaidComp && <PaidComp bookings={upcomingPaidBookings} />}
      {MentorshipComp && <MentorshipComp sessions={upcomingMentorshipSessions} />}
    </>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function GreetingSkeleton() {
  return (
    <div className="space-y-1">
      <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.15] text-foreground flex items-center gap-1.5">
        Hello, <Skeleton className="h-8 w-24 inline-block animate-pulse" />
      </h1>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Skeleton className="h-4 w-40 animate-pulse" />
      </div>
    </div>
  );
}

function SummaryCardsSkeleton() {
  const labels = ['Hours watched', 'Courses enrolled', 'Lessons completed', 'Day streak'];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
      {labels.map((label, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-2">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <Skeleton className="h-8 w-16 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function StreakCalendarSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Flame className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Streak</h2>
            <Skeleton className="h-3 w-28 animate-pulse mt-0.5" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame className="size-3.5 text-primary/40" />
            <Skeleton className="h-4 w-6 animate-pulse" />
            <span className="text-xs text-muted-foreground">current</span>
          </div>
          <div className="w-px h-4 bg-border/60" />
          <div className="flex items-center gap-1.5">
            <Trophy className="size-3.5 text-primary/20" />
            <Skeleton className="h-4 w-6 animate-pulse" />
            <span className="text-xs text-muted-foreground">best</span>
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
        <Skeleton className="h-[180px] w-full rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function WeeklyActivitySkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 animate-pulse" />
        <Skeleton className="h-4 w-20 animate-pulse" />
      </div>
      <Skeleton className="h-[140px] w-full rounded-lg animate-pulse" />
    </div>
  );
}

function DashboardAnalyticsSkeleton() {
  return (
    <>
      <GreetingSkeleton />
      <SummaryCardsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <StreakCalendarSkeleton />
        </div>
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          <WeeklyActivitySkeleton />
          <div className="rounded-2xl border border-border/60 bg-card p-5 h-28 animate-pulse" />
        </div>
      </div>
    </>
  );
}

function CoursesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32 animate-pulse" />
        <Skeleton className="h-4 w-20 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-3/4 animate-pulse" />
            <Skeleton className="h-3 w-1/2 animate-pulse" />
            <Skeleton className="h-2 w-full rounded-full animate-pulse mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TodoListSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <Skeleton className="h-6 w-28 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;

  return (
    <Suspense fallback={<StudentRouteLoadingShell />}>
      <StudentDashboardPageContent collegeSlug={collegeSlug} />
    </Suspense>
  );
}

async function StudentDashboardPageContent({
  collegeSlug,
}: {
  collegeSlug: string;
}) {
  const ctx = await requireStudent(collegeSlug);
  const { studentId, isGlobal, user, membership, tenant } = ctx;
  const collegeId = membership?.collegeId ?? null;
  const learningContext: StudentLearningContext = {
    studentId,
    userId: user.id,
    collegeId,
    isGlobal,
    tenantSlug: tenant.slug,
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* 1. Related analytics: greeting, cards, streak calendar, weekly chart, and continue learning */}
      <Suspense fallback={<DashboardAnalyticsSkeleton />}>
        <DashboardAnalyticsSection
          firstName={user.fullName ?? ''}
          context={learningContext}
          collegeSlug={collegeSlug}
        />
      </Suspense>

      {/* 2. Bundles & Mentorship section (if enrolled) */}
      <Suspense fallback={null}>
        <BundlesSection collegeSlug={collegeSlug} context={learningContext} />
      </Suspense>

      {/* 3. Courses and Todo lists */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="lg:col-span-3">
          <Suspense fallback={<CoursesSkeleton />}>
            <CoursesSection
              collegeSlug={collegeSlug}
              context={learningContext}
            />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<TodoListSkeleton />}>
            <TodoListSection collegeSlug={collegeSlug} context={learningContext} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listFreeCourses } from '@/lib/free-courses/free-course-service';
import {
  getFreeCoursesListMetrics,
  getFreeCoursesOverviewAnalytics,
} from '@/lib/free-courses/free-course-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FreeCoursesTable } from './free-courses-client';

function FreeCoursesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted/20 animate-pulse" />
      <div className="grid grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function FreeCoursesContent() {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const [courses, overview, listMetrics] = await Promise.all([
    listFreeCourses(),
    getFreeCoursesOverviewAnalytics(),
    getFreeCoursesListMetrics(),
  ]);

  const kpiCards = [
    { label: 'Total Free Courses', value: overview.totalFreeCourses },
    { label: 'Published', value: overview.publishedFreeCourses },
    { label: 'Enrollments', value: overview.totalEnrollments },
    { label: 'Active Learners', value: overview.totalActiveLearners },
    { label: 'Average Completion', value: `${overview.averageCompletionPercent}%` },
    { label: 'YouTube Lessons', value: overview.totalYoutubeLessons },
    { label: 'Premium Lessons', value: overview.totalTpstreamsLessons },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Free Courses</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Create curated free courses using selected YouTube playlist lectures and platform-only premium lectures.
          </p>
        </div>
        <Button asChild>
          <Link href="/free-courses/new">
            <Plus className="mr-2 size-4" />
            Create Free Course
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-semibold tabular-nums mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Free Courses</CardTitle>
          <CardDescription>
            DB-backed free courses stored as master courses with dedicated curriculum and lesson sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FreeCoursesTable courses={courses} listMetrics={listMetrics} />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function FreeCoursesListPage(): Promise<ReactNode> {
  return (
    <Suspense fallback={<FreeCoursesSkeleton />}>
      <FreeCoursesContent />
    </Suspense>
  );
}

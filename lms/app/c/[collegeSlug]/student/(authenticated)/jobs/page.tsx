import { Suspense, type ReactNode } from 'react';
import { requireStudent } from '@/lib/auth/require-student';
import { listVisibleJobs, getStudentApplicationsForJobs } from '@/lib/services/student-jobs';
import JobsTable from './_components/jobs-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase } from 'lucide-react';

export default async function StudentJobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    workMode?: string;
    employmentType?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <Suspense fallback={<JobsSkeleton />}>
        <JobsList collegeSlug={collegeSlug} searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}

async function JobsList({
  collegeSlug,
  searchParams,
}: {
  collegeSlug: string;
  searchParams: {
    page?: string;
    search?: string;
    workMode?: string;
    employmentType?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}) {
  const { studentId, membership, isGlobal } = await requireStudent(collegeSlug);

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || undefined;
  const workMode = searchParams.workMode || undefined;
  const employmentType = searchParams.employmentType || undefined;
  const sortBy = searchParams.sortBy || undefined;
  const sortOrder = (searchParams.sortOrder === 'asc' || searchParams.sortOrder === 'desc')
    ? (searchParams.sortOrder as 'asc' | 'desc')
    : undefined;

  const { jobs, total } = await listVisibleJobs({
    collegeId: membership.collegeId,
    collegeSlug,
    isGlobal,
    limit: 20, // Fetch exactly 20 jobs at a time as requested
    page,
    search,
    workMode,
    employmentType,
    sortBy,
    sortOrder,
  });

  if (total === 0 && !search && !workMode && !employmentType) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
          <Briefcase className="size-6 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-1">
          No jobs available
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          There are no active job openings at the moment. Please check back later.
        </p>
      </div>
    );
  }

  const applicationMap = await getStudentApplicationsForJobs(
    studentId,
    jobs.map((j) => j.id),
  );

  const applicationStatuses: Record<string, string | null> = {};
  for (const [jobId, app] of applicationMap.entries()) {
    applicationStatuses[jobId] = app?.status ?? null;
  }

  return (
    <JobsTable
      jobs={jobs}
      total={total}
      currentPage={page}
      pageSize={20}
      collegeSlug={collegeSlug}
      applicationStatuses={applicationStatuses}
    />
  );
}

function JobsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search and Filters skeleton */}
      <div className="h-16 w-full rounded-2xl bg-muted/10 animate-pulse border border-border/40" />
      {/* Table skeleton */}
      <div className="rounded-2xl border border-border/40 overflow-hidden bg-card/30">
        <div className="h-10 bg-muted/10 border-b border-border/40 animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border/40 animate-pulse flex items-center justify-between px-4">
            <Skeleton className="h-4 w-1/4 animate-pulse" />
            <Skeleton className="h-4 w-1/6 animate-pulse" />
            <Skeleton className="h-4 w-12 animate-pulse" />
            <Skeleton className="h-4 w-12 animate-pulse" />
            <Skeleton className="h-4 w-20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

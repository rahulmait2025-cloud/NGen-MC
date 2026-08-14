import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listJobs } from '@/lib/superadmin/jobs/queries';
import { getApplicantCountsForJobs } from '@/lib/superadmin/jobs/applicant-queries';
import type { JobStatus } from '@/lib/superadmin/jobs/types';
import { Button } from '@/components/ui/button';
import { JobsListClient } from '@/components/jobs/jobs-list-client';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function JobsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string; search?: string }>;
}): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const params = await searchParams;
  const page = Math.max(1, parseInt(params?.page ?? '1', 10) || 1);
  const statusFilter = params?.status ?? 'all';
  const search = params?.search ?? '';

  const { jobs, total, pageSize } = await listJobs({
    page,
    status: statusFilter as JobStatus | 'all',
    search,
  });

  const jobIds = jobs.map((j) => j.id);
  const countsMap = await getApplicantCountsForJobs(jobIds);
  const applicantCounts: Record<string, number> = {};
  for (const [id, count] of countsMap) {
    applicantCounts[id] = count;
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground text-sm">
            Manage job postings visible to students across the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/jobs/applications">
              All Applications
            </Link>
          </Button>
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="size-4 mr-1.5" />
              Create Job
            </Link>
          </Button>
        </div>
      </div>

      <JobsListClient
        initialJobs={jobs}
        total={total}
        page={page}
        pageSize={pageSize}
        statusFilter={statusFilter}
        search={search}
        applicantCounts={applicantCounts}
      />
    </div>
  );
}

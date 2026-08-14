import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listApplicants, listCollegesForFilter } from '@/lib/superadmin/jobs/applicant-queries';
import type { ApplicationStatus } from '@/lib/superadmin/jobs/applicant-queries';
import { ApplicationsTableClient } from '@/components/jobs/applications-table-client';

export default async function AllApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string; search?: string; college?: string }>;
}): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page ?? '1', 10) || 1);
  const statusFilter = sp?.status ?? 'all';
  const search = sp?.search ?? '';
  const collegeFilter = sp?.college ?? '';

  const [{ applicants, total, pageSize }, colleges] = await Promise.all([
    listApplicants({
      status: statusFilter as ApplicationStatus | 'all',
      collegeId: collegeFilter || undefined,
      search: search || undefined,
      page,
    }),
    listCollegesForFilter(),
  ]);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Applications</h1>
        <p className="text-muted-foreground text-sm">
          {total} application{total !== 1 ? 's' : ''} across all job postings.
        </p>
      </div>

      <ApplicationsTableClient
        applicants={applicants}
        total={total}
        page={page}
        pageSize={pageSize}
        statusFilter={statusFilter}
        search={search}
        colleges={colleges}
        collegeFilter={collegeFilter || undefined}
      />
    </div>
  );
}

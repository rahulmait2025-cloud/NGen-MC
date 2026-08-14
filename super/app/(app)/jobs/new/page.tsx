import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listCollegesForPicker } from '@/lib/superadmin/jobs/queries';
import { JobFormClient } from '@/components/jobs/job-form-client';

export default async function CreateJobPage(): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const colleges = await listCollegesForPicker();

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Job</h1>
        <p className="text-muted-foreground text-sm">
          Create a new job posting for students.
        </p>
      </div>

      <JobFormClient mode="create" colleges={colleges} />
    </div>
  );
}

import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getJobById, listCollegesForPicker } from '@/lib/superadmin/jobs/queries';
import { JobFormClient } from '@/components/jobs/job-form-client';

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const { jobId } = await params;
  const [job, colleges] = await Promise.all([
    getJobById(jobId),
    listCollegesForPicker(),
  ]);

  if (!job) notFound();

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Job</h1>
        <p className="text-muted-foreground text-sm">
          Edit &ldquo;{job.title}&rdquo; at {job.company_name}.
        </p>
      </div>

      <JobFormClient mode="edit" initialData={job} colleges={colleges} />
    </div>
  );
}

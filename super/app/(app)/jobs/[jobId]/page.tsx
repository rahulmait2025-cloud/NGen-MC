import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getJobById } from '@/lib/superadmin/jobs/queries';
import { getApplicantCountForJob } from '@/lib/superadmin/jobs/applicant-queries';
import { JobDetailClient } from '@/components/jobs/job-detail-client';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const { jobId } = await params;
  const [job, applicantCount] = await Promise.all([
    getJobById(jobId),
    getApplicantCountForJob(jobId),
  ]);
  if (!job) notFound();

  return (
    <div className="space-y-6 pb-16">
      <JobDetailClient job={job} applicantCount={applicantCount} />
    </div>
  );
}

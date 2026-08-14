import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getApplicationById, getStatusHistory } from '@/lib/superadmin/jobs/applicant-queries';
import { getApplicantLearningSnapshot } from '@/lib/superadmin/jobs/applicant-analytics';
import { ApplicationDetailClient } from '@/components/jobs/application-detail-client';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const { applicationId } = await params;

  const [application, statusHistory] = await Promise.all([
    getApplicationById(applicationId),
    getStatusHistory(applicationId),
  ]);

  if (!application) notFound();

  const snapshot = await getApplicantLearningSnapshot(
    application.student_id,
    application.college_id
  );

  return (
    <div className="space-y-6 pb-16">
      <ApplicationDetailClient
        application={application}
        statusHistory={statusHistory}
        learningSnapshot={snapshot}
      />
    </div>
  );
}

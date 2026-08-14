import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { listMentorshipSessionsForCollege } from '@/lib/services/mentorship-sessions';
import { PageContainer } from '@/components/shared/page-container';
import { MentorshipSessionsTable } from '@/components/admin/mentorship-sessions-table';

export default async function MentorshipSessionsPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;

  const { tenant } = await requireCollegeAdmin(collegeSlug);
  if (!tenant) notFound();

  const sessions = await listMentorshipSessionsForCollege(tenant.id);

  return (
    <PageContainer>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <MentorshipSessionsTable sessions={sessions} />
      </Suspense>
    </PageContainer>
  );
}

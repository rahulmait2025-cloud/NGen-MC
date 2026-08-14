import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { DbSectionPage } from '@/components/admin/db-section-page';
import { CollegeDashboardBody } from '@/components/admin/college-dashboard-body';
import { DashboardContentSkeleton } from '@/components/admin/dashboard-content-skeleton';
import { PageContainer } from '@/components/shared/page-container';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;
  const { tenant } = await requireCollegeAdmin(collegeSlug);

  if (!tenant) {
    return <DbSectionPage title="Dashboard" subtitle="College operations overview" snapshot={null} />;
  }

  return (
    <PageContainer>
      <Suspense fallback={<DashboardContentSkeleton />}>
        <CollegeDashboardBody collegeSlug={collegeSlug} collegeId={tenant.id} />
      </Suspense>
    </PageContainer>
  );
}

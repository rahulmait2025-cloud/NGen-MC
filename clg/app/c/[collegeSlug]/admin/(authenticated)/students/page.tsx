import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { listStudentsForCollege } from '@/lib/services/dashboard';
import { PageContainer } from '@/components/shared/page-container';
import { StudentsTable } from '@/components/admin/students-table';

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;

  const { tenant } = await requireCollegeAdmin(collegeSlug);
  if (!tenant) notFound();

  const students = await listStudentsForCollege(tenant.id);

  return (
    <PageContainer>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <StudentsTable students={students} />
      </Suspense>
    </PageContainer>
  );
}

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { listDsaSheets } from '@/lib/services/dsa-sheet';
import { PageContainer } from '@/components/shared/page-container';
import { CollegeDsaSheetsList } from './_components/college-dsa-sheets-list';

export default async function DsaSheetCollegePage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;
  const { tenant } = await requireCollegeAdmin(collegeSlug);

  if (!tenant) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">College not found</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Suspense fallback={<DsaSheetsSkeleton />}>
        <DsaSheetCollegeSection collegeSlug={collegeSlug} />
      </Suspense>
    </PageContainer>
  );
}

async function DsaSheetCollegeSection({ collegeSlug }: { collegeSlug: string }) {
  const sheets = await listDsaSheets();

  return <CollegeDsaSheetsList sheets={sheets} collegeSlug={collegeSlug} />;
}

function DsaSheetsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted/30 rounded-lg" />
      <div className="h-10 w-64 bg-muted/30 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-muted/20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

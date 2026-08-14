import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { getDsaSheetBySlug, getCollegeDsaProgress } from '@/lib/services/dsa-sheet';
import { PageContainer } from '@/components/shared/page-container';
import { DsaSheetCollegeView } from '../_components/dsa-sheet-college-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function DsaSheetCollegeDetailsPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; sheetSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, sheetSlug } = await params;
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
      <Suspense fallback={<DsaSheetSkeleton />}>
        <DsaSheetCollegeSection collegeSlug={collegeSlug} collegeId={tenant.id} sheetSlug={sheetSlug} />
      </Suspense>
    </PageContainer>
  );
}

async function DsaSheetCollegeSection({
  collegeSlug,
  collegeId,
  sheetSlug,
}: {
  collegeSlug: string;
  collegeId: string;
  sheetSlug: string;
}) {
  const sheet = await getDsaSheetBySlug(sheetSlug);

  if (!sheet) {
    redirect(`/c/${collegeSlug}/admin/sheets`);
  }

  const progress = await getCollegeDsaProgress(collegeId, sheet.id);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2 mb-2 text-muted-foreground hover:text-foreground">
          <Link href={`/c/${collegeSlug}/admin/sheets`}>
            <ArrowLeft className="size-4" />
            Back to Sheets
          </Link>
        </Button>
      </div>

      <DsaSheetCollegeView sheet={sheet} progress={progress} />
    </div>
  );
}

function DsaSheetSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted/30 rounded-lg" />
      <div className="h-10 w-64 bg-muted/30 rounded-lg" />
      <div className="h-60 bg-muted/20 rounded-xl" />
    </div>
  );
}

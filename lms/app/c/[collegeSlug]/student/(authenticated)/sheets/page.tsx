import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireStudent } from '@/lib/auth/require-student';
import { listDsaSheetsWithEnrollment, getDsaReadmeMarkdown } from '@/lib/services/dsa-sheet';
import { DsaSheetsLandingClient } from './_components/dsa-sheets-landing-client';

export default async function DsaSheetsStudentPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;

  return (
    <div className="space-y-6 min-w-0">
      <Suspense fallback={<DsaSheetsSkeleton />}>
        <DsaSheetsDataSection collegeSlug={collegeSlug} />
      </Suspense>
    </div>
  );
}

async function DsaSheetsDataSection({ collegeSlug }: { collegeSlug: string }) {
  const ctx = await requireStudent(collegeSlug);
  const [sheets, readme] = await Promise.all([
    listDsaSheetsWithEnrollment(ctx.studentId),
    getDsaReadmeMarkdown(),
  ]);

  return (
    <DsaSheetsLandingClient
      sheets={sheets}
      collegeSlug={collegeSlug}
      studentId={ctx.studentId}
      readme={readme}
    />
  );
}

function DsaSheetsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-primary/[0.06] rounded-lg w-80" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 bg-primary/[0.04] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

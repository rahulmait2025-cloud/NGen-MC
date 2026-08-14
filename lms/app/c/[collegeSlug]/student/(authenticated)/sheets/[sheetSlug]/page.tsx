import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireStudent } from '@/lib/auth/require-student';
import { getDsaSheetBySlug, getStudentDsaProgress, enrollInDsaSheet, isStudentEnrolled } from '@/lib/services/dsa-sheet';
import { DsaStudentView } from '../_components/dsa-student-view';
import { redirect } from 'next/navigation';

export default async function StudentDsaSheetDetailsPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; sheetSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, sheetSlug } = await params;

  return (
    <div className="space-y-6 min-w-0">
      <Suspense fallback={<DsaSheetSkeleton />}>
        <DsaSheetDataSection collegeSlug={collegeSlug} sheetSlug={sheetSlug} />
      </Suspense>
    </div>
  );
}

async function DsaSheetDataSection({ collegeSlug, sheetSlug }: { collegeSlug: string; sheetSlug: string }) {
  const ctx = await requireStudent(collegeSlug);
  
  const sheet = await getDsaSheetBySlug(sheetSlug);

  if (!sheet) {
    redirect(`/c/${collegeSlug}/student/sheets`);
  }

  const [enrolled, progress] = await Promise.all([
    isStudentEnrolled(ctx.studentId, sheet.id),
    getStudentDsaProgress(ctx.studentId),
  ]);

  if (!enrolled) {
    await enrollInDsaSheet(ctx.studentId, sheet.id);
  }

  return (
    <DsaStudentView
      sheet={sheet}
      completedProblemIds={Array.from(progress.completedProblemIds)}
      favoritedProblemIds={Array.from(progress.favoritedProblemIds)}
      studentId={ctx.studentId}
      collegeSlug={collegeSlug}
    />
  );
}

function DsaSheetSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-24 bg-primary/[0.06] rounded-lg" />
      <div className="h-10 w-64 bg-primary/[0.06] rounded-lg" />
      <div className="h-24 bg-primary/[0.04] rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-primary/[0.04] rounded-xl" />
        ))}
      </div>
      <div className="h-10 bg-primary/[0.06] rounded-lg w-80" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-primary/[0.04] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { resolveStudentPortalBranding } from '@/lib/tenant/get-tenant-branding-server';
import { loadPaidCoursesData } from './load-paid-courses-data';
import { PaidCourseCatalogView } from './_components/paid-course-catalog-view';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';

import { Suspense } from 'react';

export default async function PaidCoursesPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;

  return (
    <Suspense
      fallback={
        <PaidCourseCatalogView
          collegeSlug={collegeSlug}
          isPending={true}
        />
      }
    >
      <PaidCoursesPageInner collegeSlug={collegeSlug} />
    </Suspense>
  );
}

async function PaidCoursesPageInner({
  collegeSlug,
}: {
  collegeSlug: string;
}) {
  const ctx = await getOptionalStudentContext(collegeSlug);
  let isGlobal = false;
  let studentId: string | undefined = undefined;
  let collegeId: string | null = null;

  if (ctx) {
    isGlobal = ctx.isGlobal;
    studentId = ctx.studentId;
    collegeId = ctx.isGlobal ? null : ctx.tenant.id;
  } else {
    isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());
    if (!isGlobal) {
      const brandingResult = await resolveStudentPortalBranding(collegeSlug);
      collegeId = brandingResult.branding.id;
    }
  }

  const [catalog, showBootcamp] = await Promise.all([
    loadPaidCoursesData(
      collegeSlug,
      isGlobal,
      studentId,
      collegeId,
    ),
    isJobReadyBootcampFeatureEnabled(),
  ]);
  return (
    <PaidCourseCatalogView
      collegeSlug={collegeSlug}
      data={catalog}
      isPending={false}
      showBootcamp={showBootcamp}
    />
  );
}

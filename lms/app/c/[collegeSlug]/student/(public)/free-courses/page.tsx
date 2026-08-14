import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { loadFreeCoursesData, type FreeCoursesData } from '../../(authenticated)/free-courses/load-free-courses-data';
import { FreeCoursesView } from '../../(authenticated)/free-courses/_components/free-courses-view';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { getTenantBranding } from '@/lib/tenant/get-tenant-branding-server';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';

export default async function FreeCoursesPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;
  const showBootcampPromise = isJobReadyBootcampFeatureEnabled();

  const dataPromise = (async () => {
    const ctx = await getOptionalStudentContext(collegeSlug);
    const branding = await getTenantBranding(collegeSlug);
    const collegeId = branding?.id ?? null;
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());

    return loadFreeCoursesData(
      collegeSlug,
      ctx?.studentId ?? null,
      isGlobal,
      isGlobal ? null : collegeId,
    );
  })();

  return (
    <Suspense fallback={<FreeCoursesView collegeSlug={collegeSlug} isPending={true} />}>
      <FreeCoursesPageInner collegeSlug={collegeSlug} dataPromise={dataPromise} showBootcampPromise={showBootcampPromise} />
    </Suspense>
  );
}

async function FreeCoursesPageInner({
  collegeSlug,
  dataPromise,
  showBootcampPromise,
}: {
  collegeSlug: string;
  dataPromise: Promise<FreeCoursesData>;
  showBootcampPromise: Promise<boolean>;
}) {
  const [data, showBootcamp] = await Promise.all([dataPromise, showBootcampPromise]);
  return <FreeCoursesView collegeSlug={collegeSlug} data={data} showBootcamp={showBootcamp} />;
}

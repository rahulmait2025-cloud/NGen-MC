import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';
import {
  getPublicBootcampCatalog,
  getJobReadyBootcampProduct,
  hasExpiredJobReadyBootcampEnrollment,
  isStudentEnrolledInJobReadyBootcamp,
  type JobReadyBootcampProduct,
} from '@/lib/services/job-ready-bootcamp';
import type { PillarCatalogCourse } from '@/components/pillars/pillar-catalog-tabs';
import {
  PillarBootcampLanding,
  type BootcampPillarCourseGroup,
} from '../pillars/[pillarSlug]/pillar-bootcamp-landing';

interface BootcampPageProps {
  params: Promise<{ collegeSlug: string }>;
}

function mapBootcampCourse(c: {
  id: string;
  code: string;
  title: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  module_count: number;
  video_count: number;
  entitled: boolean;
  progress_percentage: number | null;
  is_free: boolean;
}): PillarCatalogCourse {
  return {
    catalog_key: `master:${c.id}`,
    catalog_kind: 'master_course',
    id: c.id,
    variant_id: null,
    code: c.code,
    title: c.title,
    parent_course_title: null,
    description: c.short_description || c.description,
    module_count: c.module_count,
    video_count: c.video_count,
    entitled: c.entitled,
    progress_percentage: c.progress_percentage,
    is_free: c.is_free,
    thumbnail_url: c.thumbnail_url,
  };
}

import { Suspense } from 'react';

export default async function BootcampPage({ params }: BootcampPageProps): Promise<ReactNode> {
  const { collegeSlug } = await params;

  if (!(await isJobReadyBootcampFeatureEnabled())) notFound();

  return (
    <Suspense
      fallback={
        <PillarBootcampLanding
          collegeSlug={collegeSlug}
          pillarSlug="bootcamp"
          pillarTitle="Job Ready Bootcamp"
          pillarDescription="Complete career readiness program."
          courses={[]}
          courseCount={0}
          moduleCount={0}
          videoCount={0}
          isCompleteBootcamp={true}
          isPending={true}
        />
      }
    >
      <BootcampPageInner collegeSlug={collegeSlug} />
    </Suspense>
  );
}

async function BootcampPageInner({
  collegeSlug,
}: {
  collegeSlug: string;
}) {
  const ctx = await getOptionalStudentContext(collegeSlug);
  const studentId = ctx?.studentId ?? null;
  const isGlobal = ctx?.isGlobal ?? ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());
  const collegeId = ctx?.tenant?.id ?? null;

  const [catalog, product, enrolled, accessExpired]: [
    Awaited<ReturnType<typeof getPublicBootcampCatalog>>,
    JobReadyBootcampProduct | null,
    boolean,
    boolean,
  ] = await Promise.all([
    getPublicBootcampCatalog(collegeSlug),
    getJobReadyBootcampProduct(),
    studentId
      ? isStudentEnrolledInJobReadyBootcamp(studentId, isGlobal ? null : collegeId)
      : Promise.resolve(false),
    studentId
      ? hasExpiredJobReadyBootcampEnrollment(studentId, isGlobal ? null : collegeId)
      : Promise.resolve(false),
  ]);

  const pillarCourseGroups: BootcampPillarCourseGroup[] = catalog.pillars.map((pillar) => ({
    slug: pillar.slug,
    title: pillar.title,
    courses: pillar.courses.map(mapBootcampCourse),
  }));

  const allCourses = pillarCourseGroups.flatMap((g) => g.courses);
  const moduleCount = allCourses.reduce((acc, c) => acc + (c.module_count || 0), 0);
  const videoCount = allCourses.reduce((acc, c) => acc + (c.video_count || 0), 0);

  return (
    <PillarBootcampLanding
      collegeSlug={collegeSlug}
      pillarSlug="bootcamp"
      pillarTitle="Job Ready Bootcamp"
      pillarDescription={product?.short_description || product?.description || `Complete career readiness program across ${catalog.totalPillars} pillars.`}
      courses={allCourses}
      courseCount={catalog.totalCourses}
      moduleCount={moduleCount}
      videoCount={videoCount}
      isCompleteBootcamp={true}
      pillarCourseGroups={pillarCourseGroups}
      bootcampProduct={product}
      isBootcampEnrolled={enrolled}
      bootcampAccessExpired={accessExpired}
      isPending={false}
    />
  );
}

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { getVisiblePillarBySlugForStudent } from '@/lib/services/student-courses';
import {
  listGlobalDiscoverableCourses,
  listCollegeDiscoverableCourses,
  type GlobalDiscoverablePillarGroup,
} from '@/lib/services/global-courses';
import type { PillarCatalogCourse } from '@/components/pillars/pillar-catalog-tabs';
import { PillarBootcampLanding } from './pillar-bootcamp-landing';

interface PillarPageProps {
  params: Promise<{ collegeSlug: string; pillarSlug: string }>;
}

function parsePoints(text: string | null): string[] {
  try {
    if (!text) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map(String) : [text];
  } catch {
    return text ? [text] : [];
  }
}

import { Suspense } from 'react';

export default async function PillarPage({ params }: PillarPageProps): Promise<ReactNode> {
  const { collegeSlug, pillarSlug } = await params;
  const [ctx, pillarData] = await Promise.all([
    getOptionalStudentContext(collegeSlug),
    getVisiblePillarBySlugForStudent(collegeSlug, pillarSlug),
  ]);

  if (!pillarData) notFound();

  const isGlobal = ctx?.isGlobal ?? ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());

  const coursesPromise = isGlobal
    ? listGlobalDiscoverableCourses(collegeSlug)
    : listCollegeDiscoverableCourses(collegeSlug);

  return (
    <Suspense
      fallback={
        <PillarBootcampLanding
          collegeSlug={collegeSlug}
          pillarSlug={pillarSlug}
          pillarTitle={pillarData.title}
          pillarDescription={pillarData.short_description || pillarData.description}
          courses={[]}
          courseCount={0}
          moduleCount={0}
          videoCount={0}
          isPending={true}
        />
      }
    >
      <PillarPageInner
        collegeSlug={collegeSlug}
        pillarSlug={pillarSlug}
        pillarTitle={pillarData.title}
        pillarDescription={pillarData.short_description || pillarData.description}
        coursesPromise={coursesPromise}
      />
    </Suspense>
  );
}

async function PillarPageInner({
  collegeSlug,
  pillarSlug,
  pillarTitle,
  pillarDescription,
  coursesPromise,
}: {
  collegeSlug: string;
  pillarSlug: string;
  pillarTitle: string;
  pillarDescription: string | null;
  coursesPromise: Promise<GlobalDiscoverablePillarGroup[]>;
}) {
  const allGroups = await coursesPromise;
  const group = allGroups.find((g) => g.pillar.slug === pillarSlug);

  const courses: PillarCatalogCourse[] = group
    ? group.courses.map((c) => {
        const points = parsePoints(c.description);
        return {
          catalog_key: c.catalog_key,
          catalog_kind: c.catalog_kind,
          id: c.id,
          variant_id: c.variant_id,
          code: c.code,
          title: c.title,
          parent_course_title: c.parent_course_title,
          description: c.short_description || (points.length > 0 ? points[0] : null),
          module_count: c.module_count,
          video_count: c.video_count,
          entitled: c.entitled,
          progress_percentage: c.progress_percentage,
          is_free: c.is_free,
          thumbnail_url: c.thumbnail_url ?? null,
        };
      })
    : [];

  const moduleCount = courses.reduce((acc, c) => acc + (c.module_count || 0), 0);
  const videoCount = courses.reduce((acc, c) => acc + (c.video_count || 0), 0);

  return (
    <PillarBootcampLanding
      collegeSlug={collegeSlug}
      pillarSlug={pillarSlug}
      pillarTitle={pillarTitle}
      pillarDescription={pillarDescription}
      courses={courses}
      courseCount={courses.length}
      moduleCount={moduleCount}
      videoCount={videoCount}
      isPending={false}
    />
  );
}

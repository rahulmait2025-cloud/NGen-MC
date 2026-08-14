import { Suspense } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { requireStudent } from '@/lib/auth/require-student';
import {
  listStudentEntitledCoursesGroupedByPillar,
  type StudentLearningContext,
  type EntitledPillarGroup,
} from '@/lib/services/student-courses';
import { MyCoursesTabs } from './my-courses-tabs';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { listStudentPurchasedBundles } from '@/lib/services/student-purchased-bundles';
import { isStudentEnrolledInJobReadyBootcamp } from '@/lib/services/job-ready-bootcamp';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';
import { getExpiringCoursesWithinDays } from '@/lib/services/course-access-manager';
import { attachMyCourseLaunchHrefs } from '@/lib/student/learning/attach-my-course-launch-hrefs';
import { listDsaSheetsWithEnrollment } from '@/lib/services/dsa-sheet';
import type { MyCourseRow } from '@/lib/student/my-courses-types';

export default async function MyCoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { collegeSlug } = await params;
  const { tab } = await searchParams;

  return (
    <div className="max-w-7xl mx-auto space-y-6">


      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-border pb-px">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-24 animate-pulse bg-muted/30 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-video animate-pulse rounded-xl bg-muted/20 border border-border/40" />
                  <div className="space-y-2 px-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted/20" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted/15" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      >
        <MyCoursesPageInner
          collegeSlug={collegeSlug}
          tab={tab}
        />
      </Suspense>
    </div>
  );
}

async function getMyCoursesData(
  collegeSlug: string,
  learningContext: StudentLearningContext,
  tenantId: string | null,
) {
  'use cache';
  cacheLife('weeks');
  cacheTag('entitlements', 'progress', 'platform-settings', `student-my-courses-${learningContext.studentId}`);

  const { studentId, isGlobal } = learningContext;

  const [pillarGroups, purchasedBundles, bootcampEnrolled, bootcampFeatureEnabled, expiringCoursesMap, dsaSheets] = await Promise.all([
    listStudentEntitledCoursesGroupedByPillar(learningContext),
    listStudentPurchasedBundles(collegeSlug, studentId, tenantId),
    isStudentEnrolledInJobReadyBootcamp(studentId, tenantId),
    isJobReadyBootcampFeatureEnabled(),
    getExpiringCoursesWithinDays(studentId, 14),
    listDsaSheetsWithEnrollment(studentId),
  ]);

  const enrolledDsaSheets = (dsaSheets as Awaited<ReturnType<typeof listDsaSheetsWithEnrollment>>).filter((s) => s.isEnrolled);

  const allCoursesFromRpc = (pillarGroups as EntitledPillarGroup[]).flatMap((g) => g.courses) as MyCourseRow[];

  const allCourses = await attachMyCourseLaunchHrefs(
    collegeSlug,
    studentId,
    isGlobal,
    tenantId,
    allCoursesFromRpc,
  );

  const serializedExpiringCoursesMap = Array.from(expiringCoursesMap.entries());

  return {
    allCourses,
    purchasedBundles,
    enrolledDsaSheets,
    bootcampEnrolled,
    bootcampFeatureEnabled,
    serializedExpiringCoursesMap,
  };
}

async function MyCoursesPageInner({
  collegeSlug,
  tab,
}: {
  collegeSlug: string;
  tab?: string;
}) {
  const studentCtx = await requireStudent(collegeSlug);
  const studentId = studentCtx.studentId;
  const tenantId = studentCtx.isGlobal ? null : studentCtx.tenant.id;
  const learningContext: StudentLearningContext = {
    studentId,
    userId: studentCtx.user.id,
    collegeId: tenantId,
    isGlobal: studentCtx.isGlobal,
    tenantSlug: studentCtx.tenant.slug,
  };

  const {
    allCourses,
    purchasedBundles,
    enrolledDsaSheets,
    bootcampEnrolled,
    bootcampFeatureEnabled,
    serializedExpiringCoursesMap,
  } = await getMyCoursesData(
    collegeSlug,
    learningContext,
    tenantId,
  );

  const expiringCoursesMap = new Map<string, number>(serializedExpiringCoursesMap as [string, number][]);

  // The bootcamp "My Courses" card is only shown while the feature flag is
  // enabled, even if the student holds a valid (frozen) enrollment.
  const showBootcampCard = bootcampEnrolled && bootcampFeatureEnabled;

  if (allCourses.length === 0 && purchasedBundles.length === 0 && !showBootcampCard && enrolledDsaSheets.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen />}
        title="No courses yet"
        description="Browse the course catalog to find programs you can start."
        action={
          <Button asChild>
            <Link href={`/c/${collegeSlug}/student/courses`}>
              Browse Courses
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <MyCoursesTabs
      courses={allCourses}
      bundles={purchasedBundles}
      sheets={enrolledDsaSheets}
      collegeSlug={collegeSlug}
      showBootcampCard={showBootcampCard}
      bootcampFeatureEnabled={bootcampFeatureEnabled}
      initialTab={tab}
      expiringCoursesMap={expiringCoursesMap}
    />
  );
}

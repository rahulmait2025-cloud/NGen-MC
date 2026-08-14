import 'server-only';

import { unstable_rethrow } from 'next/navigation';

import {
  listCollegeDiscoverableCourses,
  listGlobalDiscoverableCourses,
} from '@/lib/services/global-courses';
import {
  type StudentLearningContext,
  listStudentEntitledCoursesGroupedByPillar,
  listVisiblePillarsForAudience,
} from '@/lib/services/student-courses';
import { resolveBootcampPillarHref, resolveCareerPathsHref } from './_components/landing-content';
import { studentBasePath } from '@/lib/student/student-home-route';
import { loadContinueLearningForStudent } from './load-continue-learning';
import {
  buildSmartJourneyCards,
  defaultJourneyCards,
  mapPillarsToPathCards,
  mergeBestCourseCards,
  mergeFreeCourseCards,
} from './_components/landing-data-mappers';
import { loadExplorePaidProductCards } from './load-explore-paid-products';
import type { StudentLandingPageData } from './_components/landing-data-types';
import type { GlobalDiscoverablePillarGroup } from '@/lib/services/global-courses';
import type { EntitledPillarGroup } from '@/lib/services/student-courses';
import type { MasterCoursePillarsRow } from '@/types/database';
import type { YouTubeCourse } from '@/lib/actions/youtube';
import { listDiscoverableBundles, resolveCuratedBundleFallback, MAX_DB_CURATED_CARDS } from '@/lib/services/student-bundles';

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error);
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[landing] ${label} failed:`, error);
    }
    return fallback;
  }
}

export async function loadStudentLandingData(
  collegeSlug: string,
  studentId: string | null,
  isGlobal: boolean,
  collegeId: string | null = null,
  userId: string | null = null,
): Promise<StudentLandingPageData> {
  const studentContext: StudentLearningContext | null = studentId && userId
    ? { studentId, userId, collegeId: isGlobal ? null : collegeId, isGlobal, tenantSlug: collegeSlug }
    : null;

  const [visiblePillars, entitledGroups, discoverableGroups, freeCatalog, curatedBundles, catalogBundles] =
    await Promise.all([
      safe('visiblePillars', () => listVisiblePillarsForAudience(isGlobal ? null : collegeId, isGlobal), [] as MasterCoursePillarsRow[]),
      safe(
        'entitledCourses',
        () => studentContext ? listStudentEntitledCoursesGroupedByPillar(studentContext) : Promise.resolve([]),
        [] as EntitledPillarGroup[],
      ),
      safe(
        'discoverableCourses',
        async () => {
          if (!studentContext) {
            const { loadPaidCoursesData } = await import(
              '@/app/c/[collegeSlug]/student/(public)/paid-courses/load-paid-courses-data'
            );
            const catalog = await loadPaidCoursesData(collegeSlug, isGlobal, undefined, collegeId);
            return catalog.pillarGroups.map((pg) => ({
              pillar: pg.pillar,
              courses: pg.courses.map((c) => ({
                catalog_key: c.catalog_key,
                catalog_kind: c.catalog_kind as 'master_course' | 'variant',
                id: c.id,
                variant_id: c.variant_id,
                pillar_id: c.pillar_id,
                code: '',
                title: c.title,
                parent_course_title: null,
                description: null,
                short_description: c.description,
                module_count: c.module_count,
                video_count: c.video_count,
                entitled: false,
                is_enrolled: false,
                progress_percentage: null,
                is_free: c.is_free,
                pricing_model: c.pricing_model,
                selling_price: c.selling_price,
                currency: c.currency,
                thumbnail_url: c.thumbnailUrl,
                show_as_paid_course: c.show_as_paid_course,
                paid_source_type: c.paid_source_type,
                created_at: undefined,
              })),
            }));
          }
          return isGlobal
            ? listGlobalDiscoverableCourses(collegeSlug)
            : listCollegeDiscoverableCourses(collegeSlug);
        },
        [] as GlobalDiscoverablePillarGroup[],
      ),
      safe(
        'freeCourses',
        async () => {
          const { createAdminClient } = await import('@/lib/supabase/admin');
          const sb = createAdminClient();
          let query = sb
            .from('master_courses')
            .select('id, title, description, short_description, metadata')
            .eq('course_kind', 'free_course')
            .eq('publish_status', 'published');
          if (isGlobal) {
            query = query.eq('visible_to_global_students', true);
          } else {
            query = query.eq('visible_to_college_students', true);
          }
          const { data } = await query;
          const result: YouTubeCourse[] = (data ?? []).map((c) => {
            const meta = (c.metadata as Record<string, unknown>) ?? {};
            const thumbnail = (meta.thumbnail_url as string) || (meta.youtube_playlist_thumbnail_url as string) || undefined;
            return {
              id: c.id,
              title: c.title,
              description: c.short_description || c.description || '',
              thumbnail,
              playlistId: c.id,
              videoCount: 0,
            };
          });
          return result;
        },
        [] as YouTubeCourse[],
      ),
      safe(
        'curatedBundles',
        () => studentId ? listDiscoverableBundles(collegeSlug, studentId, collegeId, 'curated') : Promise.resolve([]),
        [],
      ),
      safe(
        'catalogBundles',
        () => studentId ? listDiscoverableBundles(collegeSlug, studentId, collegeId, 'catalog') : Promise.resolve([]),
        [],
      ),
    ]);

  const [explorePaidProducts, continueLearning, freeCourseEnrolledIds] = await Promise.all([
    safe(
      'explorePaidProducts',
      () => loadExplorePaidProductCards(collegeSlug, isGlobal, studentId ?? undefined, collegeId, {
        discoverableGroups,
        visiblePillars,
      }),
      [],
    ),
    safe(
      'continueLearning',
      () => studentId ? loadContinueLearningForStudent(collegeSlug, studentId, entitledGroups) : Promise.resolve(null),
      null,
    ),
    safe(
      'freeCourseEnrollments',
      async () => {
        const courseIds = freeCatalog.map((c) => c.id);
        if (courseIds.length === 0 || !studentId) return new Set<string>();
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const sb = createAdminClient();
        const { data } = await sb
          .from('student_entitlements')
          .select('master_course_id')
          .eq('student_id', studentId)
          .eq('status', 'active')
          .in('master_course_id', courseIds);
        return new Set((data ?? []).map((row) => row.master_course_id as string));
      },
      new Set<string>(),
    ),
  ]);

  const effectiveCuratedBundles = resolveCuratedBundleFallback(
    curatedBundles,
    catalogBundles,
    MAX_DB_CURATED_CARDS,
  );

  const visiblePillarSlugs = visiblePillars.map((p) => p.slug);
  const firstPillarSlug = visiblePillarSlugs[0] ?? null;
  const careerPathsHref = resolveCareerPathsHref(collegeSlug, firstPillarSlug);
  const { isJobReadyBootcampFeatureEnabled } = await import('@/lib/services/job-ready-bootcamp-feature');
  const bootcampFeatureEnabled = await isJobReadyBootcampFeatureEnabled();
  const bootcampPillarHref = bootcampFeatureEnabled
    ? resolveBootcampPillarHref(collegeSlug, visiblePillarSlugs)
    : `${studentBasePath(collegeSlug)}/paid-courses`;
  const pathCards = mapPillarsToPathCards(collegeSlug, visiblePillars);
  const bestCourseCards = mergeBestCourseCards(collegeSlug, explorePaidProducts, entitledGroups);
  const freeCourseCards = mergeFreeCourseCards(collegeSlug, freeCatalog, freeCourseEnrolledIds);

  let journeyCards = defaultJourneyCards(collegeSlug);
  try {
    journeyCards = buildSmartJourneyCards(
      collegeSlug,
      discoverableGroups,
      entitledGroups,
      pathCards,
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[landing] journeyCards failed:', error);
    }
  }

  return {
    careerPathsHref,
    bootcampPillarHref,
    bootcampFeatureEnabled,
    continueLearning,
    journeyCards,
    pathCards,
    bestCourseCards,
    freeCourseCards,
    visiblePillarSlugs,
    discoverableBundles: catalogBundles,
    curatedBundles: effectiveCuratedBundles,
    catalogBundles,
  };
}

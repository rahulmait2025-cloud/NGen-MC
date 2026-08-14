import 'server-only';

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAssignmentActive } from '@/lib/services/access-helpers';
import { listStudentContentEntitlements } from '@/lib/services/course-access-manager';
import { resolveBundleCourseEntries } from '@/lib/services/bundle-resolver';
import { batchCourseProgress } from '@/lib/services/batch-course-progress';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { isCareerReadinessBundle } from '@/lib/utils/bundle-routes';
import { normUuid } from '@/lib/utils';
import type { PurchasedBundleSourceLabel } from '@/lib/services/student-purchased-bundles';

export interface BundleLearningCourse {
  courseId: string;
  sequence: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  moduleCount: number;
  lessonCount: number;
  progressPercentage: number;
  learnHref: string;
  variantId: string | null;
  accessScope: 'full' | 'partial';
}

export interface BundleLearningPageData {
  bundleId: string;
  slug: string;
  title: string;
  description: string;
  sourceLabel: PurchasedBundleSourceLabel;
  courseCount: number;
  progressPercentage: number;
  courses: BundleLearningCourse[];
}

function resolveBundleSourceLabel(
  sourceType: string,
  metadata: Record<string, unknown>,
  fromAssignment: boolean,
): PurchasedBundleSourceLabel {
  if (fromAssignment) return 'College Assigned Bundle';
  if (
    metadata.enrollment_type === 'free'
    || metadata.source === 'free_bundle_enrollment'
    || sourceType === 'free_enrollment'
  ) {
    return 'Free Bundle';
  }
  return 'Purchased Bundle';
}

async function verifyStudentBundleAccess(
  bundleSlugOrId: string,
  studentId: string,
  collegeId: string | null,
): Promise<{ bundleId: string; sourceLabel: PurchasedBundleSourceLabel } | null> {
  const sb = createAdminClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(bundleSlugOrId);

  let query = sb
    .from('course_bundles')
    .select('id, slug, title, code, publish_status, lifecycle_status')
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active');
  query = isUuid ? query.eq('id', bundleSlugOrId) : query.eq('slug', bundleSlugOrId);

  const { data: bundle } = await query.maybeSingle();
  if (!bundle || isCareerReadinessBundle(bundle)) return null;

  const bundleId = normUuid(bundle.id as string);

  const [entitlements, assignmentResult] = await Promise.all([
    listStudentContentEntitlements(studentId),
    collegeId
      ? sb
          .from('content_assignments')
          .select('id, status, start_date, end_date')
          .eq('assignment_type', 'college')
          .eq('target_id', collegeId)
          .eq('assigned_entity_type', 'bundle')
          .eq('assigned_entity_id', bundleId)
          .eq('status', 'active')
          .maybeSingle()
      : Promise.resolve(null),
  ]);
  const assignment = assignmentResult?.data ?? null;

  const matchedEntitlement = entitlements.find(
    (e) => e.assigned_entity_type === 'bundle' && normUuid(e.assigned_entity_id) === bundleId,
  );

  if (matchedEntitlement) {
    return {
      bundleId,
      sourceLabel: resolveBundleSourceLabel(
        matchedEntitlement.source_type,
        matchedEntitlement.metadata ?? {},
        false,
      ),
    };
  }

  if (assignment && isAssignmentActive(assignment)) {
    return { bundleId, sourceLabel: 'College Assigned Bundle' };
  }

  return null;
}

export const loadBundleLearningPageData = cache(async function loadBundleLearningPageData(
  collegeSlug: string,
  bundleSlug: string,
  studentId: string,
  collegeId: string | null,
): Promise<BundleLearningPageData | null> {
  const access = await verifyStudentBundleAccess(bundleSlug, studentId, collegeId);
  if (!access) return null;

  const sb = createAdminClient();
  const { data: bundle } = await sb
    .from('course_bundles')
    .select('id, slug, title, description, landing_card_title, landing_card_description')
    .eq('id', access.bundleId)
    .maybeSingle();

  if (!bundle) return null;

  const entries = await resolveBundleCourseEntries(access.bundleId);
  const courseIds = entries.map((e) => e.courseId);

  const [{ data: courseRows }, progressMap] = await Promise.all([
    courseIds.length > 0
      ? sb
          .from('master_courses')
          .select('id, metadata')
          .in('id', courseIds)
      : Promise.resolve({ data: [] as { id: string; metadata: unknown }[] }),
    courseIds.length > 0
      ? batchCourseProgress(studentId, courseIds)
      : Promise.resolve(new Map()),
  ]);

  const thumbnailByCourseId = new Map<string, string | null>();
  for (const row of courseRows ?? []) {
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    thumbnailByCourseId.set(
      row.id as string,
      (meta.thumbnail_url as string) || (meta.youtube_playlist_thumbnail_url as string) || null,
    );
  }

  let bundleCompleted = 0;
  let bundleTotal = 0;

  const courses: BundleLearningCourse[] = entries.map((entry) => {
    const progress = progressMap.get(entry.courseId) ?? { total: 0, completed: 0, percentage: 0 };
    bundleCompleted += progress.completed;
    bundleTotal += progress.total;

    return {
      courseId: entry.courseId,
      sequence: entry.sequence,
      title: entry.title,
      description: entry.shortDescription,
      thumbnailUrl: thumbnailByCourseId.get(entry.courseId) ?? null,
      moduleCount: entry.moduleCount,
      lessonCount: entry.lessonCount,
      progressPercentage: progress.percentage,
      learnHref: buildLearnHref(collegeSlug, entry.courseId, { variantId: entry.variantId }),
      variantId: entry.variantId,
      accessScope: entry.accessScope,
    };
  });

  const progressPercentage = bundleTotal > 0
    ? Math.round((bundleCompleted / bundleTotal) * 100)
    : 0;

  const plainDescription =
    (bundle.landing_card_description as string | null)?.trim()
    || (typeof bundle.description === 'string' && !bundle.description.trim().startsWith('{')
      ? bundle.description
      : 'Continue learning through the courses in this bundle.');

  return {
    bundleId: bundle.id as string,
    slug: bundle.slug as string,
    title: (bundle.landing_card_title as string | null)?.trim() || (bundle.title as string),
    description: plainDescription,
    sourceLabel: access.sourceLabel,
    courseCount: courses.length,
    progressPercentage,
    courses,
  };
});

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { SellableEntityType } from '@/types/payments';
import { getStudentAppBaseUrl } from '@/lib/lms/transactional-email/student-app-base-url';

async function batchGetPillarSlugs(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  pillarIds: string[],
): Promise<Map<string, string>> {
  if (pillarIds.length === 0) return new Map();
  const { data } = await admin
    .from('master_course_pillars')
    .select('id, slug')
    .in('id', pillarIds);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.id as string, row.slug as string);
  }
  return map;
}

export async function resolvePurchasedEntityPresentation(params: {
  entityType: SellableEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
  collegeSlug?: string;
}): Promise<{
  title: string;
  typeLabel: string;
  accessUrl: string;
  primaryCtaLabel: string;
}> {
  const admin = createAdminClient();
  const appUrl = getStudentAppBaseUrl();
  const slug = params.collegeSlug ?? 'direct-learners';
  const pillarSlug = typeof params.metadata?.pillar_slug === 'string' ? params.metadata.pillar_slug : null;
  const courseId = typeof params.metadata?.course_id === 'string' ? params.metadata.course_id : null;

  if (params.entityType === 'master_course') {
    const { data: course } = await admin
      .from('master_courses')
      .select('id, title, pillar_id, slug')
      .eq('id', params.entityId)
      .maybeSingle();

    const pillarIds = course?.pillar_id ? [course.pillar_id] : [];
    const pillarMap = pillarIds.length > 0 ? await batchGetPillarSlugs(admin, pillarIds) : new Map();

    let resolvedPillarSlug = pillarSlug;
    if (!resolvedPillarSlug && course?.pillar_id) {
      resolvedPillarSlug = pillarMap.get(course.pillar_id) ?? null;
    }
    const cid = courseId ?? (course?.id as string);
    const courseSlug = course?.slug || cid;
    const accessUrl =
      resolvedPillarSlug && courseSlug
        ? `${appUrl}/c/${encodeURIComponent(slug)}/student/pillars/${encodeURIComponent(resolvedPillarSlug)}/courses/${encodeURIComponent(courseSlug)}`
        : `${appUrl}/c/${encodeURIComponent(slug)}/student/pillars`;
    return {
      title: (course?.title as string) || 'Course',
      typeLabel: 'Course',
      accessUrl,
      primaryCtaLabel: 'Start Learning',
    };
  }

  if (params.entityType === 'course_variant') {
    const [variantResult, variantMetaResult] = await Promise.all([
      admin.from('course_variants').select('id, title, master_course_id').eq('id', params.entityId).maybeSingle(),
      admin.from('paid_course_landing_metadata').select('title').eq('source_type', 'course_variant').eq('source_id', params.entityId).maybeSingle(),
    ]);

    const variant = variantResult.data;
    const variantMeta = variantMetaResult.data;

    let resolvedCourseId = courseId ?? (variant?.master_course_id as string | undefined);
    let resolvedPillarSlug = pillarSlug;
    let resolvedCourseSlug: string | null = null;

    if (resolvedCourseId) {
      const { data: course } = await admin
        .from('master_courses')
        .select('id, pillar_id, slug')
        .eq('id', resolvedCourseId)
        .maybeSingle();

      if (course?.pillar_id) {
        const pillarMap = await batchGetPillarSlugs(admin, [course.pillar_id]);
        resolvedPillarSlug = pillarMap.get(course.pillar_id) ?? resolvedPillarSlug;
        resolvedCourseId = course.id as string;
        resolvedCourseSlug = (course.slug as string) ?? null;
      }
    }

    const courseSlug = resolvedCourseSlug || resolvedCourseId;
    const accessUrl =
      resolvedPillarSlug && courseSlug
        ? `${appUrl}/c/${encodeURIComponent(slug)}/student/pillars/${encodeURIComponent(resolvedPillarSlug)}/courses/${encodeURIComponent(courseSlug)}?variant=${encodeURIComponent(params.entityId)}`
        : `${appUrl}/c/${encodeURIComponent(slug)}/student/pillars`;

    const variantTitle = (variantMeta?.title as string | undefined)?.trim();
    return {
      title: variantTitle || (variant?.title as string) || 'Course',
      typeLabel: 'Course variant',
      accessUrl,
      primaryCtaLabel: 'Start Learning',
    };
  }

  if (params.entityType === 'job_ready_bootcamp') {
    const { data: bootcamp } = await admin
      .from('bootcamps')
      .select('id, title, slug')
      .eq('id', params.entityId)
      .maybeSingle();
    const title = (bootcamp?.title as string) || 'Job Ready Bootcamp';
    const accessUrl = `${appUrl}/c/${encodeURIComponent(slug)}/student/my-courses/job-ready-bootcamp`;
    return {
      title,
      typeLabel: 'Job Ready Bootcamp',
      accessUrl,
      primaryCtaLabel: 'Start Learning',
    };
  }

  if (params.entityType === 'note_collection') {
    const { data: collection } = await admin
      .from('note_collections')
      .select('id, title, slug')
      .eq('id', params.entityId)
      .maybeSingle();
    const noteSlug = collection?.slug as string | undefined;
    const accessUrl = noteSlug
      ? `${appUrl}/c/${encodeURIComponent(slug)}/student/notes/${encodeURIComponent(noteSlug)}`
      : `${appUrl}/c/${encodeURIComponent(slug)}/student/notes`;
    return {
      title: (collection?.title as string) || 'Notes',
      typeLabel: 'Notes',
      accessUrl,
      primaryCtaLabel: 'Start Learning',
    };
  }

  if (params.entityType === 'paid_mentorship_booking') {
    const { data: booking } = await admin
      .from('paid_mentorship_bookings')
      .select('id, category_id')
      .eq('id', params.entityId)
      .maybeSingle();
    let title = 'Mentorship Session';
    if (booking?.category_id) {
      const { data: category } = await admin
        .from('paid_mentorship_categories')
        .select('title')
        .eq('id', booking.category_id)
        .maybeSingle();
      if (category?.title) title = category.title as string;
    }
    return {
      title,
      typeLabel: 'Mentorship',
      accessUrl: `${appUrl}/mentorship`,
      primaryCtaLabel: 'View Mentorship Schedule',
    };
  }

  if (params.entityType === 'course_bundle') {
    const { data: bundle } = await admin
      .from('course_bundles')
      .select('id, title, slug')
      .eq('id', params.entityId)
      .maybeSingle();

    const bundleSlug = bundle?.slug;
    const accessUrl = bundleSlug
      ? `${appUrl}/c/${encodeURIComponent(slug)}/student/bundles/${encodeURIComponent(bundleSlug)}`
      : `${appUrl}/c/${encodeURIComponent(slug)}/student/pillars`;

    return {
      title: (bundle?.title as string) || 'Bundle',
      typeLabel: 'Course bundle',
      accessUrl,
      primaryCtaLabel: 'Start Learning',
    };
  }

  console.warn('[lms-email/entity-access] unsupported entity type', {
    entityType: params.entityType,
    entityId: params.entityId,
  });

  return {
    title: 'Your purchase',
    typeLabel: 'Purchase',
    accessUrl: `${appUrl}/c/${encodeURIComponent(slug)}/student/pillars`,
    primaryCtaLabel: 'Go to Dashboard',
  };
}
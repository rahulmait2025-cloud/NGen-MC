import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { PaidCourseSourceType } from '@/lib/services/paid-course-catalog';
import { getVariantPurchaseInfo } from '@/lib/services/variant-purchase';
import { buildLearnHref, buildPillarCourseDetailHref } from '@/lib/utils/variant-learn-url';
import { applyMasterCourseKeyFilter } from '@/lib/utils/master-course-key';
import { isUuid } from '@/lib/utils/slug';

export type PaidProductResolveInput = {
  sourceType: PaidCourseSourceType;
  sourceId: string;
  collegeSlug: string;
  collegeId?: string | null;
  includePrice?: boolean;
  includeMetadata?: boolean;
};

export type ResolvedPaidProduct = {
  sourceType: PaidCourseSourceType;
  sourceId: string;
  parentMasterCourseId: string;
  masterCourseSlug: string | null;
  pillarSlug: string | null;
  pillarTitle: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnailImageUrl: string | null;
  coverImageUrl: string | null;
  previewVideoUrl: string | null;
  priceMinor: number | null;
  currency: string;
  isPaidCourseEnabled: boolean;
  isPurchasable: boolean;
  unavailableReason: string | null;
  detailUrl: string;
  continueUrl: string;
};

type LandingMetaRow = {
  slug: string | null;
  title: string | null;
  subtitle: string | null;
  short_description: string | null;
  description: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  is_published: boolean | null;
  is_visible: boolean | null;
};

async function loadLandingMeta(
  sourceType: PaidCourseSourceType,
  sourceId: string,
): Promise<LandingMetaRow | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('paid_course_landing_metadata')
    .select(
      'slug, title, subtitle, short_description, description, cover_image_url, thumbnail_url, preview_video_url, is_published, is_visible',
    )
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle();
  return (data as LandingMetaRow | null) ?? null;
}

async function resolvePillarSlug(pillarId: string | null): Promise<{ slug: string; title: string } | null> {
  if (!pillarId) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from('master_course_pillars')
    .select('slug, title')
    .eq('id', pillarId)
    .maybeSingle();
  if (!data) return null;
  return { slug: data.slug as string, title: data.title as string };
}

/**
 * Resolve a sellable paid product by exact source identity.
 */
export async function resolvePaidProduct(
  input: PaidProductResolveInput,
): Promise<ResolvedPaidProduct | null> {
  const sb = createAdminClient();
  const includePrice = input.includePrice ?? true;
  const includeMetadata = input.includeMetadata ?? true;

  if (input.sourceType === 'course_variant') {
    const { data: variant } = await sb
      .from('course_variants')
      .select(
        'id, title, slug, master_course_id, pillar_id, show_as_paid_course, publish_status, selling_price, currency',
      )
      .eq('id', input.sourceId)
      .maybeSingle();

    if (!variant || variant.publish_status !== 'published') return null;

    const { data: parent } = await sb
      .from('master_courses')
      .select('id, title, slug, pillar_id, publish_status')
      .eq('id', variant.master_course_id as string)
      .maybeSingle();

    if (!parent || parent.publish_status !== 'published') return null;

    const pillarId = (variant.pillar_id as string | null) ?? (parent.pillar_id as string | null);
    const [pillar, meta] = await Promise.all([
      resolvePillarSlug(pillarId),
      includeMetadata ? loadLandingMeta('course_variant', variant.id as string) : null,
    ]);

    let priceMinor: number | null = null;
    let currency = (variant.currency as string) ?? 'INR';
    let isPurchasable = !!variant.show_as_paid_course;
    let unavailableReason: string | null = null;

    if (includePrice) {
      const purchaseInfo = await getVariantPurchaseInfo(
        variant.id as string,
        parent.id as string,
        input.collegeId ?? null,
      );
      if (purchaseInfo) {
        priceMinor = purchaseInfo.priceMinor;
        currency = purchaseInfo.currency;
        isPurchasable = true;
      } else if (variant.show_as_paid_course) {
        unavailableReason = 'No active price plan found for this variant.';
        isPurchasable = false;
      }
    }

    const title =
      meta?.title?.trim()
      || (variant.title as string)
      || (parent.title as string);
    const masterSlug = (parent.slug as string) || (parent.id as string);
    const pillarSlug = pillar?.slug ?? null;

    return {
      sourceType: 'course_variant',
      sourceId: variant.id as string,
      parentMasterCourseId: parent.id as string,
      masterCourseSlug: parent.slug as string | null,
      pillarSlug,
      pillarTitle: pillar?.title ?? null,
      title,
      subtitle: meta?.subtitle?.trim() || null,
      description:
        meta?.short_description?.trim()
        || meta?.description?.trim()
        || null,
      thumbnailImageUrl: meta?.thumbnail_url?.trim() || meta?.cover_image_url?.trim() || null,
      coverImageUrl: meta?.cover_image_url?.trim() || meta?.thumbnail_url?.trim() || null,
      previewVideoUrl: meta?.preview_video_url?.trim() || null,
      priceMinor,
      currency,
      isPaidCourseEnabled: !!variant.show_as_paid_course,
      isPurchasable,
      unavailableReason,
      detailUrl: pillarSlug
        ? buildPillarCourseDetailHref(input.collegeSlug, pillarSlug, masterSlug, variant.id as string)
        : `/c/${input.collegeSlug}/student/pillars`,
      continueUrl: buildLearnHref(input.collegeSlug, masterSlug, {
        variantId: variant.id as string,
      }),
    };
  }

  const courseKey = input.sourceId;
  const { data: course } = await applyMasterCourseKeyFilter(
    sb
      .from('master_courses')
      .select(
        'id, title, slug, pillar_id, show_as_paid_course, publish_status, selling_price, currency, catalog_type, bootcamp_id',
      )
      .eq('publish_status', 'published'),
    courseKey,
  ).maybeSingle();

  if (!course) return null;

  const sourceType = input.sourceType === 'paid_course_builder'
    || course.catalog_type === 'bootcamp'
    || course.bootcamp_id
    ? 'paid_course_builder'
    : 'master_course';

  const [pillar, meta] = await Promise.all([
    resolvePillarSlug(course.pillar_id as string | null),
    includeMetadata ? loadLandingMeta(sourceType, course.id as string) : null,
  ]);

  let priceMinor: number | null = (course.selling_price as number | null) ?? null;
  let currency = (course.currency as string) ?? 'INR';
  let isPurchasable = !!course.show_as_paid_course || sourceType === 'paid_course_builder';

  if (includePrice && isPurchasable) {
    const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
    const plans = await getActivePricePlansForSource(sourceType, course.id as string);
    const defaultPlan = plans.find((p) => p.is_default) ?? plans[0];
    if (defaultPlan) {
      priceMinor = defaultPlan.price_minor;
      currency = defaultPlan.currency;
    } else if (priceMinor == null) {
      isPurchasable = false;
    }
  }

  const title = meta?.title?.trim() || (course.title as string);
  const masterSlug = (course.slug as string) || (course.id as string);
  const pillarSlug = pillar?.slug
    ?? (sourceType === 'paid_course_builder' ? 'bootcamp' : null);

  return {
    sourceType,
    sourceId: course.id as string,
    parentMasterCourseId: course.id as string,
    masterCourseSlug: course.slug as string | null,
    pillarSlug,
    pillarTitle: pillar?.title ?? null,
    title,
    subtitle: meta?.subtitle?.trim() || null,
    description:
      meta?.short_description?.trim()
      || meta?.description?.trim()
      || null,
    thumbnailImageUrl: meta?.thumbnail_url?.trim() || meta?.cover_image_url?.trim() || null,
    coverImageUrl: meta?.cover_image_url?.trim() || meta?.thumbnail_url?.trim() || null,
    previewVideoUrl: meta?.preview_video_url?.trim() || null,
    priceMinor,
    currency,
    isPaidCourseEnabled: !!course.show_as_paid_course || sourceType === 'paid_course_builder',
    isPurchasable,
    unavailableReason: isPurchasable ? null : 'This course is not available for purchase.',
    detailUrl: pillarSlug
      ? buildPillarCourseDetailHref(input.collegeSlug, pillarSlug, masterSlug)
      : `/c/${input.collegeSlug}/student/pillars`,
    continueUrl: buildLearnHref(input.collegeSlug, masterSlug),
  };
}

/** Parse payment-success search params into paid product identity. */
export function parsePaidProductFromSearchParams(sp: {
  sourceType?: string;
  sourceId?: string;
  courseId?: string;
  variantId?: string;
}): { sourceType: PaidCourseSourceType; sourceId: string } | null {
  const rawType = sp.sourceType?.trim();
  const rawId = sp.sourceId?.trim();
  if (
    rawType
    && rawId
    && (rawType === 'master_course' || rawType === 'course_variant' || rawType === 'paid_course_builder')
  ) {
    return { sourceType: rawType, sourceId: rawId };
  }

  const variantId = sp.variantId?.trim();
  if (variantId && isUuid(variantId)) {
    return { sourceType: 'course_variant', sourceId: variantId };
  }

  const courseId = sp.courseId?.trim();
  if (courseId) {
    return { sourceType: 'master_course', sourceId: courseId };
  }

  return null;
}

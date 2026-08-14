import 'server-only';

/**
 * Normalized paid course catalog helpers.
 * Unifies pillar master courses (show_as_paid_course) and Paid Course Builder
 * courses (catalog_type = bootcamp) for Student LMS discovery and checkout.
 */

export type PaidCourseSourceType = 'master_course' | 'course_variant' | 'paid_course_builder';

export interface PaidCourseCatalogItem {
  id: string;
  sourceType: PaidCourseSourceType;
  sourceId: string;
  slug: string | null;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  priceMinor: number | null;
  currency: string;
  validityDays: number | null;
  isPublished: boolean;
  isVisible: boolean;
  isPurchasedOrAssigned: boolean;
  lessonCount: number;
  videoCount: number;
  totalDurationSeconds: number;
  metadata: Record<string, unknown>;
}

const VIRTUAL_PAID_BUILDER_PILLAR_ID = '__paid_course_builder__';
const VIRTUAL_PAID_BUILDER_PILLAR_SLUG = 'paid-courses';
export const LEGACY_BOOTCAMP_PILLAR_ID = '__bootcamp__';
export const LEGACY_BOOTCAMP_PILLAR_SLUG = 'bootcamp';

export type PaidCourseRowFlags = {
  id: string;
  catalog_type?: string | null;
  catalog_kind?: 'master_course' | 'variant' | null;
  variant_id?: string | null;
  bootcamp_id?: string | null;
  pillar_id?: string | null;
  show_as_paid_course?: boolean | null;
  paid_source_type?: PaidCourseSourceType | null;
  publish_status?: string | null;
  is_free?: boolean | null;
  pricing_model?: string | null;
};

export function resolvePaidCourseSourceType(
  course: Pick<PaidCourseRowFlags, 'catalog_type' | 'bootcamp_id'>,
): PaidCourseSourceType {
  if (course.catalog_type === 'bootcamp' || course.bootcamp_id) {
    return 'paid_course_builder';
  }
  return 'master_course';
}

/** Bootcamp / Paid Course Builder courses are always paid-catalog eligible when published. */
export function isPaidCourseBuilderCourse(
  course: Pick<PaidCourseRowFlags, 'catalog_type' | 'bootcamp_id'>,
): boolean {
  return course.catalog_type === 'bootcamp' || !!course.bootcamp_id;
}

/**
 * Whether a master course row should appear in the paid course catalog.
 * Entitled students always retain catalog visibility even when toggle is off.
 */
export type PaidLandingVisibilityFlags = {
  is_published?: boolean | null;
  is_visible?: boolean | null;
};

/**
 * Whether paid landing metadata is publicly discoverable.
 * Entitled students always retain access even when hidden from catalog.
 */
export function isPaidLandingPubliclyVisible(
  landing: PaidLandingVisibilityFlags | null | undefined,
  options?: { isEntitled?: boolean; hasPaidCatalogFlag?: boolean },
): boolean {
  if (options?.isEntitled) return true;
  if (!landing) {
    return !!options?.hasPaidCatalogFlag;
  }
  return !!landing.is_published && landing.is_visible !== false;
}

export function isPaidCatalogEligible(
  course: PaidCourseRowFlags,
  options?: { isEntitled?: boolean },
): boolean {
  const isPaid =
    course.paid_source_type === 'course_variant' ||
    (course.catalog_kind === 'variant' && course.show_as_paid_course) ||
    course.paid_source_type === 'paid_course_builder' ||
    isPaidCourseBuilderCourse(course) ||
    (!!course.pricing_model && course.pricing_model !== 'free') ||
    !!course.show_as_paid_course;

  if (!isPaid) return false;

  if (options?.isEntitled) return true;
  if (course.publish_status && course.publish_status !== 'published') return false;
  return true;
}

/** Paid catalog excludes free courses unless the student is already entitled. */
export function isPaidCatalogPremiumItem(
  course: Pick<PaidCourseRowFlags, 'is_free' | 'pricing_model' | 'paid_source_type' | 'catalog_type' | 'bootcamp_id'>,
  options?: { isEntitled?: boolean },
): boolean {
  if (options?.isEntitled) return true;
  if (isPaidCourseBuilderCourse(course) || course.paid_source_type === 'paid_course_builder') {
    return true;
  }
  if (course.is_free || course.pricing_model === 'free') return false;
  return true;
}

export function paidBuilderPillarPresentation(): {
  id: string;
  title: string;
  slug: string;
  description: null;
  short_description: null;
} {
  return {
    id: VIRTUAL_PAID_BUILDER_PILLAR_ID,
    title: 'Paid Courses',
    slug: VIRTUAL_PAID_BUILDER_PILLAR_SLUG,
    description: null,
    short_description: null,
  };
}

/** Resolve virtual pillar slug for paid course detail/checkout routes. */
function _resolvePaidCoursePillarSlug(
  course: Pick<PaidCourseRowFlags, 'catalog_type' | 'bootcamp_id' | 'pillar_id'>,
  pillarSlug?: string | null,
): string {
  if (isPaidCourseBuilderCourse(course)) {
    return LEGACY_BOOTCAMP_PILLAR_SLUG;
  }
  return pillarSlug ?? LEGACY_BOOTCAMP_PILLAR_SLUG;
}

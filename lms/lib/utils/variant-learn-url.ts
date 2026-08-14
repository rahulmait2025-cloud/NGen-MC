/** Client-safe learn URL helpers (no server-only imports). */

const VARIANT_QUERY_KEY = 'variant';
const SOURCE_TYPE_QUERY_KEY = 'sourceType';
const SOURCE_ID_QUERY_KEY = 'sourceId';

export type LearnHrefOptions = {
  variantId?: string | null;
  variantSlug?: string | null;
  itemId?: string;
  itemSlug?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
};

export function buildLearnHref(
  collegeSlug: string,
  courseSlug: string,
  options?: LearnHrefOptions,
): string {
  const itemKey = options?.itemSlug?.trim() || options?.itemId;
  const path = itemKey
    ? `/c/${collegeSlug}/student/learn/${courseSlug}/lessons/${itemKey}`
    : `/c/${collegeSlug}/student/learn/${courseSlug}`;

  const params = new URLSearchParams();
  const variantId = options?.variantSlug?.trim() || options?.variantId?.trim();
  if (variantId) params.set(VARIANT_QUERY_KEY, variantId);
  const sourceType = options?.sourceType?.trim();
  const sourceId = options?.sourceId?.trim();
  if (sourceType && sourceId) {
    params.set(SOURCE_TYPE_QUERY_KEY, sourceType);
    params.set(SOURCE_ID_QUERY_KEY, sourceId);
  }

  const query = params.toString();
  if (!query) return path;
  return `${path}?${query}`;
}

function _resolveSourceFromSearchParams(sp: {
  sourceType?: string;
  sourceId?: string;
}): { sourceType: string | null; sourceId: string | null } {
  return {
    sourceType: sp.sourceType?.trim() || null,
    sourceId: sp.sourceId?.trim() || null,
  };
}

export function buildPillarCourseDetailHref(
  collegeSlug: string,
  pillarSlug: string,
  courseSlug: string,
  variantSlug?: string | null,
): string {
  const base = `/c/${collegeSlug}/student/pillars/${pillarSlug}/courses/${courseSlug}`;
  const id = variantSlug?.trim();
  if (!id) return base;
  return `${base}?${VARIANT_QUERY_KEY}=${encodeURIComponent(id)}`;
}

/** Canonical ?variant=; legacy ?variantId= supported for inbound links. */
export function resolveVariantIdFromSearchParams(sp: {
  variantId?: string;
  variant?: string;
}): string | null {
  return sp.variant?.trim() || sp.variantId?.trim() || null;
}

export type PaymentSuccessHrefInput = {
  sourceType?: 'master_course' | 'course_variant' | 'paid_course_builder' | null;
  sourceId?: string | null;
  /** Legacy master course id — kept for backward compatibility. */
  courseId?: string | null;
  variantId?: string | null;
  bundleSlug?: string | null;
  bootcamp?: boolean;
};

/** Build payment-success URL preserving exact paid product identity. */
export function buildPaymentSuccessHref(
  collegeSlug: string,
  input: PaymentSuccessHrefInput,
): string {
  const base = `/c/${collegeSlug}/student/payment-success`;
  const params = new URLSearchParams();

  if (input.bootcamp) {
    params.set('bootcamp', '1');
    return `${base}?${params.toString()}`;
  }

  if (input.bundleSlug?.trim()) {
    params.set('bundleSlug', input.bundleSlug.trim());
    return `${base}?${params.toString()}`;
  }

  const sourceType = input.sourceType?.trim();
  const sourceId = input.sourceId?.trim();
  const variantId = input.variantId?.trim();
  const courseId = input.courseId?.trim();

  if (sourceType && sourceId) {
    params.set('sourceType', sourceType);
    params.set('sourceId', sourceId);
    if (courseId && sourceType === 'course_variant') {
      params.set('courseId', courseId);
    }
    return `${base}?${params.toString()}`;
  }

  if (variantId) {
    params.set('sourceType', 'course_variant');
    params.set('sourceId', variantId);
    if (courseId) params.set('courseId', courseId);
    return `${base}?${params.toString()}`;
  }

  if (courseId) {
    params.set('courseId', courseId);
    return `${base}?${params.toString()}`;
  }

  return base;
}

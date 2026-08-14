/**
 * Canonical purchased-content display titles for LMS commerce surfaces.
 * Plan/duration labels must never replace the primary offering title.
 */

export type PurchasedContentType =
  | 'master_course'
  | 'course_variant'
  | 'course_bundle'
  | 'job_ready_bootcamp'
  | 'paid_mentorship_booking'
  | 'note_collection'
  | string;

export type PurchasedContentDisplay = {
  primaryTitle: string;
  secondaryLabel: string | null;
  contentType: PurchasedContentType | null;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function defaultTitleForType(entityType: string | null | undefined): string {
  switch (entityType) {
    case 'course_bundle':
      return 'Purchased bundle';
    case 'course_variant':
      return 'Purchased course';
    case 'job_ready_bootcamp':
      return 'Job Ready Bootcamp';
    case 'paid_mentorship_booking':
      return 'Mentorship Session';
    case 'note_collection':
      return 'Note Collection';
    case 'master_course':
    default:
      return 'Purchased course';
  }
}

function snapshotTitleFromMetadata(
  entityType: string | null | undefined,
  meta: Record<string, unknown>,
): string | null {
  const entityTitle = asNonEmptyString(meta.entity_title);
  if (entityTitle) return entityTitle;

  switch (entityType) {
    case 'course_bundle':
      return asNonEmptyString(meta.bundle_title) ?? asNonEmptyString(meta.title);
    case 'course_variant':
      return asNonEmptyString(meta.variant_title);
    case 'job_ready_bootcamp':
      return (
        asNonEmptyString(meta.bootcamp_title) ??
        asNonEmptyString(meta.course_title) ??
        asNonEmptyString(meta.title)
      );
    case 'paid_mentorship_booking':
      return asNonEmptyString(meta.category_title);
    case 'master_course':
    default:
      return asNonEmptyString(meta.course_title) ?? asNonEmptyString(meta.title);
  }
}

function planLabelFromMetadata(meta: Record<string, unknown>): string | null {
  const planName = asNonEmptyString(meta.plan_name);
  if (!planName) return null;

  const validityDays = meta.validity_days;
  if (typeof validityDays === 'number' && Number.isFinite(validityDays) && validityDays > 0) {
    const months = validityDays / 30;
    if (Number.isInteger(months) && months >= 1) {
      return `${planName} · ${months} month${months === 1 ? '' : 's'}`;
    }
    return `${planName} · ${validityDays} days`;
  }

  return planName;
}

/**
 * Resolve primary offering title + optional plan/duration secondary label.
 *
 * Precedence for primaryTitle:
 * 1. Immutable order metadata snapshot (entity_title / type-specific title)
 * 2. Live entity title resolved by entity_id (historical backfill)
 * 3. Safe generic label
 *
 * `plan_name` is never used as primaryTitle.
 */
export function resolvePurchasedContentDisplay(input: {
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
  liveEntityTitle?: string | null;
}): PurchasedContentDisplay {
  const entityType = input.entityType ?? null;
  const meta = input.metadata ?? {};
  const snapshot = snapshotTitleFromMetadata(entityType, meta);
  const live = asNonEmptyString(input.liveEntityTitle);
  const primaryTitle = snapshot ?? live ?? defaultTitleForType(entityType);
  const secondaryLabel = planLabelFromMetadata(meta);

  return {
    primaryTitle,
    secondaryLabel,
    contentType: entityType,
  };
}

export function contentTitleMetadataKey(
  entityType: string,
): 'course_title' | 'variant_title' | 'bundle_title' | 'bootcamp_title' | 'entity_title' {
  switch (entityType) {
    case 'course_variant':
      return 'variant_title';
    case 'course_bundle':
      return 'bundle_title';
    case 'job_ready_bootcamp':
      return 'bootcamp_title';
    case 'master_course':
      return 'course_title';
    default:
      return 'entity_title';
  }
}

/**
 * Canonical entitlement / assignment validity helpers.
 * Pure functions — safe to unit test without server-only stubs.
 *
 * Rules:
 *   notStarted = validFrom != null && now < validFrom
 *   expired    = validUntil != null && now > validUntil
 *   active     = !notStarted && !expired
 *
 * Null validUntil = unlimited access.
 * Null validFrom  = already started (no start gate).
 */

export type AccessValidityStatus = 'active' | 'expired' | 'not_started';

export type CourseAccessStatus =
  | AccessValidityStatus
  | 'not_enrolled';

export type CourseAccessSource =
  | 'student_entitlement'
  | 'college_assignment'
  | 'free_enrollment'
  | 'bundle'
  | 'legacy'
  | 'content_entitlement'
  | null;

export type CourseAccessResult = {
  hasAccess: boolean;
  status: CourseAccessStatus;
  source: CourseAccessSource;
  validFrom: string | null;
  validUntil: string | null;
  reason: string;
  entitlementId: string | null;
};

/** Parse optional date strings; empty / invalid → null (not Invalid Date). */
export function parseOptionalDate(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const trimmed = typeof value === 'string' ? value.trim() : String(value);
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function classifyAccessValidity(
  input: {
    validFrom?: string | null;
    validUntil?: string | null;
    /** Prefer valid_from / valid_until column names from DB rows. */
    valid_from?: string | null;
    valid_until?: string | null;
  },
  now: Date = new Date(),
): AccessValidityStatus {
  const validFrom = parseOptionalDate(input.validFrom ?? input.valid_from);
  const validUntil = parseOptionalDate(input.validUntil ?? input.valid_until);

  if (validFrom != null && now < validFrom) return 'not_started';
  if (validUntil != null && now > validUntil) return 'expired';
  return 'active';
}

export function isValidityWindowActive(
  input: {
    validFrom?: string | null;
    validUntil?: string | null;
    valid_from?: string | null;
    valid_until?: string | null;
  },
  now: Date = new Date(),
): boolean {
  return classifyAccessValidity(input, now) === 'active';
}

/**
 * PostgREST `.or()` fragments for active validity windows.
 * Null valid_from / valid_until must remain eligible (unlike `.lte('valid_from', now)`).
 */
export function validFromActiveOrFilter(nowIso: string): string {
  return `valid_from.is.null,valid_from.lte.${nowIso}`;
}

export function validUntilActiveOrFilter(nowIso: string): string {
  return `valid_until.is.null,valid_until.gte.${nowIso}`;
}

export function mapSourceTypeToCourseAccessSource(
  sourceType: string | null | undefined,
  metadata?: Record<string, unknown> | null,
): CourseAccessSource {
  if (!sourceType) return null;
  if (
    sourceType === 'free_course' ||
    metadata?.enrollment_type === 'free_course' ||
    metadata?.source === 'free_course_enrollment'
  ) {
    return 'free_enrollment';
  }
  if (sourceType === 'college_assignment' || sourceType === 'b2b_college') {
    return 'college_assignment';
  }
  if (sourceType === 'bundle' || sourceType === 'bundle_purchase') {
    return 'bundle';
  }
  if (sourceType === 'legacy' || sourceType === 'legacy_enrollment') {
    return 'legacy';
  }
  return 'student_entitlement';
}

export function buildCourseAccessResult(input: {
  status: CourseAccessStatus;
  source?: CourseAccessSource;
  validFrom?: string | null;
  validUntil?: string | null;
  reason?: string;
  entitlementId?: string | null;
}): CourseAccessResult {
  const hasAccess = input.status === 'active';
  const reason =
    input.reason ??
    (input.status === 'active'
      ? 'Access granted'
      : input.status === 'expired'
        ? 'Entitlement validity has ended'
        : input.status === 'not_started'
          ? 'Entitlement has not started yet'
          : 'No enrollment or entitlement found');

  return {
    hasAccess,
    status: input.status,
    source: input.source ?? null,
    validFrom: input.validFrom ?? null,
    validUntil: input.validUntil ?? null,
    reason,
    entitlementId: input.entitlementId ?? null,
  };
}

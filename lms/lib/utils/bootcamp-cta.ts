import { buildLearnHref, buildPillarCourseDetailHref } from '@/lib/utils/variant-learn-url';
import type { PillarCatalogCourse } from '@/components/pillars/pillar-catalog-tabs';

export interface BootcampCtaState {
  href: string;
  label: string;
  showEligibility: boolean;
}

export function resolveBootcampCta(
  courses: PillarCatalogCourse[],
  collegeSlug: string,
  pillarSlug: string,
): BootcampCtaState {
  const primary =
    courses.find((c) => c.catalog_kind === 'variant') ?? courses[0] ?? null;

  if (!primary) {
    return { href: '#curriculum', label: 'View Curriculum', showEligibility: false };
  }

  if (primary.entitled) {
    const hasProgress = (primary.progress_percentage ?? 0) > 0;
    return {
      href: buildLearnHref(collegeSlug, primary.id, { variantId: primary.variant_id }),
      label: hasProgress ? 'Resume Learning' : 'Start Learning',
      showEligibility: false,
    };
  }

  return {
    href: buildPillarCourseDetailHref(
      collegeSlug,
      pillarSlug,
      primary.id,
      primary.variant_id,
    ),
    label: primary.is_free ? 'View Free Course' : 'Enroll Now',
    showEligibility: true,
  };
}

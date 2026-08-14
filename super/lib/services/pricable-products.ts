import type { MasterCoursesRow } from '@/types/database';
import {
  isPaidCourseBuilderCourse,
  resolvePaidCourseSourceType,
} from '@/lib/services/paid-course-source';

export { isPaidCourseBuilderCourse } from '@/lib/services/paid-course-source';

export type PricableProductKind = 'paid_course' | 'master_course' | 'course_variant';

export interface PricableProductRow {
  id: string;
  kind: PricableProductKind;
  title: string;
  code: string;
  masterCourseId: string;
  sourceType: 'master_course' | 'course_variant' | 'paid_course_builder';
  sourceId: string;
  pricing_model?: string | null;
  publish_status: string;
}

export interface PricableVariantInput {
  id: string;
  title: string;
  code: string;
  master_course_id: string;
  publish_status: string;
  show_as_paid_course?: boolean | null;
  pricing_model?: string | null;
}

export function isMasterCoursePricable(course: MasterCoursesRow): boolean {
  return isPaidCourseBuilderCourse(course) || !!course.show_as_paid_course;
}

export function isVariantPricable(variant: PricableVariantInput): boolean {
  return !!variant.show_as_paid_course;
}

export function buildPricableProducts(
  courses: MasterCoursesRow[],
  variants: PricableVariantInput[],
): PricableProductRow[] {
  const courseRows: PricableProductRow[] = courses.reduce((acc, course) => {
    if (isMasterCoursePricable(course)) {
      acc.push({
        id: course.id,
        kind: isPaidCourseBuilderCourse(course) ? 'paid_course' : 'master_course',
        title: course.title,
        code: course.code,
        masterCourseId: course.id,
        sourceType: resolvePaidCourseSourceType(course),
        sourceId: course.id,
        pricing_model: course.pricing_model,
        publish_status: course.publish_status,
      });
    }
    return acc;
  }, [] as PricableProductRow[]);

  const variantRows: PricableProductRow[] = variants.reduce((acc, variant) => {
    if (isVariantPricable(variant)) {
      acc.push({
        id: variant.id,
        kind: 'course_variant',
        title: variant.title,
        code: variant.code,
        masterCourseId: variant.master_course_id,
        sourceType: 'course_variant',
        sourceId: variant.id,
        pricing_model: variant.pricing_model,
        publish_status: variant.publish_status,
      });
    }
    return acc;
  }, [] as PricableProductRow[]);

  return [...courseRows, ...variantRows];
}

export function pricableProductKindLabel(kind: PricableProductKind): string {
  switch (kind) {
    case 'paid_course':
      return 'Paid Course';
    case 'master_course':
      return 'Master Course';
    case 'course_variant':
      return 'Course Variant';
  }
}

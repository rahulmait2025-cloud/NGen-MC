/** Client-safe paid product source types and resolvers (no server-only). */

export type PaidCourseSourceType = 'master_course' | 'paid_course_builder' | 'course_variant';

export function isPaidCourseBuilderCourse(course: {
  catalog_type?: string | null;
  bootcamp_id?: string | null;
}): boolean {
  return course.catalog_type === 'bootcamp' || !!course.bootcamp_id;
}

export function resolvePaidCourseSourceType(course: {
  catalog_type?: string | null;
  bootcamp_id?: string | null;
}): PaidCourseSourceType {
  if (isPaidCourseBuilderCourse(course)) {
    return 'paid_course_builder';
  }
  return 'master_course';
}

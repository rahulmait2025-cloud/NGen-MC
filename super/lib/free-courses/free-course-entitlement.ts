/** True for free-course enrollments (new source_type or legacy metadata). */
export function isFreeCourseEnrollment(row: {
  source_type: string;
  metadata?: unknown;
}): boolean {
  if (row.source_type === 'free_course') return true;
  if (!row.metadata || typeof row.metadata !== 'object' || Array.isArray(row.metadata)) {
    return false;
  }
  return (row.metadata as Record<string, unknown>).source === 'free_course_enrollment';
}

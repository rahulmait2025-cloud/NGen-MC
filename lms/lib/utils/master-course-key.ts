import { isUuid } from '@/lib/utils/slug';

/** Whether a route/action param is a master_courses UUID or slug. */
function isMasterCourseUuid(courseKey: string): boolean {
  return isUuid(courseKey);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Apply id or slug filter for master_courses lookups from URL params. */
export function applyMasterCourseKeyFilter(
  query: any,
  courseKey: string,
): any {
  return isMasterCourseUuid(courseKey)
    ? query.eq('id', courseKey)
    : query.eq('slug', courseKey);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

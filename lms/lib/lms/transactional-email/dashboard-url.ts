import 'server-only';

import { getStudentAppBaseUrl } from '@/lib/lms/transactional-email/student-app-base-url';

/** Student learning home (pillars list) for a college or direct-learner tenant. */
export function buildStudentDashboardUrl(collegeSlug?: string): string {
  const appUrl = getStudentAppBaseUrl();
  const slug = collegeSlug?.trim() || 'direct-learners';
  return `${appUrl}/c/${encodeURIComponent(slug)}/student/pillars`;
}

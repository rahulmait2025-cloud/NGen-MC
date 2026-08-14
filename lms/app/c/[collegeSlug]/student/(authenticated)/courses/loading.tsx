import { StudentRouteLoadingShell } from '@/components/student/student-route-loading-shell';

/**
 * Course catalog loading — returns null.
 * Static shell (hero, trust strip, etc.) renders immediately.
 * Catalog data streams via Suspense in the page component.
 */
export default function Loading() {
  return <StudentRouteLoadingShell />;
}

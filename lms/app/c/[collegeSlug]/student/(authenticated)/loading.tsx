import { StudentRouteLoadingShell } from '@/components/student/student-route-loading-shell';

/**
 * Route-level loading UI for authenticated pages.
 * Shows a skeleton shell while the destination RSC payload streams.
 */
export default function Loading() {
  return <StudentRouteLoadingShell />;
}

import { StudentRouteLoadingShell } from '@/components/student/student-route-loading-shell';

/**
 * My courses page loading — returns null.
 * Page header streams immediately. Dynamic data loads via Suspense in page components.
 */
export default function Loading() {
  return <StudentRouteLoadingShell />;
}

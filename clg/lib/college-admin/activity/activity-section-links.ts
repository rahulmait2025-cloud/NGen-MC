import type { ModuleId } from '@/lib/modules/module-registry';

export type ActivitySectionId = 'logs' | 'performance' | 'video' | 'leaderboard';

export interface ActivitySectionLink {
  id: ActivitySectionId;
  label: string;
  /** Path under /admin (no college prefix). */
  path: string;
  moduleId: ModuleId;
}

export const ACTIVITY_SECTION_LINKS: ActivitySectionLink[] = [
  { id: 'logs', label: 'Logs', path: '/activity', moduleId: 'activity' },
  { id: 'performance', label: 'Performance', path: '/activity/performance', moduleId: 'analytics' },
  {
    id: 'video',
    label: 'Video & leaderboard',
    path: '/activity/video',
    moduleId: 'analytics',
  },
];

export function buildActivityAdminBasePath(collegeSlug: string): string {
  return `/c/${encodeURIComponent(collegeSlug)}/admin`;
}

export function resolveActiveActivitySection(
  pathname: string,
  adminBasePath: string,
): ActivitySectionId {
  const full = (segment: string) => `${adminBasePath}${segment}`;

  if (pathname.startsWith(full('/activity/leaderboard'))) {
    return 'video';
  }
  if (pathname.startsWith(full('/activity/video'))) {
    return 'video';
  }
  if (pathname.startsWith(full('/activity/performance'))) {
    return 'performance';
  }
  if (pathname === full('/activity') || pathname === `${full('/activity')}/`) {
    return 'logs';
  }
  return 'logs';
}

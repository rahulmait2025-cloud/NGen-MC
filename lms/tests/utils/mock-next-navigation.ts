/**
 * Lightweight in-memory Next.js navigation for Vitest UI tests.
 * Link clicks / router.push update this store; usePathname subscribers re-render.
 *
 * Does not claim to verify middleware, cookies, or real Next.js server navigation.
 */

import {
  studentBasePath,
  studentDashboardHref,
} from '@/lib/student/student-home-route';

const EXPLORE_PATH = '/c/nextgen/student';

let pathname = EXPLORE_PATH;
let search = '';
let cachedSearchParams = new URLSearchParams('');
let cachedSearchKey = '';
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getMockPathname(): string {
  return pathname;
}

export function getMockSearch(): string {
  return search;
}

export function getMockSearchParams(): URLSearchParams {
  // useSyncExternalStore requires a cached snapshot reference for the same search value.
  if (cachedSearchKey !== search) {
    cachedSearchKey = search;
    cachedSearchParams = new URLSearchParams(search);
  }
  return cachedSearchParams;
}

export function setMockPathname(next: string): void {
  const [pathPart = next, queryPart = ''] = next.split('?');
  const normalized = pathPart.split('#')[0] || next;
  const nextSearch = queryPart.split('#')[0] || '';
  if (normalized === pathname && nextSearch === search) return;
  pathname = normalized;
  search = nextSearch;
  notify();
}

export function subscribeMockPathname(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetMockPathname(initialPath: string = EXPLORE_PATH): void {
  const [pathPart = initialPath, queryPart = ''] = initialPath.split('?');
  pathname = pathPart.split('#')[0] || initialPath;
  search = queryPart.split('#')[0] || '';
  cachedSearchKey = '';
  cachedSearchParams = new URLSearchParams(search);
  notify();
}

export const MOCK_TENANT_SLUG = 'nextgen';
export const MOCK_EXPLORE_PATH = EXPLORE_PATH;
export const MOCK_COURSES_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/courses`;
export const MOCK_DASHBOARD_PATH = studentDashboardHref(MOCK_TENANT_SLUG);
export const MOCK_SHEETS_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/sheets`;
export const MOCK_NOTES_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/notes`;
export const MOCK_MENTORSHIP_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/mentorship`;
export const MOCK_MY_APPLICATIONS_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/my-applications`;
export const MOCK_JOBS_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/jobs`;
export const MOCK_ANALYTICS_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/analytics`;
export const MOCK_CODE_PULSE_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/stats`;
export const MOCK_PAYMENT_HISTORY_PATH = `${studentBasePath(MOCK_TENANT_SLUG)}/payment-history`;

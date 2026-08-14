'use client';

import { useTenant } from '@/providers/tenant-provider';

/**
 * Returns tenant-aware path helpers for building URLs.
 * Use in client components that need to navigate within the tenant context.
 *
 * NOTE: The `dashboard` helper returns the flat /dashboard sibling route,
 * not a legacy /dashboard/... prefix.  All modules are siblings under
 * (authenticated).
 */
export function useTenantPath() {
  const { slug } = useTenant();
  const basePath = slug ? `/c/${slug}/admin` : '';

  return {
    slug,
    basePath,
    dashboard: () => `${basePath}/dashboard`,
    section: (moduleId: string) => `${basePath}/${moduleId}`,
    settings: () => `${basePath}/settings`,
    login: () => slug ? `/c/${slug}/admin/login` : '/login',
    assessments: () => `${basePath}/assessments`,
  };
}



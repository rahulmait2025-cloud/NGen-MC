import type { TenantBranding } from '@/types/tenant';

/** Default fallback when no tenant is resolved. */
const DEFAULT_BRANDING: TenantBranding = {
  id: 'default',
  name: 'Student Portal',
  slug: 'default',
  shortName: 'Portal',
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
};

/**
 * Sync version for client/components. Returns default.
 * For server-side branding from DB, use getTenantBranding from '@/lib/tenant/get-tenant-branding-server'.
 */
export function getTenantBrandingSync(slug?: string | null): TenantBranding {
  if (!slug || slug === 'default') {
    return DEFAULT_BRANDING;
  }
  return DEFAULT_BRANDING;
}


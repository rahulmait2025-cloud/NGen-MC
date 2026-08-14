/**
 * Tenant branding fields used for UI (name, logo, colors).
 * Matches colleges table shape used for slug-based resolution.
 */
export interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

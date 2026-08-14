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
  /** Optional batch/cohort label for sidebar card */
  batchLabel?: string | null;
  /** Optional program name for sidebar card */
  programLabel?: string | null;
}

export const FEATURE_KEYS = [
  'lectures',
  'attendance',
  'notifications',
  'certificate_generation',
  'audit_dashboard',
  'bulk_import',
  'custom_branding',
  'api_access',
  'sso',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}

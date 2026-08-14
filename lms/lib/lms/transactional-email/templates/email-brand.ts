import { BRAND_ASSETS } from '@/lib/brand/assets';
import { getStudentAppBaseUrl } from '@/lib/lms/transactional-email/student-app-base-url';

/** Shared NextGen CTO email brand tokens (aligned with student invite + Career Readiness shells). */

export const EMAIL_BRAND = {
  headerBg: '#0B0F19',
  accent: '#F59E0B',
  accentGradient: 'linear-gradient(135deg,#e58c33 0%,#d97a1f 100%)',
  logoUrl: BRAND_ASSETS.logoEmail,
  get websiteUrl(): string {
    return getStudentAppBaseUrl();
  },
  headerDisplay: 'NextGen CTO',
  programName: 'NextGen CTO Career Readiness Program',
} as const;

export function firstNameFrom(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function fallbackText(value: string | undefined | null, fallback: string): string {
  const v = value?.trim();
  return v && v.length > 0 ? v : fallback;
}

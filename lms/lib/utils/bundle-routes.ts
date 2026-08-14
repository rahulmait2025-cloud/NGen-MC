import { studentBasePath } from '@/lib/student/student-home-route';

export interface BundleIdentity {
  slug: string;
  title: string;
  code: string;
}

const CAREER_READINESS_SLUG_MARKERS = [
  'career-readiness',
  'career-readiness-program',
  'job-ready-bootcamp',
  'complete-career-readiness',
] as const;

/** Career Readiness / Job Ready Bootcamp bundles use the dedicated bootcamp flow. */
export function isCareerReadinessBundle(bundle: BundleIdentity): boolean {
  const slug = bundle.slug.toLowerCase().trim();
  const title = bundle.title.toLowerCase().trim();
  const code = bundle.code.toLowerCase().trim();

  if (CAREER_READINESS_SLUG_MARKERS.some((marker) => slug.includes(marker))) {
    return true;
  }

  return (
    title.includes('career readiness program') ||
    title.includes('job ready bootcamp') ||
    title.includes('complete career readiness') ||
    code.includes('career-readiness') ||
    code.includes('crp')
  );
}

export function buildBundleHref(collegeSlug: string, bundleSlug: string): string {
  return `${studentBasePath(collegeSlug)}/bundles/${encodeURIComponent(bundleSlug)}`;
}

/** Enrolled student's bundle learning hub (course list inside bundle). */
export function buildBundleLearnHref(collegeSlug: string, bundleSlug: string): string {
  return `${studentBasePath(collegeSlug)}/my-courses/bundles/${encodeURIComponent(bundleSlug)}`;
}

export function resolveCareerReadinessBundleHref(collegeSlug: string): string {
  return `${studentBasePath(collegeSlug)}/bootcamp`;
}

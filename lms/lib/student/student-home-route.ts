/** Strip query, hash, and trailing slashes for stable route matching. */
export function normalizeStudentPathname(pathname: string | null): string {
  if (!pathname) return '';
  let path = pathname.split('?')[0].split('#')[0];
  if (path.length > 1) {
    path = path.replace(/\/+$/, '');
  }
  return path;
}

/** Authenticated student home: /c/[collegeSlug]/student only (no child segment). */
export function isStudentHomeRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student$/.test(normalizeStudentPathname(pathname));
}

/** Pillar bootcamp landing: /c/[collegeSlug]/student/pillars/[pillarSlug] only. */
function isStudentPillarLandingRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/pillars\/[^/]+$/.test(normalizeStudentPathname(pathname));
}

/** Pillar course detail (catalog landing): /c/[collegeSlug]/student/pillars/[pillarSlug]/courses/[courseId]. */
function isStudentPillarCourseDetailRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/pillars\/[^/]+\/courses\/[^/]+$/.test(
    normalizeStudentPathname(pathname),
  );
}

/** Job Ready Bootcamp marketing routes (landing, pillar catalog, connected-course preview). */
function isStudentBootcampLandingRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/bootcamp(?:\/pillars\/[^/]+(?:\/courses\/[^/]+)?)?$/.test(
    normalizeStudentPathname(pathname),
  );
}

/** All courses hub: /c/[collegeSlug]/student/courses only. */
function isStudentAllCoursesHubRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/courses$/.test(normalizeStudentPathname(pathname));
}

/** Paid courses landing page: /c/[collegeSlug]/student/paid-courses only (no child segment). */
function isStudentPaidCoursesLandingRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/paid-courses$/.test(normalizeStudentPathname(pathname));
}

/** Free courses landing page: /c/[collegeSlug]/student/free-courses only. */
function isStudentFreeCoursesLandingRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/free-courses$/.test(normalizeStudentPathname(pathname));
}

/** Individual bundle landing: /c/[collegeSlug]/student/bundles/[bundleSlug]. */
export function isStudentBundleLandingRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/bundles\/[^/]+$/.test(normalizeStudentPathname(pathname));
}

/** Payment / enrollment confirmation: /c/[collegeSlug]/student/payment-success */
export function isStudentPaymentSuccessRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/payment-success$/.test(normalizeStudentPathname(pathname));
}

/** Our Team page: /c/[collegeSlug]/student/our-team */
function isStudentOurTeamRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/our-team$/.test(normalizeStudentPathname(pathname));
}

/** Full-bleed Explore-style pages (home, pillar landing/course detail, bootcamp marketing, course hubs, paid/free landing, our team). */
export function isStudentExploreStyleRoute(pathname: string | null): boolean {
  return (
    isStudentHomeRoute(pathname) ||
    isStudentPillarLandingRoute(pathname) ||
    isStudentPillarCourseDetailRoute(pathname) ||
    isStudentBootcampLandingRoute(pathname) ||
    isStudentAllCoursesHubRoute(pathname) ||
    isStudentPaidCoursesLandingRoute(pathname) ||
    isStudentFreeCoursesLandingRoute(pathname) ||
    isStudentBundleLandingRoute(pathname) ||
    isStudentOurTeamRoute(pathname)
  );
}

export function studentBasePath(collegeSlug: string): string {
  return `/c/${encodeURIComponent(collegeSlug)}/student`;
}

/** Dashboard (not the Explore landing page). */
export function studentDashboardHref(collegeSlug: string): string {
  return `${studentBasePath(collegeSlug)}/dashboard`;
}

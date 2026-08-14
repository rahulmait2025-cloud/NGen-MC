const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AuthenticatedTenant = {
  slug: string;
  studentBasePath: string;
  loginPath: string;
  dashboardPath: string;
  myCoursesPath: string;
};

export function getAuthenticatedTenant(): AuthenticatedTenant {
  const slug = process.env.E2E_TENANT_SLUG;

  if (!slug) {
    throw new Error(
      'E2E_TENANT_SLUG is required for authenticated Playwright tests.',
    );
  }

  if (!TENANT_SLUG_PATTERN.test(slug)) {
    throw new Error(
      'E2E_TENANT_SLUG must be a lowercase tenant slug containing only letters, numbers, and single hyphens.',
    );
  }

  const studentBasePath = `/c/${slug}/student`;

  return {
    slug,
    studentBasePath,
    loginPath: `${studentBasePath}/login`,
    dashboardPath: `${studentBasePath}/dashboard`,
    myCoursesPath: `${studentBasePath}/my-courses`,
  };
}

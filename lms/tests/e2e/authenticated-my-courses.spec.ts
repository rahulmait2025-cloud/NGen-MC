import { test, expect, type Locator } from '@playwright/test';
import { getAuthenticatedTenant } from './helpers/authenticated-tenant';

const FORBIDDEN_MUTATION_PATTERN =
  /\/api\/(?:student\/lecture-progress|paid-mentorship|complete-invite|migrate)|progress-actions|unenroll|create-order|verify-payment/i;

type AccessibleCourse = {
  title: string;
  href: string;
  link: Locator;
};

async function findAccessibleCourse(
  page: import('@playwright/test').Page,
  studentBasePath: string,
): Promise<AccessibleCourse | null> {
  const tabOrder = ['Courses', 'Free'] as const;

  for (const tabName of tabOrder) {
    const tab = page.getByRole('tab', { name: new RegExp(`^${tabName} \\d+`) });
    if ((await tab.count()) === 0) {
      continue;
    }

    await tab.click();

    const emptyTabMessage = page.getByText('No direct course enrollments yet.');
    if (await emptyTabMessage.isVisible().catch(() => false)) {
      continue;
    }

    const headings = page.getByRole('heading', { level: 3 });
    const headingCount = await headings.count();

    for (let index = 0; index < headingCount; index += 1) {
      const heading = headings.nth(index);
      const title = (await heading.innerText()).trim();

      if (!title || title === 'Job Ready Bootcamp') {
        continue;
      }

      const link = page.locator('a').filter({ has: heading }).first();
      if ((await link.count()) === 0) {
        continue;
      }

      const href = await link.getAttribute('href');
      if (!href) {
        continue;
      }

      const isLearnCourse = href.startsWith(`${studentBasePath}/learn/`);
      const isYoutubeCourse = href.startsWith(
        `${studentBasePath}/courses/youtube/`,
      );

      if (!isLearnCourse && !isYoutubeCourse) {
        continue;
      }

      if (
        href.includes('/admin') ||
        href.includes('/login') ||
        href.includes('/c/direct-learners/')
      ) {
        continue;
      }

      return { title, href, link };
    }
  }

  return null;
}

test.describe('Authenticated test-tenant My Courses', () => {
  test('loads My Courses and opens an accessible course read-only', async ({ page }) => {
    const { slug, studentBasePath, dashboardPath, myCoursesPath } =
      getAuthenticatedTenant();
    const tenantStudentUrl = new RegExp(`/c/${slug}/student`);
    const learnRoute = new RegExp(
      `^/c/${slug}/student/learn/[^/]+(?:/lessons/[^/]+)?(?:\\?.*)?$`,
    );
    const youtubeCourseRoute = new RegExp(
      `^/c/${slug}/student/courses/youtube/[^/]+(?:\\?.*)?$`,
    );
    const businessMutations: string[] = [];

    page.on('request', (request) => {
      const method = request.method();
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return;
      }

      const url = request.url();
      if (FORBIDDEN_MUTATION_PATTERN.test(url)) {
        businessMutations.push(`${method} ${url}`);
      }
    });

    await test.step('Pre-state — Open My Courses with saved authentication', async () => {
      await page.goto(myCoursesPath);
    });

    await test.step('Post-state — Verify the test-tenant My Courses route', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/my-courses/?(\\?.*)?$`),
        { timeout: 30_000 },
      );
      await expect(page).toHaveURL(tenantStudentUrl);
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step('Post-state — Verify My Courses heading and authenticated navigation', async () => {
      await expect(
        page.locator('header').getByText('My Courses', { exact: true }),
      ).toBeVisible({ timeout: 30_000 });

      const myCoursesNavLink = page.getByRole('link', { name: 'My Courses' });
      await expect(myCoursesNavLink).toBeVisible();
      await expect(myCoursesNavLink).toHaveAttribute(
        'href',
        myCoursesPath,
      );

      const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
      await expect(dashboardLink).toBeVisible();
      await expect(dashboardLink).toHaveAttribute(
        'href',
        dashboardPath,
      );
    });

    await test.step('Post-state — Verify login, foreign-tenant, and crash UI is absent', async () => {
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toHaveCount(0);
      await expect(page.getByText('Invalid email or password.')).toHaveCount(0);
      await expect(
        page.getByText('You do not have student access to this college.'),
      ).toHaveCount(0);
      await expect(page.getByText('Access Denied')).toHaveCount(0);
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
      await expect(page.getByText('Welcome Future CTO')).toHaveCount(0);
      await expect(page.getByText(/direct-learners/i)).toHaveCount(0);
    });

    const hasPageLevelEmpty = await test.step(
      'Post-state — Check for the approved page-level empty state',
      async () =>
        page
          .getByText('No courses yet')
          .isVisible({ timeout: 30_000 })
          .catch(() => false),
    );

    if (hasPageLevelEmpty) {
      await test.step('Post-state — Verify the approved empty state action', async () => {
        await expect(
          page.getByRole('link', { name: 'Browse Courses' }),
        ).toBeVisible();
      });
      test.info().annotations.push({
        type: 'phase6-prerequisite',
        description:
          'No accessible test-tenant course item was available for course-opening coverage. Assign one non-production course to the E2E student to complete Phase 6 opening assertions.',
      });
      expect(businessMutations).toEqual([]);
      await test.step('Post-state — Verify the final My Courses route', async () => {
        await expect(page).toHaveURL(
          new RegExp(`/c/${slug}/student/my-courses/?(\\?.*)?$`),
        );
      });
      return;
    }

    const accessibleCourse = await test.step(
      'Post-state — Verify course tabs and locate an accessible course',
      async () => {
        await expect(page.getByRole('tab', { name: /^Courses \d+/ })).toBeVisible({
          timeout: 30_000,
        });
        return findAccessibleCourse(page, studentBasePath);
      },
    );

    if (!accessibleCourse) {
      test.info().annotations.push({
        type: 'phase6-prerequisite',
        description:
          'No accessible test-tenant course item was available for course-opening coverage. Assign one non-production course to the E2E student to complete Phase 6 opening assertions.',
      });
      expect(businessMutations).toEqual([]);
      await test.step('Post-state — Verify the final My Courses route', async () => {
        await expect(page).toHaveURL(
          new RegExp(`/c/${slug}/student/my-courses/?(\\?.*)?$`),
        );
      });
      return;
    }

    const { title, href, link } = accessibleCourse;

    await test.step('Pre-state — Verify the assigned course action', async () => {
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', href);
      await expect(page.getByText('Access Denied')).toHaveCount(0);
    });

    await test.step('Action — Open the assigned course without starting playback', async () => {
      await link.click();
    });

    const expectedPath = href.split('?')[0];
    await test.step('Post-state — Verify the assigned course route', async () => {
      await expect(page).toHaveURL(
        href.includes('/student/learn/')
          ? learnRoute
          : youtubeCourseRoute,
        { timeout: 30_000 },
      );
      await expect(page).toHaveURL(tenantStudentUrl);
      await expect(page).not.toHaveURL(/\/login/);
      expect(page.url()).toContain(expectedPath);
    });

    await test.step('Post-state — Verify restricted and error UI is absent', async () => {
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toHaveCount(0);
      await expect(page.getByText('Access Denied')).toHaveCount(0);
      await expect(page.getByText('Course not found', { exact: false })).toHaveCount(0);
      await expect(page.getByText('Lesson unavailable')).toHaveCount(0);
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
      await expect(page.getByText(/direct-learners/i)).toHaveCount(0);
    });

    await test.step('Post-state — Verify the read-only course shell renders', async () => {
      if (href.includes('/student/learn/')) {
        await expect(
          page.getByRole('heading', { name: 'Course content' }),
        ).toBeVisible({ timeout: 30_000 });
        await expect(page.getByLabel('Search in playlist')).toBeVisible();
        await expect(page.getByText(title, { exact: true })).toBeVisible();
      } else {
        await expect(page.getByText(title, { exact: true })).toBeVisible({
          timeout: 30_000,
        });
      }
    });

    await test.step('Post-state — Verify no business mutation occurred', async () => {
      expect(
        businessMutations,
        `Unexpected business-data mutations: ${businessMutations.join(', ')}`,
      ).toEqual([]);
    });

    await test.step('Post-state — Verify the final assigned course route', async () => {
      await expect(page).toHaveURL(
        href.includes('/student/learn/')
          ? learnRoute
          : youtubeCourseRoute,
      );
    });
  });
});

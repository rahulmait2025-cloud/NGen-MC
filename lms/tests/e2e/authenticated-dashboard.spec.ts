import { test, expect } from '@playwright/test';
import { getAuthenticatedTenant } from './helpers/authenticated-tenant';

test.describe('Authenticated test-tenant student dashboard', () => {
  test('loads the dashboard using saved session state', async ({ page }) => {
    const { slug, dashboardPath, myCoursesPath } = getAuthenticatedTenant();

    await test.step('Pre-state — Open the test-tenant dashboard with saved authentication', async () => {
      await page.goto(dashboardPath);
    });

    await test.step('Post-state — Verify the test-tenant dashboard route', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/dashboard/?(\\?.*)?$`),
        { timeout: 30_000 },
      );
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step('Post-state — Verify dashboard UI renders', async () => {
      await expect(page.getByRole('heading', { name: 'My Courses' })).toBeVisible({
        timeout: 30_000,
      });
      const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
      await expect(dashboardLink).toBeVisible();
      await expect(dashboardLink).toHaveAttribute(
        'href',
        dashboardPath,
      );
      const myCoursesLink = page.getByRole('link', { name: 'My Courses' });
      await expect(myCoursesLink).toBeVisible();
      await expect(myCoursesLink).toHaveAttribute('href', myCoursesPath);
    });

    await test.step('Post-state — Verify login and crash UI is absent', async () => {
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toHaveCount(0);
      await expect(page.getByLabel('Email')).toHaveCount(0);
      await expect(page.getByText('Invalid email or password.')).toHaveCount(0);
      await expect(
        page.getByText('You do not have student access to this college.'),
      ).toHaveCount(0);
      await expect(
        page.getByText(
          'This institution is not found. Check the URL or contact your admin.',
        ),
      ).toHaveCount(0);
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    await test.step('Post-state — Verify the final dashboard route', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/dashboard/?(\\?.*)?$`),
      );
    });
  });
});

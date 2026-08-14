import { test, expect } from '@playwright/test';
import { getAuthenticatedTenant } from './helpers/authenticated-tenant';

// Confirmed B2C tenant fixture in README and public-catalog test helpers.
const FOREIGN_SLUG = 'direct-learners';
const FOREIGN_DASHBOARD_ROUTE = `/c/${FOREIGN_SLUG}/student/dashboard`;

test.describe('Authenticated test-tenant isolation', () => {
  test('keeps the valid dashboard accessible and blocks direct-learners dashboard', async ({
    page,
  }) => {
    const { slug, dashboardPath } = getAuthenticatedTenant();

    await test.step('Pre-state — Open and verify the valid tenant dashboard', async () => {
      await page.goto(dashboardPath);

      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/dashboard/?(\\?.*)?$`),
        { timeout: 30_000 },
      );
      await expect(page.getByRole('heading', { name: 'My Courses' })).toBeVisible({
        timeout: 30_000,
      });
      const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
      await expect(dashboardLink).toBeVisible();
      await expect(dashboardLink).toHaveAttribute('href', dashboardPath);
    });

    await test.step('Pre-state — Verify the valid tenant is authenticated without crash UI', async () => {
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toHaveCount(0);
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    await test.step('Action — Request the foreign tenant dashboard', async () => {
      await page.goto(FOREIGN_DASHBOARD_ROUTE);
    });

    await test.step('Post-state — Verify safe denied route and login UI', async () => {
      await expect(page).toHaveURL(/\/login\/?(\?.*)?$/, { timeout: 30_000 });
      await expect(page).not.toHaveURL(
        new RegExp(`/c/${FOREIGN_SLUG}/student/dashboard`),
      );
      await expect(page.getByText('Welcome Future CTO')).toBeVisible();
    });

    await test.step('Post-state — Verify foreign and crash content is absent', async () => {
      await expect(page.getByRole('heading', { name: 'My Courses' })).toHaveCount(
        0,
      );
      await expect(page.getByText('Access Denied')).toHaveCount(0);
      await expect(page.getByText('Invalid email or password.')).toHaveCount(0);
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    await test.step('Action — Return to the valid tenant dashboard', async () => {
      await page.goto(dashboardPath);
    });

    await test.step('Post-state — Verify the original tenant session remains usable', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/dashboard/?(\\?.*)?$`),
        { timeout: 30_000 },
      );
      await expect(page.getByRole('heading', { name: 'My Courses' })).toBeVisible({
        timeout: 30_000,
      });
    });
  });
});

import { test, expect } from '@playwright/test';

const COLLEGE_SLUG = 'direct-learners';
const PROTECTED_ROUTE = `/c/${COLLEGE_SLUG}/student/dashboard`;

test.describe('Unauthenticated protected route access', () => {
  test('redirects to global login when visiting the dashboard without a session', async ({
    page,
  }) => {
    await test.step('Pre-state — Start without authentication', async () => {
      await page.context().clearCookies();
    });

    await test.step('Action — Request the protected dashboard', async () => {
      await page.goto(PROTECTED_ROUTE);
    });

    await test.step('Post-state — Verify the global login route and controls', async () => {
      await expect(page).toHaveURL(/\/login\/?(\?.*)?$/);
      await expect(page.getByText('Welcome Future CTO')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toBeVisible();
    });

    await test.step('Post-state — Verify protected and crash UI is absent', async () => {
      await expect(page.getByRole('heading', { name: 'My Courses' })).toHaveCount(
        0,
      );
      await expect(page.getByText('Continue learning')).toHaveCount(0);
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    await test.step('Post-state — Verify the final global login route', async () => {
      await expect(page).toHaveURL(/\/login\/?(\?.*)?$/);
    });
  });
});

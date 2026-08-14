import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('loads the login page without crashing', async ({ page }) => {
    await test.step('Pre-state — Open the public login page', async () => {
      await page.goto('/login');
    });

    await test.step('Post-state — Verify the global login route', async () => {
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step('Post-state — Verify login controls render', async () => {
      await expect(page.getByText('Welcome Future CTO')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
    });

    await test.step('Post-state — Verify crash UI is absent', async () => {
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    await test.step('Post-state — Verify the final login route', async () => {
      await expect(page).toHaveURL(/\/login$/);
    });
  });
});

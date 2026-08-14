import { test, expect } from '@playwright/test';
import { getAuthenticatedTenant } from './helpers/authenticated-tenant';

test.describe('Authenticated test-tenant student login', () => {
  test('signs in with email and password and reaches the authenticated student area', async ({
    page,
  }) => {
    const { slug, studentBasePath, loginPath, dashboardPath, myCoursesPath } =
      getAuthenticatedTenant();
    const studentEmail = process.env.E2E_STUDENT_EMAIL;
    const studentPassword = process.env.E2E_STUDENT_PASSWORD;

    if (!studentEmail) {
      throw new Error(
        'E2E_STUDENT_EMAIL is required for the authenticated login test.',
      );
    }

    if (!studentPassword) {
      throw new Error(
        'E2E_STUDENT_PASSWORD is required for the authenticated login test.',
      );
    }

    await test.step('Pre-state — Open the test-tenant student login', async () => {
      await page.goto(loginPath);
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/login/?(\\?.*)?$`),
      );
    });

    await test.step('Pre-state — Verify login controls', async () => {
      await expect(page.getByText('Welcome Future CTO')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Forgot password?' }),
      ).toHaveAttribute('href', `${studentBasePath}/forgot-password`);
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toBeVisible();
    });

    let loginStatus = 0;
    await test.step('Action — Submit valid student credentials', async () => {
      await page.getByLabel('Email').fill(studentEmail);
      await page.getByLabel('Password').fill(studentPassword);

      const passwordLoginResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/auth/password-login') &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      loginStatus = (await passwordLoginResponse).status();
    });

    await test.step('Post-state — Verify authenticated route', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/?(\\?.*)?$`),
        { timeout: 30_000 },
      );
    });

    await test.step('Post-state — Verify authenticated navigation renders', async () => {
      const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
      await expect(dashboardLink).toBeVisible({ timeout: 30_000 });
      await expect(dashboardLink).toHaveAttribute(
        'href',
        dashboardPath,
      );
      const myCoursesLink = page.getByRole('link', { name: 'My Courses' });
      await expect(myCoursesLink).toBeVisible();
      await expect(myCoursesLink).toHaveAttribute('href', myCoursesPath);
    });

    await test.step('Post-state — Verify Sign In and error UI disappears', async () => {
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toHaveCount(0);
      await expect(page.getByLabel('Email')).toHaveCount(0);
      await expect(page.getByText('Invalid email or password.')).toHaveCount(0);
      await expect(
        page.getByText('You do not have student access to this college.'),
      ).toHaveCount(0);
      await expect(
        page.getByText('This institution is not found. Check the URL or contact your admin.'),
      ).toHaveCount(0);
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    await test.step('Diagnostics — Verify the supporting login response succeeded', async () => {
      expect(loginStatus, 'password-login response status').toBeGreaterThanOrEqual(200);
      expect(loginStatus, 'password-login response status').toBeLessThan(300);
    });

    await test.step('Post-state — Verify the final authenticated route', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/?(\\?.*)?$`),
      );
    });
  });
});

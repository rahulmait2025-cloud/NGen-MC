import path from 'node:path';
import { test as setup, expect } from '@playwright/test';
import { getAuthenticatedTenant } from './helpers/authenticated-tenant';

const AUTH_FILE = path.join(__dirname, '../../playwright/.auth/nextgen-student.json');

setup('authenticate test-tenant student', async ({ page }) => {
  const { slug, studentBasePath, loginPath, dashboardPath, myCoursesPath } =
    getAuthenticatedTenant();
  const studentEmail = process.env.E2E_STUDENT_EMAIL;
  const studentPassword = process.env.E2E_STUDENT_PASSWORD;

  if (!studentEmail) {
    throw new Error(
      'E2E_STUDENT_EMAIL is required for the student authentication setup.',
    );
  }

  if (!studentPassword) {
    throw new Error(
      'E2E_STUDENT_PASSWORD is required for the student authentication setup.',
    );
  }

  await setup.step('Pre-state — Open the test-tenant student login', async () => {
    await page.goto(loginPath);
    await expect(page).toHaveURL(
      new RegExp(`/c/${slug}/student/login/?(\\?.*)?$`),
    );
  });

  await setup.step('Pre-state — Verify login controls', async () => {
    await expect(page.getByText('Welcome Future CTO')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Forgot password?' }),
    ).toHaveAttribute('href', `${studentBasePath}/forgot-password`);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  let loginStatus = 0;
  await setup.step('Action — Authenticate the test-tenant E2E student', async () => {
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

  await setup.step('Post-state — Verify authenticated route and navigation', async () => {
    await expect(page).toHaveURL(
      new RegExp(`/c/${slug}/student/?(\\?.*)?$`),
      { timeout: 30_000 },
    );
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('href', dashboardPath);
    const myCoursesLink = page.getByRole('link', { name: 'My Courses' });
    await expect(myCoursesLink).toBeVisible();
    await expect(myCoursesLink).toHaveAttribute('href', myCoursesPath);
  });

  await setup.step('Post-state — Verify login UI is absent', async () => {
    await expect(
      page.getByRole('button', { name: 'Sign In', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel('Email')).toHaveCount(0);
    await expect(
      page.getByText('You do not have student access to this college.'),
    ).toHaveCount(0);
  });

  await setup.step('Diagnostics — Verify login response and save auth state', async () => {
    expect(loginStatus, 'password-login response status').toBeGreaterThanOrEqual(200);
    expect(loginStatus, 'password-login response status').toBeLessThan(300);
    await page.context().storageState({ path: AUTH_FILE });
  });
});

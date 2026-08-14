import { test, expect } from '@playwright/test';
import { getAuthenticatedTenant } from './helpers/authenticated-tenant';

const EXPECTED_FIRST_NAME = 'Rahul';
const EXPECTED_AVATAR_INITIALS = 'RK';

function classifyLoginStatus(status: number): string {
  if (status >= 200 && status < 300) {
    return 'login-api-success';
  }
  if (status === 401) {
    return 'credential-fixture-problem';
  }
  if (status === 403) {
    return 'tenant-membership-fixture-problem';
  }
  if (status === 429) {
    return 'rate-limit-or-environment-problem';
  }
  if (status >= 500 && status <= 599) {
    return 'possible-application-or-backend-problem';
  }
  return `unexpected-login-status-${status}`;
}

test.describe('Explore-page authentication header state', () => {
  test('transitions the Explore header from Sign In to the Rahul student profile', async ({
    page,
  }) => {
    const { slug, studentBasePath } = getAuthenticatedTenant();
    const exploreRoute = studentBasePath;
    const studentEmail = process.env.E2E_STUDENT_EMAIL;
    const studentPassword = process.env.E2E_STUDENT_PASSWORD;

    if (!studentEmail) {
      throw new Error(
        'E2E_STUDENT_EMAIL is required for the Explore auth header state test.',
      );
    }

    if (!studentPassword) {
      throw new Error(
        'E2E_STUDENT_PASSWORD is required for the Explore auth header state test.',
      );
    }

    const header = page.locator('header');
    const headerSignInLink = header.getByRole('link', {
      name: 'Sign In',
      exact: true,
    });

    await test.step('Pre-state — Open Explore as an anonymous user', async () => {
      await page.context().clearCookies();
      await page.goto(exploreRoute);

      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/?(\\?.*)?$`),
        { timeout: 30_000 },
      );
      await expect(
        header.getByRole('link', { name: 'Explore', exact: true }),
      ).toBeVisible();
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    await test.step('Pre-state — Verify Sign In is visible', async () => {
      await expect(headerSignInLink).toBeVisible();
      await expect(headerSignInLink).toHaveAttribute('href', '/login');
    });

    await test.step('Pre-state — Verify authenticated profile is absent', async () => {
      await expect(
        header.getByText(EXPECTED_FIRST_NAME, { exact: true }),
      ).toHaveCount(0);
      await expect(
        header.getByText(EXPECTED_AVATAR_INITIALS, { exact: true }),
      ).toHaveCount(0);
      await expect(
        header.getByRole('button').filter({ hasText: EXPECTED_FIRST_NAME }),
      ).toHaveCount(0);
      await expect(page.getByText('Application error')).toHaveCount(0);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    await test.step('Action — Open the student login form', async () => {
      await headerSignInLink.click();

      await expect(page).toHaveURL(/\/login\/?(\?.*)?$/, { timeout: 30_000 });
      await expect(page.getByText('Welcome Future CTO')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toBeVisible();
    });

    let loginStatus = 0;
    await test.step('Action — Submit valid NextGen student credentials', async () => {
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

    await test.step('Post-state — Verify Sign In disappears', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/?(\\?.*)?$`),
        { timeout: 30_000 },
      );

      const loginClassification = classifyLoginStatus(loginStatus);
      test.info().annotations.push({
        type: 'login-api-diagnostic',
        description: `password-login status=${loginStatus}; classification=${loginClassification}`,
      });

      const signInStillVisible = await headerSignInLink
        .isVisible()
        .catch(() => false);
      if (loginStatus >= 200 && loginStatus < 300 && signInStillVisible) {
        test.info().annotations.push({
          type: 'possible-ui-session-state-bug',
          description:
            'Login API succeeded but the Explore header still shows Sign In. Possible UI session-state rendering bug.',
        });
      }

      await expect(headerSignInLink).toHaveCount(0, { timeout: 30_000 });
    });

    await test.step('Post-state — Verify Rahul profile renders', async () => {
      const profileControl = header
        .getByRole('button')
        .filter({ hasText: EXPECTED_FIRST_NAME });

      await expect(profileControl).toBeVisible({ timeout: 30_000 });
      await expect(profileControl).toBeEnabled();
      await expect(
        profileControl.getByText(EXPECTED_FIRST_NAME, { exact: true }),
      ).toBeVisible();
    });

    await test.step('Post-state — Verify RK avatar renders', async () => {
      const profileControl = header
        .getByRole('button')
        .filter({ hasText: EXPECTED_FIRST_NAME });

      await expect(
        profileControl.getByText(EXPECTED_AVATAR_INITIALS, { exact: true }),
      ).toBeVisible();
    });

    await test.step('Post-state — Verify authenticated route and safe UI', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/${slug}/student/?(\\?.*)?$`),
      );
      await expect(page.getByLabel('Email')).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Sign In', exact: true }),
      ).toHaveCount(0);
      await expect(page.getByText('Welcome Future CTO')).toHaveCount(0);
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
  });
});

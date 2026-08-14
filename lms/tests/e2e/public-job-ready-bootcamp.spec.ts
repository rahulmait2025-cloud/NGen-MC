import { test, expect } from '@playwright/test';
import {
  PUBLIC_JOB_READY_BOOTCAMP_PATH,
  attachPublicCatalogMonitors,
  gotoPublicCatalog,
  assertNotAuthOrDashboard,
  assertNoCrashCopy,
} from './helpers/public-catalog';

/**
 * Phase 7 — Job Ready Bootcamp public landing regression.
 *
 * Route (source): `/c/[collegeSlug]/student/bootcamp`
 * (`lib/student/bootcamp-routes.ts` → `buildBootcampLandingHref`)
 * Tenant: `direct-learners`
 * Direct navigation only — does not click Enroll / payment CTAs.
 */
test.describe('Public Job Ready Bootcamp landing', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('loads Job Ready Bootcamp publicly without login or enrollment mutations', async ({
    page,
  }) => {
    const { evidence, assertNoUnexpectedMutations } = attachPublicCatalogMonitors(page);

    const response = await test.step('Pre-state — Open the public Job Ready Bootcamp', async () =>
      gotoPublicCatalog(page, PUBLIC_JOB_READY_BOOTCAMP_PATH, evidence),
    );

    expect(response, 'main document response missing').not.toBeNull();
    expect(response!.ok(), `document status ${evidence.documentStatus}`).toBeTruthy();

    await test.step('Post-state — Verify the public bootcamp route', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/direct-learners/student/bootcamp/?$`),
      );
      await assertNotAuthOrDashboard(page);
    });

    await test.step('Post-state — Verify the bootcamp hero and enrollment CTA', async () => {
      await expect(
        page.getByRole('heading', {
          name: /Build Skills\. Ship Projects\. Become[\s\S]*Job Ready\./i,
        }),
      ).toBeVisible();

      const enrollCta = page.getByRole('button', { name: /Enroll Now|Enroll In Bootcamp/i });
      const enrollLink = page.getByRole('link', { name: /Enroll Now|Enroll In Bootcamp/i });
      const enrollCount = (await enrollCta.count()) + (await enrollLink.count());
      expect(enrollCount).toBeGreaterThan(0);
    });

    await test.step('Post-state — Verify protected UI and business mutations are absent', async () => {
      await assertNoCrashCopy(page);
      assertNoUnexpectedMutations();
      await expect(page.getByText('Welcome Future CTO')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'My Courses' })).toHaveCount(0);
    });

    await test.step('Post-state — Verify the bootcamp route remains unchanged', async () => {
      await expect(page).toHaveURL(/\/bootcamp\/?$/);
    });
  });
});

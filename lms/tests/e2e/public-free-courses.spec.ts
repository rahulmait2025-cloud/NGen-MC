import { test, expect } from '@playwright/test';
import {
  PUBLIC_FREE_COURSES_PATH,
  attachPublicCatalogMonitors,
  gotoPublicCatalog,
  assertNotAuthOrDashboard,
  assertNoCrashCopy,
} from './helpers/public-catalog';

/**
 * Phase 7 — Free Courses public catalog regression.
 *
 * Route (source): `/c/[collegeSlug]/student/free-courses`
 * Tenant: `direct-learners` (existing public E2E + README B2C slug).
 * Fixture: no stable published free-course title is documented for E2E;
 * asserts catalog shell + cards OR legitimate empty state.
 *
 * Public access is explicitly allowed by `lib/auth/public-student-routes.ts`.
 * A redirect to login remains a product regression.
 */
test.describe('Public Free Courses catalog', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('loads Free Courses publicly without login or enrollment mutations', async ({
    page,
  }, testInfo) => {
    testInfo.annotations.push({
      type: 'coverage-limitation',
      description:
        'No stable Stage free-course fixture title is documented; asserts shell + cards or empty state only.',
    });

    const { evidence, assertNoUnexpectedMutations } = attachPublicCatalogMonitors(page);

    const response = await test.step('Pre-state — Open the public Free Courses catalog', async () =>
      gotoPublicCatalog(page, PUBLIC_FREE_COURSES_PATH, evidence),
    );

    expect(response, 'main document response missing').not.toBeNull();
    expect(response!.ok(), `document status ${evidence.documentStatus}`).toBeTruthy();

    await test.step('Post-state — Verify the public catalog route', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/direct-learners/student/free-courses/?$`),
      );
      await assertNotAuthOrDashboard(page);
    });

    await test.step('Post-state — Verify the Free Courses hero and catalog shell', async () => {
      await expect(
        page.getByRole('heading', {
          name: /Start Learning With CTO Bhaiya.?s[\s\S]*Free Courses/i,
        }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Browse Catalog' })).toBeVisible();
    });

    await test.step('Post-state — Verify course cards or the approved empty state', async () => {
      const emptyState = page.getByRole('heading', { name: 'No courses available' });
      const catalogRegion = page.locator('#free-course-catalog');
      const emptyVisible = await emptyState.isVisible().catch(() => false);
      if (emptyVisible) {
        await expect(page.getByText('Please check back later for new free courses.')).toBeVisible();
      } else {
        await expect(catalogRegion).toBeVisible();
        const cardSignals = catalogRegion.getByRole('link').or(catalogRegion.getByRole('button'));
        await expect(cardSignals.first()).toBeVisible();
      }
    });

    await test.step('Post-state — Verify protected and crash UI is absent', async () => {
      await assertNoCrashCopy(page);
      assertNoUnexpectedMutations();
      await expect(page.getByText('Welcome Future CTO')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'My Courses' })).toHaveCount(0);
    });

    await test.step('Post-state — Verify the catalog route remains unchanged', async () => {
      await expect(page).toHaveURL(/\/free-courses\/?$/);
    });
  });
});

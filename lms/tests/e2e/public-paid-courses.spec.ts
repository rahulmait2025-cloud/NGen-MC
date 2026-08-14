import { test, expect } from '@playwright/test';
import {
  PUBLIC_PAID_COURSES_PATH,
  attachPublicCatalogMonitors,
  gotoPublicCatalog,
  assertNotAuthOrDashboard,
  assertNoCrashCopy,
} from './helpers/public-catalog';

/**
 * Phase 7 — Paid Courses public catalog regression.
 *
 * Route (source): `/c/[collegeSlug]/student/paid-courses`
 * Tenant: `direct-learners`
 * Fixture: no stable published paid-course title is documented for E2E;
 * asserts catalog shell + cards OR legitimate empty state.
 * Does not open checkout or create Razorpay orders.
 */
test.describe('Public Paid Courses catalog', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('loads Paid Courses publicly without login or checkout mutations', async ({
    page,
  }, testInfo) => {
    testInfo.annotations.push({
      type: 'coverage-limitation',
      description:
        'No stable Stage paid-course fixture title is documented; asserts shell + cards or empty state only — not named-course listing coverage.',
    });

    const { evidence, assertNoUnexpectedMutations } = attachPublicCatalogMonitors(page);

    const response = await test.step('Pre-state — Open the public Paid Courses catalog', async () =>
      gotoPublicCatalog(page, PUBLIC_PAID_COURSES_PATH, evidence),
    );

    expect(response, 'main document response missing').not.toBeNull();
    expect(response!.ok(), `document status ${evidence.documentStatus}`).toBeTruthy();

    await test.step('Post-state — Verify the public catalog route', async () => {
      await expect(page).toHaveURL(
        new RegExp(`/c/direct-learners/student/paid-courses/?$`),
      );
      await assertNotAuthOrDashboard(page);
    });

    await test.step('Post-state — Verify the Paid Courses hero and catalog shell', async () => {
      await expect(
        page.getByRole('heading', {
          name: /Stop Watching Random Tutorials\.[\s\S]*Start Building With Structure\./i,
        }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Explore Courses' })).toBeVisible();
    });

    await test.step('Post-state — Verify a real course CTA or the approved empty state', async () => {
      const emptyState = page.getByRole('heading', { name: 'No courses found' });
      const emptyVisible = await emptyState.isVisible().catch(() => false);
      if (emptyVisible) {
        await expect(
          page.getByText(
            'Premium courses will appear here once they are published for your college.',
          ),
        ).toBeVisible();
      } else {
        await expect(
          page.getByRole('heading', { name: 'Explore Premium Courses' }),
        ).toBeVisible();
        const courseGrid = page.locator('#course-grid');
        await expect(courseGrid).toBeVisible();
        const courseAction = courseGrid.getByRole('link', {
          name: /Details|Enroll Now|Start Learning|View Course/i,
        });
        await expect(courseAction.first()).toBeVisible();
      }
    });

    await test.step('Post-state — Verify protected and crash UI is absent', async () => {
      await assertNoCrashCopy(page);
      assertNoUnexpectedMutations();
      await expect(page.getByText('Welcome Future CTO')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'My Courses' })).toHaveCount(0);
    });

    await test.step('Post-state — Verify the catalog route remains unchanged', async () => {
      await expect(page).toHaveURL(/\/paid-courses\/?$/);
    });
  });
});

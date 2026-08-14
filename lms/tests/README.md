/**
 * Vitest + React Testing Library — Student LMS UI layer
 *
 * Verifies **rendered React UI states** (visible elements, positive and
 * negative assertions). Not a replacement for Playwright browser E2E.
 *
 * | Layer | Location | Responsibility |
 * |-------|----------|----------------|
 * | Vitest UI / integration | `tests/integration/**`, `tests/unit/**\/*.test.tsx` | Component state, visible DOM, user events in jsdom |
 * | Playwright E2E | `tests/e2e/**`, `playwright.config.ts` | Real browser, cookies, navigation |
 *
 * Do not import `@playwright/test` into Vitest files; the Vitest config
 * excludes `tests/e2e/**`.
 *
 * ## Quick commands
 *
 * ```bash
 * npm install              # also installs the Husky pre-push hook via prepare
 * npm run test:ui:check    # verify Vitest deps, config, and Git hook
 * npm run test:ui:run      # run the complete UI suite once
 * npm run test:ui          # interactive / watch
 * npm run test:ui:watch    # continuous watch mode
 * ```
 *
 * ## Pre-push gate
 *
 * `git push` runs `.husky/pre-push` → `npm run test:ui:run`.
 * A failing suite blocks the push. Full teammate setup guide:
 * [docs/VITEST_UI_TESTING_SETUP.md](../docs/VITEST_UI_TESTING_SETUP.md)
 */

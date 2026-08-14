# Vitest UI Testing Setup — Student LMS

Professional guide for engineering teammates and the CTO. This document describes the local Vitest + React Testing Library UI suite for the Student LMS (`lms/`), how to install it, how the Git pre-push gate works, and how to extend the suite safely.

Configuration in this repository is the source of truth. Prefer the scripts and paths named here over generic Vitest tutorials.

---

## 1. Overview

The Vitest UI suite verifies **rendered React UI states** in jsdom:

1. Arrange a **pre-state** UI (anonymous vs authenticated, Explore vs Courses, Dashboard vs destination).
2. Perform a **real user action** (`userEvent`) or a **controlled provider state change**.
3. Assert the **post-state** UI with positive matchers (`getByRole`, `getByText`, …).
4. Assert that obsolete pre-state UI is **absent** (`queryByRole` / `queryByText` → not in the document).

**Why React Testing Library?** It encourages querying the DOM the way users and assistive tech do (roles, labels, text), not implementation details such as CSS class names.

**What the environment is:**

- Vitest + jsdom (no real browser)
- Controlled auth/tenant providers (`tests/utils/render-ui.tsx`) and lightweight Next.js navigation mocks where needed
- No real Supabase, no production APIs, no cookies, no deployed Stage/Production services

Playwright under `tests/e2e/**` remains the browser E2E suite and is **excluded** from Vitest (`vitest.config.ts`).

---

## 2. Testing scope

### Covered

| Area | What is asserted |
|------|------------------|
| Explore header auth | Anonymous “Sign In” vs authenticated profile control |
| Landing heroes | Explore ↔ Courses navbar-driven hero transitions |
| Dashboard sidebar | Sheets, Notes, Mentorship, Applications, Jobs, Analytics, Code Pulse, Payment History destinations |
| Visibility rules | Curated bundles / Job Ready Bootcamp card gated by existing feature flags (UI only) |
| Interactions | Clicks and controlled rerenders; visible elements appearing and disappearing |

### Not covered

- Real Supabase login, sessions, or cookies
- Middleware / proxy behavior
- Deployed Stage or Production behavior
- Browser E2E (Playwright)
- Payment checkout flows
- TPStreams video playback
- Database or RLS enforcement
- Application bug fixes (report separately; do not weaken tests to hide regressions)

---

## 3. Prerequisites

| Tool | Notes |
|------|--------|
| **Node.js** | No `.nvmrc`, `.node-version`, or `package.json` `engines` field is declared in this repo. Local development and verification use **Node.js v22** (Current LTS line also works for installs; use a modern Node 18+ if needed). |
| **npm** | Ships with Node. Verified with npm 10.x. |
| **Git** | Required for clone and for the repository-managed Husky hooks. |

You do **not** need:

- LMS server running
- Supabase credentials
- Browser binaries for Vitest UI tests
- A global Vitest install

---

## 4. First-time setup

```bash
git clone <repository>
cd lms
npm install
npm run test:ui:check
npm run test:ui:run
```

When the lockfile is trusted and you want a clean, reproducible install:

```bash
git clone <repository>
cd lms
npm ci
npm run test:ui:check
npm run test:ui:run
```

`npm install` / `npm ci` runs the package `prepare` lifecycle (`husky`), which installs the repository-managed Git hooks automatically. Teammates should **not** need to copy files into `.git/hooks` or set global Git config.

---

## 5. Available commands

| Command | Purpose |
|---------|---------|
| `npm run test:ui` | Start Vitest (interactive / watch in a TTY) |
| `npm run test:ui:watch` | Start continuous UI testing (`vitest --watch`) |
| `npm run test:ui:run` | Run **all** UI tests once (pre-push gate command) |
| `npm run test:ui:check` | Verify local setup and Git pre-push hook |
| `npm run test:ui -- <filter>` | Run matching tests interactively when Vitest supports the filter |
| `npm run prepare` | Re-install Husky hooks (`core.hooksPath` → `.husky/_`) |

Discovery is defined only in `vitest.config.ts`. Do not list individual test files in the pre-push hook.

---

## 6. Automatic pre-push testing

Flow:

```text
Developer runs git push
  → local Husky pre-push hook starts (.husky/pre-push)
  → npm run test:ui:run executes
  → Vitest discovers every matching UI test via vitest.config.ts
  → pass (exit 0): push continues
  → fail (non-zero): push is blocked; Vitest output remains visible
```

| Item | Value |
|------|--------|
| Hook manager | **Husky** v9 (devDependency) |
| Hook file | `.husky/pre-push` |
| Hook body | `npm run test:ui:run` |
| Lifecycle | `"prepare": "husky"` in `package.json` |
| Suite command | `vitest run` (one-shot; never watch) |
| Discovery | `vitest.config.ts` include/exclude |

**Failed tests block the push.** Do not weaken assertions only to get a green push. Fix the test setup or the UI regression, then push again.

Git allows emergency bypasses (for example `--no-verify`). Bypassing is **not** the normal workflow and should require a documented team/CTO-approved reason. Local hooks are a developer safeguard, not a replacement for future server-side CI.

This repository does **not** disable Git’s standard bypass mechanisms and does not change global Git configuration beyond the repo-local Husky `core.hooksPath` set by `prepare`.

---

## 7. Example successful push

Illustrative sanitized output (counts grow as the suite grows):

```text
 ✓ tests/integration/...test.tsx (N)
 …

 Test Files  N passed (N)
      Tests  M passed (M)

pre-push checks passed
```

Then Git continues the push to the remote.

---

## 8. Example failed push

```text
 ❯ tests/integration/example-ui-state.test.tsx (N)
   × changes from the pre-state to the post-state

 Test Files  1 failed | … passed
      Tests  1 failed | … passed

error: failed to push some refs
```

What to do:

1. Read the failed test name and assertion in the Vitest output.
2. Reproduce locally: `npm run test:ui:run` or `npm run test:ui -- <filter>`.
3. Fix the test setup, fixture, or genuine UI regression (application fixes are a separate change).
4. Re-run `npm run test:ui:run` until green.
5. `git push` again — the hook re-runs the full suite.

---

## 9. Test architecture

| Path | Role |
|------|------|
| `vitest.config.ts` | jsdom environment, `@/` alias, `server-only` stub, include/exclude |
| `tests/setup/vitest.setup.ts` | jest-dom matchers, RTL cleanup, matchMedia / observer stubs |
| `tests/utils/render-ui.tsx` | Controlled auth/tenant providers for UI tests |
| `tests/utils/mock-next-navigation.ts` | In-memory pathname / searchParams for client navigation |
| `tests/utils/mock-next-link.tsx` | Link click → pathname store |
| `tests/integration/**/*.test.tsx` | UI state / navigation integration tests |
| `tests/unit/**/*.test.tsx` | Unit-level UI tests (`.tsx` only in Vitest include) |
| `tests/e2e/**` | Playwright — **excluded** from Vitest |
| `.husky/pre-push` | Runs `npm run test:ui:run` before every push |
| `scripts/check-vitest-ui-setup.mjs` | Setup verification (`npm run test:ui:check`) |

### Include / exclude (current)

```ts
include: [
  'tests/unit/**/*.test.tsx',
  'tests/integration/**/*.test.{ts,tsx}',
],
exclude: [
  'tests/e2e/**',
  'node_modules/**',
  '.next/**',
  'playwright-report/**',
  'test-results/**',
],
```

Legacy `tests/unit/**/*.test.ts` files that use Node’s test runner stay outside this include pattern and are **not** executed by the Vitest pre-push gate.

### Query preference

Prefer, in order:

1. `getByRole`
2. `getByLabelText`
3. `getByPlaceholderText`
4. `getByText`

Use `queryByRole` / `queryByText` for negative assertions. Avoid CSS classes as the primary selector.

---

## 10. Adding a new UI test

Create a file under `tests/integration/` (or `tests/unit/` with a `.test.tsx` suffix). Matching files are picked up automatically by `vitest.config.ts` and therefore by pre-push — **no hook change required**.

```tsx
it('changes from the pre-state to the post-state', async () => {
  const user = userEvent.setup();

  // Arrange — render the real component in the pre-state

  // Assert — verify pre-state UI

  // Act — perform the real user interaction

  // Assert — verify post-state UI

  // Assert — verify obsolete pre-state UI is absent
});
```

Guidelines:

- Render the **real** component under test.
- Control external providers; do **not** mock the component under test.
- Do **not** connect to Supabase or the network.
- Assert **visible** behavior.
- Do not use CSS classes as the primary selector.

Future example that is included automatically:

```text
tests/integration/new-ui-state.test.tsx
```

---

## 11. Troubleshooting

### `vitest: command not found`

```bash
npm install
```

Vitest must resolve from `node_modules/.bin` via npm scripts — never require a global install.

### Git hook does not run

```bash
npm run test:ui:check
npm run prepare
```

Confirm `.husky/pre-push` exists and contains `npm run test:ui:run`. Confirm `git config --get core.hooksPath` reports `.husky/_` after `prepare`.

### Tests run in watch mode during push

The hook must call `npm run test:ui:run` (`vitest run`), **not** `npm run test:ui`.

### Playwright tests are discovered

Check `vitest.config.ts` `exclude` includes `tests/e2e/**`. Run `npm run test:ui:check`.

### jsdom API missing

Add test-only stubs in `tests/setup/vitest.setup.ts` (or a focused test file). Prefer plain functions over `vi.fn()` when Vitest `mockReset` would wipe implementations.

### Alias resolution failure (`@/...`)

`vitest.config.ts` maps `@` to the LMS root. Keep imports as `@/...` consistent with the Next app.

### Tests pass locally but the hook fails

1. Ensure dependencies are installed (`npm install` / `npm ci`).
2. Run the exact hook command: `npm run test:ui:run`.
3. Compare Node/npm versions with the team.
4. Run `npm run test:ui:check`.

### Hook was installed but later stopped working

From the LMS root:

```bash
npm run prepare
npm run test:ui:check
```

Prefer repository-local checks. Avoid changing **global** Git settings unless necessary.

---

## 12. Windows setup notes

- Run npm commands from the **LMS repository root** (`…/lms`).
- PowerShell and Command Prompt both work for npm scripts.
- No PowerShell-specific hook is required; Git for Windows executes the Husky POSIX hook environment.
- Do not hard-code machine paths such as `D:\NextGen\lms` into hooks or scripts.

---

## 13. macOS and Linux notes

- Install Node.js, npm, and Git.
- `cd lms && npm install`
- Verify with `npm run test:ui:check`
- Repository-managed hooks rely on executable hook files where the filesystem requires the executable bit; Husky’s `prepare` step configures `core.hooksPath` for the clone.

---

## 14. Failure classification

| Class | Meaning | Action |
|-------|---------|--------|
| **Test setup issue** | Missing deps, broken hook, bad config | Fix infrastructure / reinstall |
| **Test-code issue** | Wrong query, stale copy, bad fixture | Update the test |
| **Component testability issue** | UI hard to assert without implementation details | Improve test harness or query strategy |
| **Possible application UI bug** | Product UI no longer matches intended contract | Report / fix in a **separate** remediation change — do not silence the test |

---

## 15. Team workflow

```text
Pull latest changes
  → npm install when package.json / lockfile changed
  → npm run test:ui while developing
  → npm run test:ui:run before finishing
  → git commit
  → git push
  → pre-push automatically reruns the complete Vitest UI suite
```

Developers do not need to remember a manual suite run before every push; the hook enforces the one-shot gate. Running tests during development remains recommended for faster feedback.

---

## 16. Local hook versus CI

| | Local pre-push | Future GitHub CI |
|--|----------------|------------------|
| Where | Developer machine | Remote runners |
| Command | `npm run test:ui:run` | Same suite (recommended) |
| Speed | Fast feedback before code leaves the laptop | Independent verification |
| Limitations | Missing deps, local env drift, optional Git bypass | Should not rely on developers alone |

This task configures **local** Husky pre-push only. It does **not** claim that GitHub Actions CI for Vitest already exists unless a workflow is present in the repository.

---

## 17. Maintenance

- Update tests when **intentional** UI requirements change.
- Do **not** weaken tests to hide regressions.
- Keep fixtures deterministic; avoid real network calls.
- Keep Playwright files and LMS application behavior out of Vitest-infrastructure changes.
- Update this document when npm scripts or hook files change.
- New files matching Vitest include patterns are part of the pre-push gate automatically.

---

## Teammate quick start

```bash
npm install
npm run test:ui:check
npm run test:ui:run
```

Then day-to-day:

```bash
git push
```

From now on, `git push` automatically runs the complete Vitest UI suite locally. A failing suite blocks the push.

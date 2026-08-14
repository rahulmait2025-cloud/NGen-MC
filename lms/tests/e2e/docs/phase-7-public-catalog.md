# Phase 7 — Public Student Catalog Regression

## Routes confirmed (source)

| Page | Route | Evidence |
|------|-------|----------|
| Free Courses | `/c/[collegeSlug]/student/free-courses` | `lib/student/student-home-route.ts` `isStudentFreeCoursesLandingRoute`; `app/.../(authenticated)/free-courses/page.tsx` |
| Paid Courses | `/c/[collegeSlug]/student/paid-courses` | `isStudentPaidCoursesLandingRoute`; `app/.../(authenticated)/paid-courses/page.tsx` |
| Job Ready Bootcamp | `/c/[collegeSlug]/student/bootcamp` | `isStudentBootcampLandingRoute`; `lib/student/bootcamp-routes.ts` `buildBootcampLandingHref`; `app/.../(authenticated)/bootcamp/page.tsx` |

Public catalog tenant slug: **`direct-learners`** (same as `tests/e2e/unauthenticated-access.spec.ts`; README B2C slug). Authenticated E2E tests use the separate `E2E_TENANT_SLUG`, currently set to **`nextgen`** by the UI preparation script.

## Application finding (not fixed)

These landings live under `(authenticated)`, call `requireStudent`, and are **not** listed in `proxy.ts` `isPublicRoute`. Unauthenticated requests redirect to `/c/{slug}/student/login`.

Phase 7 product assertions require public browse without login. Redirect failures are **open application bugs** for the remediation phase.

## Coverage limitations

- No documented stable Stage free-course fixture title for E2E.
- No documented stable Stage paid-course fixture title for E2E.
- Tests assert page shell + cards **or** legitimate empty state only.

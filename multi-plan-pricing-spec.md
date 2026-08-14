# Multi-Plan Pricing Cards — Student LMS

Implement multi-plan pricing cards for all purchasable products:

1. Paid courses (Paid Course Builder)
2. Master courses / paid course variants
3. Bundles
4. Job Ready Bootcamp

## Context

- Student LMS: `nextgen-cto-lms-product`
- SuperAdmin: `nextgen-cto-lms-product-super-admin`
- Pricing managed in SuperAdmin Course Pricing section
- Max **3 pricing plans** per product; each plan has own validity
- 3 plans exist + SuperAdmin tries add another → block + message: “Only 3 pricing plans are allowed. Delete an existing plan to add a new one.”
- Reuse bottom CTA/pricing card area on student landing/detail pages (above footer) — replace single enroll button with plan cards
- Premium look: dark/orange NextGen CTO UI
- Do **not** break: Razorpay checkout, entitlement creation, payment success page, email confirmation, My Courses redirect

## Goal

Show 1–3 pricing plan cards on student landing/detail per paid product. Student picks plan → Razorpay checkout. On success, entitlement validity matches selected plan.

## UX rules

- Active access → no pricing cards; show “Continue Learning”
- Expired access → pricing cards + subtle “Your previous access has expired”
- 1 plan → one premium card
- 2–3 plans → side-by-side desktop, stacked mobile
- Highlight default/recommended plan
- Display per card:
  - Plan name
  - Price
  - Validity (e.g. “30 days access”, “90 days access”, “Lifetime access”)
  - Optional description
  - Optional badge (“Recommended”, “Best Value”)
  - CTA: “Enroll Now”, “Buy Now”, or “Continue with this plan”
- Coupon applies to **selected plan**, not global
- CTA text:
  - Bundles: “Enroll In Bundle Now”
  - Job Ready Bootcamp: “Enroll In Bootcamp”
  - Normal courses: “Enroll Now”

## SuperAdmin

Extend Course Pricing section — tabs/filters for:

- Master Courses
- Course Variants
- Bundles
- Job Ready Bootcamp

Max 3 **active** plans per product. Fields:

- `plan_name`
- `price_minor`
- `currency` (default INR)
- `validity_days` (nullable = lifetime)
- `is_default`
- `is_active`
- `sort_order`
- `description` (nullable)
- `badge_label` (nullable)

Rules:

- One default per product
- First plan for product → auto default
- Delete default → next active plan becomes default if any
- Block >3 active plans at server-action + DB level if possible

## Database/schema

Audit existing migrations/tables first. No duplicate tables.

May exist:

- `course_price_plans` — master courses
- `bundle_price_plans` — bundles

Reuse if present. Add variant/bootcamp tables only if missing.

**Option A** — separate tables:

- `course_price_plans`
- `variant_price_plans`
- `bundle_price_plans`
- `bootcamp_price_plans`

**Option B** — reuse existing generic commerce/product pricing if codebase has it.

No big new generic pricing system if risky refactor. Minimal integration with existing checkout + entitlement flow.

## Student LMS

Pages to wire:

- Paid course detail
- Master course detail/landing
- Course variant detail/landing (if exists)
- Bundle detail
- Job Ready Bootcamp landing

Shared component: `components/pricing/product-pricing-plans.tsx`

Props:

- `productType`: `"course" | "variant" | "bundle" | "bootcamp"`
- `productId`
- `plans`
- `selectedPlanId` (optional)
- `hasActiveAccess`
- `accessExpired`
- `checkoutAction` or `onCheckout`
- coupon support if already implemented

Component:

- Premium pricing cards
- Plan selection → pass `plan id` to checkout
- Loading while checkout starts
- Disable checkout if no active plan
- Empty state (admins/dev only) if no plans

## Checkout flow

Checkout server actions/API require `price_plan_id` for paid products. Validate:

- Plan belongs to product
- Plan active
- Product published/available
- Student has no active access
- Coupon valid for product/plan if coupons exist

- Razorpay amount from **server-side** plan — never client
- Store `price_plan_id` on order/payment if schema supports

Payment success → entitlement:

- `valid_from` = now
- `valid_until` = now + `validity_days` OR `null` for lifetime
- `source_type` = purchase type
- product/content ref = course/variant/bundle/bootcamp

Preserve success page:

- `/c/[collegeSlug]/student/payment-success`
- full-bleed success screen
- redirect My Courses after 5s

Send enrollment + payment confirmation emails on success.

## Bundle-specific

- One bundle entitlement — no fake per-course entitlements
- My Courses: bundle card → bundle learning page with included courses
- Player access via bundle entitlement

## Bootcamp-specific

- Same pricing-card UI
- Purchase enrolls in bootcamp
- Mentor session section: bootcamp-enrolled only
- Same payment success + emails as paid course

## UI

Replace single big CTA/enroll area with plan cards.

- Dark premium theme; no cheap gradient-heavy cards
- shadcn/ui where useful
- Orange accent `#FF5F36` / brand orange
- Cards: subtle border; soft orange glow on recommended/default only; responsive; strong typography; clean price format

Example:

- Title: “Choose Your Learning Plan”
- Subtitle: “Pick the access duration that fits your learning pace.”
- Cards: Monthly/30 Days, Quarterly/90 Days, Lifetime/Unlimited
- Mobile: stack vertically

## Edge cases

- Paid product, no plans → no checkout; “Pricing will be available soon”
- Free product → no pricing cards; free enrollment CTA
- Active entitlement → Continue Learning only
- Expired → pricing cards again
- Invalid coupon → inline error
- Valid coupon → discounted price on selected plan
- Razorpay fail → stay on page + error toast
- Duplicate payment verification → idempotent

## Testing checklist

1. SuperAdmin create 1/2/3 plans for course
2. SuperAdmin cannot create 4th active plan
3. Delete plan → can create another
4. Only one default plan
5. Student sees cards on paid course landing
6. Checkout amount = selected plan
7. Success → entitlement with correct validity
8. Redirect My Courses after success
9. Enrollment/payment emails sent
10. Bundle → bundle entitlement only
11. Bootcamp → bootcamp enrollment
12. Enrolled student → Continue Learning, no cards
13. Expired user → cards again
14. Free courses unaffected
15. B2B college-assigned access unaffected (no payment)

## Implementation order

1. Audit pricing tables/actions/components
2. Extend DB only where missing
3. SuperAdmin pricing manager + max 3 rule
4. Shared Student LMS pricing card component
5. Wire paid course detail page
6. Wire bundle detail page
7. Wire Job Ready Bootcamp page
8. Checkout actions: accept + validate `price_plan_id`
9. Entitlement validity logic
10. E2E test all flows
11. `typecheck`, `lint`, `build`

## Do not

- Hardcode prices in frontend
- Trust client price
- Fake course entitlements for bundle purchase
- Break My Courses logic
- Move payment-success inside My Courses
- Show pricing in mentor section
- >3 active plans per product

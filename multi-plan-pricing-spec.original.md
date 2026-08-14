We need to implement multi-plan pricing cards across the Student LMS for all purchasable learning products:

1. Paid courses created using Paid Course Builder
2. Master courses / course variants that are marked paid
3. Bundles
4. Job Ready Bootcamp

Context:
- Student LMS repo: nextgen-cto-lms-product
- SuperAdmin repo: nextgen-cto-lms-product-super-admin
- Pricing is managed from SuperAdmin Course Pricing section.
- A product can have at most 3 pricing plans.
- Each pricing plan has varied validity.
- If 3 plans already exist and SuperAdmin tries to create another, block creation and show a clear message: “Only 3 pricing plans are allowed. Delete an existing plan to add a new one.”
- Student landing/detail pages already have large CTA/pricing-style cards near the bottom, just above the footer. Reuse that area to show pricing options instead of a single cheap-looking enroll button.
- Pricing cards must look premium, consistent with the current dark/orange NextGen CTO UI.
- Do not break existing Razorpay checkout, entitlement creation, payment success page, email confirmation, or My Courses redirect flow.

Goal:
Show 1–3 pricing plan cards on the student-facing landing/detail page for each paid product. Student selects one plan and proceeds to Razorpay checkout. After successful payment, entitlement/access validity should be created based on the selected plan validity.

Important UX rules:
- If the student already has active access, do not show pricing cards. Show “Continue Learning”.
- If access expired, show pricing cards again with a subtle “Your previous access has expired” message.
- If only one plan exists, show one premium card.
- If 2 or 3 plans exist, show cards side by side on desktop and stacked on mobile.
- Highlight the default/recommended plan.
- Display:
  - Plan name
  - Price
  - Validity, for example “30 days access”, “90 days access”, “Lifetime access”
  - Optional short description
  - Optional badge like “Recommended”, “Best Value”
  - CTA: “Enroll Now”, “Buy Now”, or “Continue with this plan”
- Coupon input should apply to the selected plan, not globally.
- For bundles, CTA text should say “Enroll In Bundle Now”.
- For Job Ready Bootcamp, CTA text should say “Enroll In Bootcamp”.
- For normal courses, CTA text should say “Enroll Now”.

SuperAdmin requirements:
- Extend existing Course Pricing section so SuperAdmin can manage pricing plans for:
  - Master Courses
  - Course Variants
  - Bundles
  - Job Ready Bootcamp
- Use tabs or filters inside the Course Pricing section.
- For each product, allow up to 3 active pricing plans.
- Fields:
  - plan_name
  - price_minor
  - currency default INR
  - validity_days nullable for lifetime
  - is_default
  - is_active
  - sort_order
  - description nullable
  - badge_label nullable
- Only one default plan per product.
- If creating the first plan for a product, automatically make it default.
- If deleting the default plan, make the next active plan default if available.
- Prevent more than 3 active plans per product at both server-action level and database level if possible.

Database/schema:
First audit existing migrations/tables before creating anything new. Do not duplicate existing tables.

Known existing/planned tables may include:
- course_price_plans for master courses
- bundle_price_plans for bundles

If course_price_plans already exists, reuse it for master courses.
If bundle_price_plans already exists, reuse it for bundles.
If variants and bootcamp do not have pricing plan tables, add them cleanly.

Preferred options:
Option A: Separate tables:
- course_price_plans
- variant_price_plans
- bundle_price_plans
- bootcamp_price_plans

Option B: If the codebase already has a generic commerce/product pricing structure, reuse that instead.

Do not introduce a new generic pricing system if it causes large risky refactors. Prefer minimal integration with existing checkout and entitlement flow.

Student LMS implementation:
Find all relevant student detail/landing pages:
- Paid course detail page
- Master course detail/landing page
- Course variant detail/landing page if exists
- Bundle detail page
- Job Ready Bootcamp landing page

Add a shared component:

components/pricing/product-pricing-plans.tsx

Props:
- productType: "course" | "variant" | "bundle" | "bootcamp"
- productId
- plans
- selectedPlanId optional
- hasActiveAccess
- accessExpired
- checkoutAction or onCheckout
- coupon support if already implemented

The component should:
- Render premium pricing cards.
- Allow selecting a plan.
- Pass selected plan id to checkout.
- Show loading state while checkout starts.
- Disable checkout if no active plan exists.
- Show empty state for admins/dev only if no plans exist.

Checkout flow:
- Update checkout server actions/API so they require a selected price_plan_id for paid products.
- Validate:
  - plan belongs to product
  - plan is active
  - product is published/available
  - student does not already have active access
  - coupon applies to that product/plan if coupons exist
- Razorpay amount must come from server-side pricing plan, never from client.
- Store selected price_plan_id on order/payment record if order schema supports it.
- On payment success, create entitlement with:
  - valid_from = now
  - valid_until = now + validity_days
  - valid_until = null for lifetime
  - source_type matching product purchase type
  - product/content reference matching course/variant/bundle/bootcamp
- Preserve existing success page:
  - `/c/[collegeSlug]/student/payment-success`
  - full-bleed success screen
  - redirect to My Courses after 5 seconds
- Send enrollment and payment confirmation emails after successful payment.

Bundle-specific:
- Bundle purchase should create one bundle entitlement, not fake per-course entitlements.
- My Courses should show the bundle as a bundle card.
- Clicking bundle opens bundle learning page listing included courses.
- Course player access should resolve through bundle entitlement.

Bootcamp-specific:
- Job Ready Bootcamp should use the same pricing-card UI.
- After purchase, user should be enrolled in bootcamp.
- Upcoming mentor session section should remain visible only to bootcamp-enrolled users.
- Payment success and emails should work same as paid course purchase.

UI requirements:
- Replace the current single big CTA/enroll card area with plan cards.
- Keep the dark premium theme.
- Avoid cheap gradient-heavy cards.
- Use shadcn/ui components where useful.
- Use orange accent #FF5F36 / existing brand orange.
- Cards should have:
  - subtle border
  - soft orange glow only for recommended/default plan
  - responsive layout
  - strong readable typography
  - clean price formatting
- Example layout:
  Section title: “Choose Your Learning Plan”
  Subtitle: “Pick the access duration that fits your learning pace.”
  Cards:
    Monthly / 30 Days
    Quarterly / 90 Days
    Lifetime / Unlimited
- On mobile, cards stack vertically.

Important edge cases:
- No pricing plans configured but product is paid: do not allow checkout; show a graceful “Pricing will be available soon” message.
- Free product: do not show pricing cards; show free enrollment CTA.
- Existing active entitlement: show Continue Learning only.
- Expired entitlement: show pricing cards again.
- Coupon invalid: show inline error.
- Coupon valid: show discounted price per selected plan.
- Razorpay failure: keep user on page and show error toast.
- Duplicate payment verification should be idempotent.

Testing checklist:
1. SuperAdmin can create 1, 2, and 3 pricing plans for a course.
2. SuperAdmin cannot create 4th active plan.
3. SuperAdmin can delete one plan and then create another.
4. Only one default plan exists.
5. Student sees pricing cards on paid course landing page.
6. Student selects a plan and checkout amount matches selected plan.
7. Payment success creates entitlement with correct validity.
8. Student is redirected to My Courses after success.
9. Enrollment/payment emails are sent.
10. Bundle purchase creates bundle entitlement only.
11. Bootcamp purchase creates bootcamp enrollment.
12. Already-enrolled student sees Continue Learning instead of price cards.
13. Expired user sees pricing cards again.
14. Free courses are unaffected.
15. B2B college-assigned access is unaffected and does not require payment.

Implementation order:
1. Audit existing pricing tables/actions/components.
2. Extend DB only where missing.
3. Add/extend SuperAdmin pricing manager with max 3 plan rule.
4. Add shared Student LMS pricing card component.
5. Wire pricing plans into paid course detail page.
6. Wire pricing plans into bundle detail page.
7. Wire pricing plans into job ready bootcamp page.
8. Update checkout actions to accept and validate price_plan_id.
9. Update entitlement validity logic.
10. Test all flows end to end.
11. Run typecheck, lint, and build.

Do not:
- Hardcode prices in frontend.
- Trust price from client.
- Create fake course entitlements for bundle purchase.
- Break existing My Courses logic.
- Move payment-success inside My Courses.
- Show pricing in mentor section.
- Add more than 3 active plans for one product.

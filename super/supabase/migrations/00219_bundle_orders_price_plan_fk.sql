-- Bundle checkout: orders.price_plan_id FK targets course_price_plans only.
-- Store bundle_price_plans.id in bundle_price_plan_id instead.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bundle_price_plan_id uuid NULL
    REFERENCES public.bundle_price_plans (id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS content_type text NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bundle_id uuid NULL
    REFERENCES public.course_bundles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_bundle_price_plan
  ON public.orders (bundle_price_plan_id);

CREATE INDEX IF NOT EXISTS idx_orders_bundle_id
  ON public.orders (bundle_id);

COMMENT ON COLUMN public.orders.bundle_price_plan_id IS
  'FK to bundle_price_plans for course_bundle purchases. course orders use price_plan_id.';

COMMENT ON COLUMN public.orders.content_type IS
  'checkout content discriminator: course | bundle';

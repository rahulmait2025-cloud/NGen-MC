-- Campus Ambassador program: coupons extension, settings, applications, ambassadors, analytics.

-- ─── 1. Extend coupons ───────────────────────────────────────────────────────

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS coupon_origin text NOT NULL DEFAULT 'superadmin',
  ADD COLUMN IF NOT EXISTS ambassador_id uuid NULL,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_profile_snapshot jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coupon_config_snapshot jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_coupon_origin_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_coupon_origin_check
  CHECK (coupon_origin IN ('superadmin', 'campus_ambassador'));

UPDATE public.coupons
SET coupon_origin = 'superadmin'
WHERE coupon_origin IS NULL OR coupon_origin = '';

CREATE INDEX IF NOT EXISTS idx_coupons_origin_status_created
  ON public.coupons (coupon_origin, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupons_ambassador
  ON public.coupons (ambassador_id)
  WHERE ambassador_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coupons_owner_user
  ON public.coupons (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coupons_code_origin
  ON public.coupons (code, coupon_origin);

-- ─── 2. Campus ambassador global settings ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_ambassador_settings (
  id text PRIMARY KEY DEFAULT 'default',
  discount_type public.coupon_discount_type NOT NULL DEFAULT 'percentage',
  discount_value integer NOT NULL DEFAULT 20,
  max_uses integer NULL,
  max_uses_per_user integer NOT NULL DEFAULT 1,
  min_order_amount_minor integer NULL,
  applicable_entity_types public.sellable_entity_type[] NOT NULL DEFAULT ARRAY[
    'course_variant',
    'course_bundle',
    'master_course',
    'job_ready_bootcamp',
    'paid_mentorship_booking'
  ]::public.sellable_entity_type[],
  applicable_entity_ids uuid[] NULL,
  applicable_sources public.purchase_source[] NOT NULL DEFAULT ARRAY['lms']::public.purchase_source[],
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NULL,
  status public.coupon_status NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}',
  updated_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.campus_ambassador_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS campus_ambassador_settings_updated_at ON public.campus_ambassador_settings;
CREATE TRIGGER campus_ambassador_settings_updated_at
  BEFORE UPDATE ON public.campus_ambassador_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. Campus ambassador applications ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_ambassador_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  whatsapp_number text NULL,
  college_id uuid NULL REFERENCES public.colleges (id) ON DELETE SET NULL,
  college_name text NOT NULL,
  degree text NULL,
  branch text NULL,
  year_of_study text NULL,
  city text NULL,
  state text NULL,
  linkedin_url text NULL,
  instagram_url text NULL,
  github_url text NULL,
  current_communities text NULL,
  campus_reach text NULL,
  expected_referrals integer NULL,
  why_join text NOT NULL,
  how_will_promote text NULL,
  tshirt_size text NULL,
  consent_given boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'approved',
  reviewed_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz NULL,
  rejection_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campus_ambassador_applications_status_check
    CHECK (status IN ('submitted', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_campus_ambassador_applications_user_created
  ON public.campus_ambassador_applications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campus_ambassador_applications_status_created
  ON public.campus_ambassador_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campus_ambassador_applications_college
  ON public.campus_ambassador_applications (college_id)
  WHERE college_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campus_ambassador_applications_user_active_approved
  ON public.campus_ambassador_applications (user_id)
  WHERE status = 'approved';

DROP TRIGGER IF EXISTS campus_ambassador_applications_updated_at ON public.campus_ambassador_applications;
CREATE TRIGGER campus_ambassador_applications_updated_at
  BEFORE UPDATE ON public.campus_ambassador_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. Campus ambassadors ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  application_id uuid NOT NULL UNIQUE REFERENCES public.campus_ambassador_applications (id) ON DELETE CASCADE,
  coupon_id uuid NULL UNIQUE REFERENCES public.coupons (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz NULL,
  removed_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campus_ambassadors_status_check
    CHECK (status IN ('active', 'paused', 'removed'))
);

CREATE INDEX IF NOT EXISTS idx_campus_ambassadors_status_joined
  ON public.campus_ambassadors (status, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_campus_ambassadors_coupon
  ON public.campus_ambassadors (coupon_id)
  WHERE coupon_id IS NOT NULL;

DROP TRIGGER IF EXISTS campus_ambassadors_updated_at ON public.campus_ambassadors;
CREATE TRIGGER campus_ambassadors_updated_at
  BEFORE UPDATE ON public.campus_ambassadors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 5. FK coupons.ambassador_id → campus_ambassadors ──────────────────────

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_ambassador_id_fkey;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_ambassador_id_fkey
  FOREIGN KEY (ambassador_id) REFERENCES public.campus_ambassadors (id) ON DELETE SET NULL;

-- ─── 6. Analytics indexes ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_created_desc
  ON public.coupon_usages (coupon_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_coupon_status_created
  ON public.orders (coupon_code, status, created_at DESC)
  WHERE coupon_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_purchaser_user_created
  ON public.orders (purchaser_user_id, created_at DESC)
  WHERE purchaser_user_id IS NOT NULL;

-- ─── 7. Analytics view ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.campus_ambassador_coupon_analytics AS
SELECT
  c.id AS coupon_id,
  c.code AS coupon_code,
  c.status AS coupon_status,
  ca.id AS ambassador_id,
  ca.user_id,
  COALESCE(app.full_name, p.full_name, '') AS ambassador_name,
  COALESCE(app.email, p.email, '') AS ambassador_email,
  app.college_name,
  ca.joined_at,
  c.discount_type,
  c.discount_value,
  COUNT(cu.id)::integer AS total_uses,
  COUNT(cu.id) FILTER (WHERE o.status = 'paid')::integer AS paid_uses,
  COUNT(
    DISTINCT COALESCE(cu.purchaser_user_id::text, cu.purchaser_email)
  )::integer AS unique_customers,
  COALESCE(SUM(cu.discount_amount_minor), 0)::bigint AS total_discount_minor,
  COALESCE(SUM(o.base_amount_minor) FILTER (WHERE o.status = 'paid'), 0)::bigint AS gross_revenue_minor,
  COALESCE(SUM(o.total_amount_minor) FILTER (WHERE o.status = 'paid'), 0)::bigint AS net_revenue_minor,
  MAX(cu.created_at) AS last_used_at
FROM public.coupons c
INNER JOIN public.campus_ambassadors ca ON ca.coupon_id = c.id
INNER JOIN public.campus_ambassador_applications app ON app.id = ca.application_id
LEFT JOIN public.profiles p ON p.id = ca.user_id
LEFT JOIN public.coupon_usages cu ON cu.coupon_id = c.id
LEFT JOIN public.orders o ON o.id = cu.order_id
WHERE c.coupon_origin = 'campus_ambassador'
GROUP BY
  c.id,
  c.code,
  c.status,
  ca.id,
  ca.user_id,
  app.full_name,
  p.full_name,
  app.email,
  p.email,
  app.college_name,
  ca.joined_at,
  c.discount_type,
  c.discount_value;

-- ─── 8. Usage details RPC ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.campus_ambassador_coupon_usage_details(
  p_coupon_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  usage_id uuid,
  coupon_id uuid,
  order_id uuid,
  purchaser_user_id uuid,
  purchaser_email text,
  purchaser_name text,
  entity_type public.sellable_entity_type,
  entity_id uuid,
  entity_title text,
  base_amount_minor integer,
  discount_amount_minor integer,
  total_amount_minor integer,
  order_status public.order_status,
  payment_date timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cu.id AS usage_id,
    cu.coupon_id,
    cu.order_id,
    cu.purchaser_user_id,
    cu.purchaser_email,
    o.purchaser_name,
    o.entity_type,
    o.entity_id,
    CASE o.entity_type
      WHEN 'course_bundle' THEN COALESCE(o.metadata ->> 'bundle_title', o.metadata ->> 'title', 'Bundle')
      WHEN 'course_variant' THEN COALESCE(o.metadata ->> 'variant_title', o.metadata ->> 'plan_name', 'Course Variant')
      WHEN 'paid_mentorship_booking' THEN COALESCE(o.metadata ->> 'category_title', 'Mentorship Session')
      WHEN 'job_ready_bootcamp' THEN COALESCE(o.metadata ->> 'course_title', o.metadata ->> 'title', 'Job Ready Bootcamp')
      ELSE COALESCE(o.metadata ->> 'course_title', o.metadata ->> 'plan_name', 'Course')
    END AS entity_title,
    o.base_amount_minor,
    cu.discount_amount_minor,
    o.total_amount_minor,
    o.status AS order_status,
    COALESCE(o.paid_at, pay.captured_at) AS payment_date,
    cu.created_at
  FROM public.coupon_usages cu
  INNER JOIN public.orders o ON o.id = cu.order_id
  LEFT JOIN LATERAL (
    SELECT p.captured_at
    FROM public.payments p
    WHERE p.order_id = o.id AND p.status = 'captured'
    ORDER BY p.captured_at DESC NULLS LAST
    LIMIT 1
  ) pay ON true
  WHERE cu.coupon_id = p_coupon_id
  ORDER BY cu.created_at DESC
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.campus_ambassador_coupon_usage_details(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.campus_ambassador_coupon_usage_details(uuid, integer, integer) TO service_role;

-- ─── 9. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.campus_ambassador_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_ambassador_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_ambassadors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campus_ambassador_settings_superadmin_all ON public.campus_ambassador_settings;
CREATE POLICY campus_ambassador_settings_superadmin_all ON public.campus_ambassador_settings
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS campus_ambassador_applications_insert_own ON public.campus_ambassador_applications;
CREATE POLICY campus_ambassador_applications_insert_own ON public.campus_ambassador_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS campus_ambassador_applications_select_own ON public.campus_ambassador_applications;
CREATE POLICY campus_ambassador_applications_select_own ON public.campus_ambassador_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS campus_ambassador_applications_superadmin_write ON public.campus_ambassador_applications;
CREATE POLICY campus_ambassador_applications_superadmin_write ON public.campus_ambassador_applications
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS campus_ambassadors_select_own ON public.campus_ambassadors;
CREATE POLICY campus_ambassadors_select_own ON public.campus_ambassadors
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS campus_ambassadors_superadmin_write ON public.campus_ambassadors;
CREATE POLICY campus_ambassadors_superadmin_write ON public.campus_ambassadors
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

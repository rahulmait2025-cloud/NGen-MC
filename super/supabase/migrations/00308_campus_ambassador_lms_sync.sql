-- Migration: 00308_campus_ambassador_lms_sync.sql
-- Description:
--   1. Removes public.is_superadmin() checks from campus ambassador RPCs to enable Service Role access.
--   2. Bridges note_payment_orders to the commission ledger (campus_ambassador_payouts).
--   3. Updates campus_ambassador_coupon_usage_details to include note referrals via UNION.
--   4. Updates campus_ambassador_coupon_analytics view to aggregate both course and note referrals.
--   5. Synchronizes video counts by updating master_course_delivery_stats to count published video items directly.
--
-- Safety and Idempotency Enhancements:
--   - Hardened SET search_path = public, pg_temp for all SECURITY DEFINER functions to prevent search path hijacking.
--   - Revoked execute on administrative RPCs from PUBLIC, anon, and authenticated, granting only to service_role.
--   - Avoided unassigned record runtime exceptions in approve_campus_ambassador_application by using typed rowtypes.
--   - Prevented cartesian row multiplication and duration double-counting in master_course_delivery_stats.
--   - Applied parent module visibility and publish status check filters consistently for all course stats.
--   - Safely mapped and casted order statuses via CASE expression instead of direct unsafe casting.
--   - Clarified commission mapping from discount value for note sales and renamed tracking variables.
--   - Appended a safe, idempotent backfill script for existing paid note orders using ON CONFLICT DO NOTHING.

BEGIN;

-- ============================================================================
-- 1. Remove DB-level is_superadmin() checks and harden Administrative RPCs
-- ============================================================================

-- 1.1. approve_campus_ambassador_application
CREATE OR REPLACE FUNCTION public.approve_campus_ambassador_application(
  p_application_id uuid,
  p_reviewer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app public.campus_ambassador_applications%ROWTYPE;
  v_ambassador_id uuid;
  v_coupon_code text;
  v_first_name text;
  v_settings public.campus_ambassador_settings%ROWTYPE;
  v_coupon_row public.coupons%ROWTYPE; -- Strongly typed to prevent "record not yet assigned" runtime error
  v_existing_ambassador public.campus_ambassadors%ROWTYPE;
BEGIN
  SELECT * INTO v_app
  FROM public.campus_ambassador_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status = 'approved' THEN
    RAISE EXCEPTION 'Application already approved';
  END IF;

  IF v_app.status = 'rejected' THEN
    RAISE EXCEPTION 'Application was rejected';
  END IF;

  SELECT * INTO v_settings
  FROM public.campus_ambassador_settings
  WHERE id = 'default';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campus ambassador settings not configured';
  END IF;

  -- Approve the application
  UPDATE public.campus_ambassador_applications
  SET status = 'approved',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = p_application_id;

  -- Check if ambassador row already exists for user_id
  SELECT * INTO v_existing_ambassador
  FROM public.campus_ambassadors
  WHERE user_id = v_app.user_id;

  IF FOUND THEN
    v_ambassador_id := v_existing_ambassador.id;
    
    -- Reactivate existing ambassador
    UPDATE public.campus_ambassadors
    SET status = 'active',
        application_id = p_application_id,
        access_enabled = true,
        removed_at = NULL,
        paused_at = NULL,
        updated_at = now()
    WHERE id = v_ambassador_id;

    -- If there's an existing coupon, reactivate it too
    IF v_existing_ambassador.coupon_id IS NOT NULL THEN
      UPDATE public.coupons
      SET status = 'active',
          updated_at = now()
      WHERE id = v_existing_ambassador.coupon_id;
      
      SELECT * INTO v_coupon_row
      FROM public.coupons
      WHERE id = v_existing_ambassador.coupon_id;
    END IF;
  ELSE
    -- Create ambassador row (fresh row per approval)
    INSERT INTO public.campus_ambassadors (user_id, application_id, status, access_enabled)
    VALUES (v_app.user_id, p_application_id, 'active', true)
    RETURNING id INTO v_ambassador_id;
  END IF;

  -- If coupon doesn't exist yet, create one
  IF v_coupon_row.id IS NULL THEN
    -- Generate coupon code
    v_first_name := UPPER(regexp_replace(
      split_part(v_app.full_name, ' ', 1),
      '[^A-Za-z0-9]', '', 'g'
    ));
    IF v_first_name IS NULL OR length(v_first_name) = 0 THEN
      v_first_name := 'STUDENT';
    END IF;

    v_coupon_code := UPPER(
      v_first_name || 'CTO' ||
      CASE
        WHEN v_settings.discount_type = 'percentage' THEN v_settings.discount_value::text
        ELSE 'OFF'
      END
    );

    -- Ensure uniqueness
    IF EXISTS (SELECT 1 FROM public.coupons WHERE code = v_coupon_code) THEN
      v_coupon_code := v_coupon_code || LEFT(md5(random()::text), 4);
    END IF;

    -- Create coupon
    INSERT INTO public.coupons (
      code, description, discount_type, discount_value,
      max_uses, uses_count, max_uses_per_user,
      min_order_amount_minor, valid_from, valid_until,
      status, applicable_entity_types, applicable_entity_ids,
      applicable_sources, coupon_origin, ambassador_id,
      owner_user_id, owner_profile_snapshot, coupon_config_snapshot
    ) VALUES (
      v_coupon_code,
      'Campus Ambassador coupon for ' || v_app.full_name,
      v_settings.discount_type,
      v_settings.discount_value,
      v_settings.max_uses, 0, v_settings.max_uses_per_user,
      v_settings.min_order_amount_minor,
      v_settings.valid_from, v_settings.valid_until,
      v_settings.status,
      v_settings.applicable_entity_types,
      v_settings.applicable_entity_ids,
      v_settings.applicable_sources,
      'campus_ambassador',
      v_ambassador_id,
      v_app.user_id,
      jsonb_build_object(
        'full_name', v_app.full_name,
        'email', v_app.email,
        'college_name', v_app.college_name,
        'phone', v_app.phone
      ),
      jsonb_build_object(
        'discount_type', v_settings.discount_type,
        'discount_value', v_settings.discount_value,
        'status', v_settings.status
      )
    )
    RETURNING * INTO v_coupon_row;

    -- Link ambassador to coupon
    UPDATE public.campus_ambassadors
    SET coupon_id = v_coupon_row.id
    WHERE id = v_ambassador_id;
  END IF;

  RETURN jsonb_build_object(
    'application_id', p_application_id,
    'ambassador_id', v_ambassador_id,
    'coupon_id', v_coupon_row.id,
    'coupon_code', v_coupon_row.code
  );
END;
$$;


-- 1.2. remove_campus_ambassador
CREATE OR REPLACE FUNCTION public.remove_campus_ambassador(
  p_ambassador_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.campus_ambassadors
  SET status = 'removed', 
      access_enabled = false,
      removed_at = now()
  WHERE id = p_ambassador_id AND status = 'active';

  -- Disable the associated coupon
  UPDATE public.coupons
  SET status = 'disabled'
  WHERE ambassador_id = p_ambassador_id
    AND coupon_origin = 'campus_ambassador'
    AND status = 'active';
END;
$$;


-- 1.3. toggle_campus_ambassador_coupon
CREATE OR REPLACE FUNCTION public.toggle_campus_ambassador_coupon(
  p_ambassador_id uuid,
  p_enable boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Toggle coupon status
  UPDATE public.coupons
  SET status = CASE WHEN p_enable THEN 'active' ELSE 'disabled' END
  WHERE ambassador_id = p_ambassador_id
    AND coupon_origin = 'campus_ambassador';

  -- Toggle ambassador access flag
  UPDATE public.campus_ambassadors
  SET access_enabled = p_enable,
      updated_at = now()
  WHERE id = p_ambassador_id;
END;
$$;


-- 1.4. reject_campus_ambassador_application
CREATE OR REPLACE FUNCTION public.reject_campus_ambassador_application(
  p_application_id uuid,
  p_reviewer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.campus_ambassador_applications
  SET status = 'rejected',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = p_application_id
    AND status = 'submitted';
END;
$$;


-- 1.5. grant_payout_to_ambassador
CREATE OR REPLACE FUNCTION public.grant_payout_to_ambassador(
  p_ambassador_id uuid,
  p_amount_minor bigint,
  p_paid_via text DEFAULT NULL,
  p_reference_text text DEFAULT NULL,
  p_granter_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_generated bigint;
  v_paid bigint;
  v_remaining bigint;
BEGIN
  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Lock the ambassador row to prevent concurrent overpayment
  SELECT
    COALESCE(total_generated_minor, 0),
    COALESCE(total_paid_minor, 0)
  INTO v_generated, v_paid
  FROM public.campus_ambassadors
  WHERE id = p_ambassador_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ambassador not found';
  END IF;

  v_remaining := v_generated - v_paid;

  IF p_amount_minor > v_remaining THEN
    RAISE EXCEPTION 'Cannot pay more than remaining. Remaining: %, Requested: %', v_remaining, p_amount_minor;
  END IF;

  INSERT INTO public.campus_ambassador_payouts (
    ambassador_id, kind, amount_minor, paid_via, reference_text, created_by
  ) VALUES (
    p_ambassador_id, 'payout_made', p_amount_minor, p_paid_via, p_reference_text, p_granter_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'amount_minor', p_amount_minor,
    'remaining_minor', v_remaining - p_amount_minor
  );
END;
$$;


-- 1.6. bulk_update_ambassador_discount
CREATE OR REPLACE FUNCTION public.bulk_update_ambassador_discount(
  p_new_discount_value integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.coupons
  SET discount_value = p_new_discount_value
  WHERE coupon_origin = 'campus_ambassador';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


-- ============================================================================
-- 1.7. Revoke/Grant Administrative Execute Privileges
-- ============================================================================
-- Since is_superadmin() checks are bypassed at the DB level, execution must be 
-- explicitly limited to service_role to prevent unprivileged clients from executing them.

REVOKE EXECUTE ON FUNCTION public.approve_campus_ambassador_application(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_campus_ambassador_application(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.remove_campus_ambassador(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_campus_ambassador(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.toggle_campus_ambassador_coupon(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_campus_ambassador_coupon(uuid, boolean) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reject_campus_ambassador_application(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_campus_ambassador_application(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.grant_payout_to_ambassador(uuid, bigint, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_payout_to_ambassador(uuid, bigint, text, text, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.bulk_update_ambassador_discount(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_ambassador_discount(integer) TO service_role;


-- ============================================================================
-- 2. Bridge note_payment_orders to the Commission Ledger
-- ============================================================================

ALTER TABLE public.campus_ambassador_payouts
  ADD COLUMN IF NOT EXISTS note_payment_order_id uuid NULL
  REFERENCES public.note_payment_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_earned_note_order_id
  ON public.campus_ambassador_payouts(note_payment_order_id)
  WHERE kind = 'commission_earned' AND note_payment_order_id IS NOT NULL;


-- ============================================================================
-- 3. Trigger to calculate commission when note payment order status is 'paid'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_commission_on_note_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ambassador_id uuid;
  v_coupon_code text;
  v_discount_amount_minor bigint;
  v_commission_amount_minor bigint;
BEGIN
  -- Only fire when status transitions to 'paid'
  IF NEW.status != 'paid' OR OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  -- Find if a coupon usage was registered for this note order
  SELECT ncu.coupon_code, ncu.discount_amount_minor, c.ambassador_id
  INTO v_coupon_code, v_discount_amount_minor, v_ambassador_id
  FROM public.note_coupon_usages ncu
  INNER JOIN public.coupons c ON c.id = ncu.coupon_id
  WHERE ncu.note_payment_order_id = NEW.id
    AND c.coupon_origin = 'campus_ambassador'
    AND c.ambassador_id IS NOT NULL
  LIMIT 1;

  -- No ambassador coupon found — exit
  IF v_ambassador_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotent: skip if already recorded
  IF EXISTS (
    SELECT 1 FROM public.campus_ambassador_payouts
    WHERE note_payment_order_id = NEW.id AND kind = 'commission_earned'
  ) THEN
    RETURN NEW;
  END IF;

  -- Commission Policy: In this business model, the ambassador commission is 
  -- defined as equal to the total discount amount given on the purchase.
  v_commission_amount_minor := COALESCE(v_discount_amount_minor, 0);

  -- Insert ledger row
  INSERT INTO public.campus_ambassador_payouts (
    ambassador_id, kind, amount_minor, note_payment_order_id
  ) VALUES (
    v_ambassador_id, 'commission_earned', v_commission_amount_minor, NEW.id
  );

  RETURN NEW;
END;
$$;

-- Protect the trigger function
REVOKE EXECUTE ON FUNCTION public.insert_commission_on_note_order_paid() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_commission_on_note_order_paid() TO service_role;

DROP TRIGGER IF EXISTS trg_commission_on_note_order_paid ON public.note_payment_orders;
CREATE TRIGGER trg_commission_on_note_order_paid
  AFTER UPDATE OF status ON public.note_payment_orders
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
  EXECUTE FUNCTION public.insert_commission_on_note_order_paid();


-- ============================================================================
-- 4. Aggregated Referral Details RPC: coupon_usages UNION note_coupon_usages
-- ============================================================================

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  (
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

    UNION ALL

    SELECT
      ncu.id AS usage_id,
      ncu.coupon_id,
      ncu.note_payment_order_id AS order_id,
      ncu.purchaser_user_id,
      ncu.purchaser_email,
      COALESCE(prof.full_name, '') AS purchaser_name,
      'note_collection'::public.sellable_entity_type AS entity_type,
      ncu.note_collection_id AS entity_id,
      nc.title AS entity_title,
      ncu.original_amount_minor AS base_amount_minor,
      ncu.discount_amount_minor,
      ncu.final_amount_minor AS total_amount_minor,
      -- Safely map payment statuses to order_status enum values
      CASE COALESCE(npo.status, 'pending')
        WHEN 'pending' THEN 'pending'::public.order_status
        WHEN 'paid' THEN 'paid'::public.order_status
        WHEN 'failed' THEN 'failed'::public.order_status
        WHEN 'cancelled' THEN 'cancelled'::public.order_status
        WHEN 'refunded' THEN 'refunded'::public.order_status
        ELSE 'pending'::public.order_status
      END AS order_status,
      npo.paid_at AS payment_date,
      ncu.created_at
    FROM public.note_coupon_usages ncu
    LEFT JOIN public.note_payment_orders npo ON npo.id = ncu.note_payment_order_id
    LEFT JOIN public.note_collections nc ON nc.id = ncu.note_collection_id
    LEFT JOIN public.profiles prof ON prof.id = ncu.purchaser_user_id
    WHERE ncu.coupon_id = p_coupon_id
  )
  ORDER BY created_at DESC
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

ALTER FUNCTION public.campus_ambassador_coupon_usage_details(uuid, integer, integer) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.campus_ambassador_coupon_usage_details(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campus_ambassador_coupon_usage_details(uuid, integer, integer) TO service_role;


-- ============================================================================
-- 5. Aggregated Campus Ambassador Coupons View: coupon_usages UNION note_coupon_usages
-- ============================================================================

CREATE OR REPLACE VIEW public.campus_ambassador_coupon_analytics
WITH (security_invoker = true)
AS
WITH unified_usages AS (
  SELECT
    cu.coupon_id,
    cu.id AS usage_id,
    cu.purchaser_user_id,
    cu.purchaser_email,
    cu.discount_amount_minor,
    o.base_amount_minor,
    o.total_amount_minor,
    o.status AS order_status,
    cu.created_at
  FROM public.coupon_usages cu
  INNER JOIN public.orders o ON o.id = cu.order_id

  UNION ALL

  SELECT
    ncu.coupon_id,
    ncu.id AS usage_id,
    ncu.purchaser_user_id,
    ncu.purchaser_email,
    ncu.discount_amount_minor,
    ncu.original_amount_minor AS base_amount_minor,
    ncu.final_amount_minor AS total_amount_minor,
    -- Safely map payment statuses to order_status enum values
    CASE COALESCE(npo.status, 'pending')
      WHEN 'pending' THEN 'pending'::public.order_status
      WHEN 'paid' THEN 'paid'::public.order_status
      WHEN 'failed' THEN 'failed'::public.order_status
      WHEN 'cancelled' THEN 'cancelled'::public.order_status
      WHEN 'refunded' THEN 'refunded'::public.order_status
      ELSE 'pending'::public.order_status
    END AS order_status,
    ncu.created_at
  FROM public.note_coupon_usages ncu
  LEFT JOIN public.note_payment_orders npo ON npo.id = ncu.note_payment_order_id
)
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
  COUNT(uu.usage_id)::integer AS total_uses,
  COUNT(uu.usage_id) FILTER (WHERE uu.order_status = 'paid')::integer AS paid_uses,
  COUNT(
    DISTINCT COALESCE(uu.purchaser_user_id::text, uu.purchaser_email)
  )::integer AS unique_customers,
  COALESCE(SUM(uu.discount_amount_minor), 0)::bigint AS total_discount_minor,
  COALESCE(SUM(uu.base_amount_minor) FILTER (WHERE uu.order_status = 'paid'), 0)::bigint AS gross_revenue_minor,
  COALESCE(SUM(uu.total_amount_minor) FILTER (WHERE uu.order_status = 'paid'), 0)::bigint AS net_revenue_minor,
  MAX(uu.created_at) AS last_used_at
FROM public.coupons c
INNER JOIN public.campus_ambassadors ca ON ca.coupon_id = c.id
INNER JOIN public.campus_ambassador_applications app ON app.id = ca.application_id
LEFT JOIN public.profiles p ON p.id = ca.user_id
LEFT JOIN unified_usages uu ON uu.coupon_id = c.id
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


-- ============================================================================
-- 6. Reconcile master_course_delivery_stats to count published video items directly
-- ============================================================================
-- Standardizes stats with student LMS catalog view display filters.
-- Avoids duplicate aggregates/cartesian multiplication of counts and duration_seconds by separating aggregates.
-- Respects module publishing & visibility settings (only counting items in published & student-visible modules).

CREATE OR REPLACE VIEW public.master_course_delivery_stats
WITH (security_invoker = true)
AS
SELECT
  c.id AS master_course_id,
  COALESCE(m_stats.module_count, 0)::bigint AS module_count,
  COALESCE(i_stats.lesson_count, 0)::bigint AS lesson_count,
  COALESCE(i_stats.video_count, 0)::bigint AS video_count,
  COALESCE(i_stats.total_duration_seconds, 0)::integer AS total_duration_seconds,
  GREATEST(
    c.updated_at,
    COALESCE(m_stats.max_updated_at, c.updated_at),
    COALESCE(i_stats.max_updated_at, c.updated_at)
  ) AS updated_at
FROM public.master_courses c
LEFT JOIN LATERAL (
  SELECT 
    COUNT(m.id) AS module_count,
    MAX(m.updated_at) AS max_updated_at
  FROM public.master_course_modules m
  WHERE m.master_course_id = c.id
    AND m.publish_status = 'published'
    AND (m.visible_to_students IS TRUE OR m.visible_to_students IS NULL)
) m_stats ON true
LEFT JOIN LATERAL (
  SELECT 
    COUNT(i.id) AS lesson_count,
    COUNT(i.id) FILTER (WHERE i.item_type = 'video') AS video_count,
    COALESCE(SUM(i.duration_seconds), 0)::integer AS total_duration_seconds,
    MAX(i.updated_at) AS max_updated_at
  FROM public.master_course_items i
  INNER JOIN public.master_course_modules m 
    ON m.id = i.module_id
  WHERE i.master_course_id = c.id
    AND i.publish_status = 'published'
    AND m.publish_status = 'published'
    AND (m.visible_to_students IS TRUE OR m.visible_to_students IS NULL)
) i_stats ON true;


-- ============================================================================
-- 7. Backfill existing paid note orders that used campus ambassador coupons
-- ============================================================================
-- Checks note payments completed before the trigger was created.
-- ON CONFLICT DO NOTHING relies on the idx_payouts_earned_note_order_id unique constraint to ensure idempotency.

INSERT INTO public.campus_ambassador_payouts (
  ambassador_id,
  kind,
  amount_minor,
  note_payment_order_id
)
SELECT
  c.ambassador_id,
  'commission_earned'::public.campus_ambassador_payout_kind,
  COALESCE(ncu.discount_amount_minor, 0),
  npo.id
FROM public.note_payment_orders npo
INNER JOIN public.note_coupon_usages ncu ON ncu.note_payment_order_id = npo.id
INNER JOIN public.coupons c ON c.id = ncu.coupon_id
WHERE npo.status = 'paid'
  AND c.coupon_origin = 'campus_ambassador'
  AND c.ambassador_id IS NOT NULL
ON CONFLICT (note_payment_order_id) 
  WHERE (kind = 'commission_earned' AND note_payment_order_id IS NOT NULL) 
  DO NOTHING;

COMMIT;

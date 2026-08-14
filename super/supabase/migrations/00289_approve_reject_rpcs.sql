-- Approve a campus ambassador application.
-- Atomic: creates ambassador row + coupon row in one transaction.

CREATE OR REPLACE FUNCTION public.approve_campus_ambassador_application(
  p_application_id uuid,
  p_reviewer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app record;
  v_ambassador_id uuid;
  v_coupon_code text;
  v_first_name text;
  v_settings record;
  v_coupon_row record;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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

  -- Create ambassador row (fresh row per approval)
  INSERT INTO public.campus_ambassadors (user_id, application_id, status)
  VALUES (v_app.user_id, p_application_id, 'active')
  RETURNING id INTO v_ambassador_id;

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

  RETURN jsonb_build_object(
    'application_id', p_application_id,
    'ambassador_id', v_ambassador_id,
    'coupon_id', v_coupon_row.id,
    'coupon_code', v_coupon_code
  );
END;
$$;


-- Reject a campus ambassador application
CREATE OR REPLACE FUNCTION public.reject_campus_ambassador_application(
  p_application_id uuid,
  p_reviewer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.campus_ambassador_applications
  SET status = 'rejected',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = p_application_id
    AND status = 'submitted';
END;
$$;


-- Remove an ambassador (terminal; preserves all data)
CREATE OR REPLACE FUNCTION public.remove_campus_ambassador(
  p_ambassador_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.campus_ambassadors
  SET status = 'removed', removed_at = now()
  WHERE id = p_ambassador_id AND status = 'active';

  -- Disable the associated coupon (preserves code; reusable later)
  UPDATE public.coupons
  SET status = 'disabled'
  WHERE ambassador_id = p_ambassador_id
    AND coupon_origin = 'campus_ambassador'
    AND status = 'active';
END;
$$;


-- Enable/disable coupon for an ambassador (toggle)
CREATE OR REPLACE FUNCTION public.toggle_campus_ambassador_coupon(
  p_ambassador_id uuid,
  p_enable boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.coupons
  SET status = CASE WHEN p_enable THEN 'active' ELSE 'disabled' END
  WHERE ambassador_id = p_ambassador_id
    AND coupon_origin = 'campus_ambassador';
END;
$$;

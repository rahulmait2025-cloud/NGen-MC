-- Migration: Add access_enabled column to campus_ambassadors and update RPCs
-- Adds access_enabled column to campus_ambassadors
ALTER TABLE public.campus_ambassadors 
ADD COLUMN IF NOT EXISTS access_enabled boolean NOT NULL DEFAULT true;

-- Update approve_campus_ambassador_application RPC to:
-- 1. Handle existing/removed ambassadors by reactivating them
-- 2. Reactivate their associated coupon
-- 3. Set access_enabled = true
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
  v_existing_ambassador record;
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


-- Update remove_campus_ambassador to also set access_enabled = false
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


-- Update toggle_campus_ambassador_coupon to update both coupon status AND access_enabled
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

-- Grant a payout to an ambassador.
-- Enforces hard cap (cannot exceed remaining) using row-level lock.

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
SET search_path = public
AS $$
DECLARE
  v_generated bigint;
  v_paid bigint;
  v_remaining bigint;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Lock the ambassador row to prevent concurrent overpayment
  SELECT total_generated_minor, total_paid_minor
  INTO v_generated, v_paid
  FROM public.campus_ambassadors
  WHERE id = p_ambassador_id
  FOR UPDATE;

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


-- Bulk update discount value for all campus ambassador coupons
CREATE OR REPLACE FUNCTION public.bulk_update_ambassador_discount(
  p_new_discount_value integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.coupons
  SET discount_value = p_new_discount_value
  WHERE coupon_origin = 'campus_ambassador';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

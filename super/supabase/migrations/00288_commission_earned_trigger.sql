-- When an order transitions to 'paid', if it was placed using a campus ambassador coupon,
-- insert a commission_earned ledger row. Idempotent via unique(order_id).

CREATE OR REPLACE FUNCTION public.insert_commission_on_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ambassador_id uuid;
  v_commission_minor bigint;
BEGIN
  -- Only fire when status transitions to 'paid'
  IF NEW.status != 'paid' OR OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  -- Skip if no coupon applied
  IF NEW.coupon_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the ambassador coupon
  SELECT c.ambassador_id
  INTO v_ambassador_id
  FROM public.coupons c
  WHERE c.code = NEW.coupon_code
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
    WHERE order_id = NEW.id AND kind = 'commission_earned'
  ) THEN
    RETURN NEW;
  END IF;

  -- Commission = 100% of the discount amount (base - total paid by buyer)
  v_commission_minor := GREATEST(NEW.base_amount_minor - NEW.total_amount_minor, 0);

  -- Insert ledger row
  INSERT INTO public.campus_ambassador_payouts (
    ambassador_id, kind, amount_minor, order_id
  ) VALUES (
    v_ambassador_id, 'commission_earned', v_commission_minor, NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commission_on_order_paid ON public.orders;
CREATE TRIGGER trg_commission_on_order_paid
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
  EXECUTE FUNCTION public.insert_commission_on_order_paid();

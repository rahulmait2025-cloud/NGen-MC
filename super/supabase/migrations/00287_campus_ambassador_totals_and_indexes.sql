-- Add cached totals to campus_ambassadors and adjust unique constraint for re-approval flow.

-- Add cached totals columns
ALTER TABLE public.campus_ambassadors
  ADD COLUMN IF NOT EXISTS total_generated_minor bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid_minor bigint NOT NULL DEFAULT 0;

-- Replace strict UNIQUE(user_id) with partial unique (allow multiple rows per user over time).
-- Only one 'active' row per user is allowed at a time.
ALTER TABLE public.campus_ambassadors DROP CONSTRAINT IF EXISTS campus_ambassadors_user_id_key;
DROP INDEX IF EXISTS campus_ambassadors_user_id_key;
CREATE UNIQUE INDEX idx_campus_ambassadors_user_active
  ON public.campus_ambassadors(user_id)
  WHERE status = 'active';

-- Trigger: after INSERT on campus_ambassador_payouts, update ambassador totals
CREATE OR REPLACE FUNCTION public.update_campus_ambassador_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind = 'commission_earned' THEN
    UPDATE public.campus_ambassadors
    SET total_generated_minor = total_generated_minor + NEW.amount_minor
    WHERE id = NEW.ambassador_id;
  ELSIF NEW.kind = 'payout_made' THEN
    UPDATE public.campus_ambassadors
    SET total_paid_minor = total_paid_minor + NEW.amount_minor
    WHERE id = NEW.ambassador_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payouts_update_totals ON public.campus_ambassador_payouts;
CREATE TRIGGER trg_payouts_update_totals
  AFTER INSERT ON public.campus_ambassador_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campus_ambassador_totals();

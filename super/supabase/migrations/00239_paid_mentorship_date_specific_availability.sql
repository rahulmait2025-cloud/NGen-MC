-- Alter availability table from weekly template to date-specific slots
-- Migration 00239

-- Drop old weekly template structure
DROP TABLE IF EXISTS public.paid_mentorship_availability;

-- Recreate with date-specific slots
CREATE TABLE IF NOT EXISTS public.paid_mentorship_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  available_date DATE NOT NULL,
  start_time_ist TIME NOT NULL,
  end_time_ist TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time_ist > start_time_ist)
);

CREATE INDEX IF NOT EXISTS idx_paid_mentorship_availability_date
  ON public.paid_mentorship_availability(available_date)
  WHERE is_active = true;

-- Re-enable RLS
ALTER TABLE public.paid_mentorship_availability ENABLE ROW LEVEL SECURITY;

-- Superadmin full access
CREATE POLICY "Superadmin can manage paid mentorship availability"
  ON public.paid_mentorship_availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.global_role = 'superadmin'
    )
  );

-- Students can view availability
CREATE POLICY "Students can view availability"
  ON public.paid_mentorship_availability
  FOR SELECT
  TO authenticated
  USING (true);

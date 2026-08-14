-- Paid Mentorship Booking System
-- Migration 00238

-- 0. Extend sellable_entity_type enum for mentorship bookings
ALTER TYPE public.sellable_entity_type ADD VALUE IF NOT EXISTS 'paid_mentorship_booking';

-- 1. Mentorship categories (editable by superadmin)
CREATE TABLE IF NOT EXISTS public.paid_mentorship_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



-- 2. Mentor availability (date-specific slots)
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

-- 3. Paid mentorship bookings (core table)
CREATE TABLE IF NOT EXISTS public.paid_mentorship_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.paid_mentorship_categories(id) ON DELETE RESTRICT,
  session_date DATE NOT NULL,
  start_time_ist TIME NOT NULL,
  end_time_ist TIME NOT NULL,
  achievement_goal TEXT NOT NULL CHECK (char_length(achievement_goal) <= 500),
  skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  additional_notes TEXT CHECK (additional_notes IS NULL OR char_length(additional_notes) <= 500),
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'missed')),
  reschedule_count INT NOT NULL DEFAULT 0,
  rescheduled_from UUID REFERENCES public.paid_mentorship_bookings(id),
  coupon_code TEXT,
  discount_amount_minor INT NOT NULL DEFAULT 0,
  original_price_minor INT NOT NULL DEFAULT 0,
  selling_price_minor INT NOT NULL DEFAULT 0,
  final_amount_minor INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  order_id UUID,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Mentorship pricing config (single row settings)
CREATE TABLE IF NOT EXISTS public.paid_mentorship_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_price_minor INT NOT NULL DEFAULT 50000,
  selling_price_minor INT NOT NULL DEFAULT 5000,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default pricing (MRP 500, Selling 50 = 90% off)
INSERT INTO public.paid_mentorship_pricing (original_price_minor, selling_price_minor)
VALUES (50000, 5000)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_paid_mentorship_bookings_user_id
  ON public.paid_mentorship_bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_paid_mentorship_bookings_status
  ON public.paid_mentorship_bookings(status);

CREATE INDEX IF NOT EXISTS idx_paid_mentorship_bookings_session_date
  ON public.paid_mentorship_bookings(session_date);

CREATE INDEX IF NOT EXISTS idx_paid_mentorship_bookings_student_id
  ON public.paid_mentorship_bookings(student_id);

-- One active booking per user (pending/confirmed/rescheduled)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_booking_per_user
  ON public.paid_mentorship_bookings(user_id)
  WHERE status IN ('pending', 'confirmed', 'rescheduled');

-- 5. Enable RLS
ALTER TABLE public.paid_mentorship_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_mentorship_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_mentorship_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_mentorship_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for superadmin (full access)
CREATE POLICY "Superadmin can manage paid mentorship categories"
  ON public.paid_mentorship_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.global_role = 'superadmin'
    )
  );

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

CREATE POLICY "Superadmin can manage paid mentorship bookings"
  ON public.paid_mentorship_bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.global_role = 'superadmin'
    )
  );

CREATE POLICY "Superadmin can manage paid mentorship pricing"
  ON public.paid_mentorship_pricing
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.global_role = 'superadmin'
    )
  );

-- RLS Policies for students (read categories/pricing, manage own bookings)
CREATE POLICY "Students can view active categories"
  ON public.paid_mentorship_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Students can view availability"
  ON public.paid_mentorship_availability
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can view active pricing"
  ON public.paid_mentorship_pricing
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Students can view own bookings"
  ON public.paid_mentorship_bookings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students can create own bookings"
  ON public.paid_mentorship_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own bookings"
  ON public.paid_mentorship_bookings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to auto-expire pending bookings
CREATE OR REPLACE FUNCTION public.expire_pending_mentorship_bookings()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.paid_mentorship_bookings
  SET status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = 'Payment not completed within 10 minutes',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;

-- Add custom questions to categories and custom answers to bookings
-- Migration 00240

-- Add custom_questions JSONB to categories
ALTER TABLE public.paid_mentorship_categories
  ADD COLUMN IF NOT EXISTS custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add custom_answers JSONB to bookings
ALTER TABLE public.paid_mentorship_bookings
  ADD COLUMN IF NOT EXISTS custom_answers JSONB NOT NULL DEFAULT '[]'::jsonb;

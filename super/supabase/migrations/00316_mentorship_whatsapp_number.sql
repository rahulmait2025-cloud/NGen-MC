-- Add whatsapp_number to paid_mentorship_bookings
-- Migration 00313

ALTER TABLE public.paid_mentorship_bookings
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

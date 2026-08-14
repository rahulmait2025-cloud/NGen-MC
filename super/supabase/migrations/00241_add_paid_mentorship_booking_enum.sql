-- Add paid_mentorship_booking to sellable_entity_type enum
-- Migration 00241

ALTER TYPE public.sellable_entity_type ADD VALUE IF NOT EXISTS 'paid_mentorship_booking';

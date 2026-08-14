-- Allow entity_id to be null on orders (set after booking is created)
-- Migration 00242

ALTER TABLE public.orders ALTER COLUMN entity_id DROP NOT NULL;

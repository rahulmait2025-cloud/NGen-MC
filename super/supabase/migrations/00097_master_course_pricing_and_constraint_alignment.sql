-- Migration 00097: Master Course Pricing + Validity Columns
--                  and pricing_model CHECK constraint alignment.
--
-- GOLDEN RULE:
--   TPStreams stores videos.
--   Supabase stores course metadata.
--   Default courses can store base price and validity.
--   Variants/bundles store selected content composition only.
--   Offers (added later) will store negotiated price and validity.
--   Payments (added later) will unlock access.
--
-- This migration:
--   1. Adds pricing + validity columns to master_courses (safe, additive).
--   2. Aligns pricing_model CHECK constraints across master_courses,
--      course_variants, and course_bundles to a shared set of values.
--   3. Migrates any 'subscription' values to 'subscription_ready'.
--   4. Does NOT create TPStreams folders, assets, or API calls.
--   5. Does NOT break existing rows.
--   6. Does NOT modify old migrations.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Add pricing + validity columns to master_courses
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.master_courses
  ADD COLUMN IF NOT EXISTS pricing_model      text,
  ADD COLUMN IF NOT EXISTS base_price         numeric(12,2),
  ADD COLUMN IF NOT EXISTS selling_price      numeric(12,2),
  ADD COLUMN IF NOT EXISTS discounted_price   numeric(12,2),
  ADD COLUMN IF NOT EXISTS internal_cost      numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency           text          NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS default_validity_days integer,
  ADD COLUMN IF NOT EXISTS is_free            boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_invite_only     boolean       NOT NULL DEFAULT false;

-- Add CHECK constraints for master_courses (only if not already present)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_courses_pricing_model_check'
      AND conrelid = 'public.master_courses'::regclass
  ) THEN
    ALTER TABLE public.master_courses
      ADD CONSTRAINT master_courses_pricing_model_check
      CHECK (pricing_model IS NULL OR pricing_model IN (
        'one_time', 'subscription_ready', 'per_seat', 'free', 'invite_only'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_courses_base_price_non_negative'
      AND conrelid = 'public.master_courses'::regclass
  ) THEN
    ALTER TABLE public.master_courses
      ADD CONSTRAINT master_courses_base_price_non_negative
      CHECK (base_price IS NULL OR base_price >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_courses_selling_price_non_negative'
      AND conrelid = 'public.master_courses'::regclass
  ) THEN
    ALTER TABLE public.master_courses
      ADD CONSTRAINT master_courses_selling_price_non_negative
      CHECK (selling_price IS NULL OR selling_price >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_courses_discounted_price_non_negative'
      AND conrelid = 'public.master_courses'::regclass
  ) THEN
    ALTER TABLE public.master_courses
      ADD CONSTRAINT master_courses_discounted_price_non_negative
      CHECK (discounted_price IS NULL OR discounted_price >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_courses_internal_cost_non_negative'
      AND conrelid = 'public.master_courses'::regclass
  ) THEN
    ALTER TABLE public.master_courses
      ADD CONSTRAINT master_courses_internal_cost_non_negative
      CHECK (internal_cost IS NULL OR internal_cost >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_courses_validity_days_positive'
      AND conrelid = 'public.master_courses'::regclass
  ) THEN
    ALTER TABLE public.master_courses
      ADD CONSTRAINT master_courses_validity_days_positive
      CHECK (default_validity_days IS NULL OR default_validity_days > 0);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Align pricing_model constraint on course_variants
-- ═══════════════════════════════════════════════════════════════════════════════

-- Step 2a: Drop ALL existing pricing_model CHECK constraints on course_variants
-- FIRST, before updating values, so the UPDATE doesn't violate the old constraint.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
      AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.course_variants'::regclass
      AND con.contype = 'c'
      AND att.attname = 'pricing_model'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.course_variants DROP CONSTRAINT %I',
      r.conname
    );
  END LOOP;
END $$;

-- Step 2b: Migrate any 'subscription' values to 'subscription_ready'
UPDATE public.course_variants
  SET pricing_model = 'subscription_ready'
  WHERE pricing_model = 'subscription';

-- Step 2c: Add unified constraint
ALTER TABLE public.course_variants
  ADD CONSTRAINT course_variants_pricing_model_check
  CHECK (pricing_model IS NULL OR pricing_model IN (
    'one_time', 'subscription_ready', 'per_seat', 'free', 'invite_only'
  ));

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Align pricing_model constraint on course_bundles
-- ═══════════════════════════════════════════════════════════════════════════════

-- Step 3a: Drop ALL existing pricing_model CHECK constraints on course_bundles
-- FIRST, before updating values.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
      AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.course_bundles'::regclass
      AND con.contype = 'c'
      AND att.attname = 'pricing_model'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.course_bundles DROP CONSTRAINT %I',
      r.conname
    );
  END LOOP;
END $$;

-- Step 3b: Migrate any 'subscription' values to 'subscription_ready'
UPDATE public.course_bundles
  SET pricing_model = 'subscription_ready'
  WHERE pricing_model = 'subscription';

-- Step 3c: Add unified constraint
ALTER TABLE public.course_bundles
  ADD CONSTRAINT course_bundles_pricing_model_check
  CHECK (pricing_model IS NULL OR pricing_model IN (
    'one_time', 'subscription_ready', 'per_seat', 'free', 'invite_only'
  ));

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: Backfill defaults on master_courses
-- ═══════════════════════════════════════════════════════════════════════════════

-- Set pricing_model to 'one_time' only where currently NULL
UPDATE public.master_courses
  SET pricing_model = 'one_time'
  WHERE pricing_model IS NULL;

COMMIT;

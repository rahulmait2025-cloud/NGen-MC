-- ─── 00304: Enable note_collection coupons ─────────────────────────────────────
-- After 00303 adds 'note_collection' to the enum, this migration:
--   A. Updates campus_ambassador_settings default to include note_collection
--   B. Backfills existing campus_ambassador_settings rows
--   C. Backfills existing campus_ambassador coupons
--   Does NOT touch official/superadmin coupons (opt-in only).
-- ────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- A. Update campus_ambassador_settings column default
ALTER TABLE public.campus_ambassador_settings
  ALTER COLUMN applicable_entity_types SET DEFAULT ARRAY[
    'course_variant'::public.sellable_entity_type,
    'course_bundle'::public.sellable_entity_type,
    'master_course'::public.sellable_entity_type,
    'job_ready_bootcamp'::public.sellable_entity_type,
    'paid_mentorship_booking'::public.sellable_entity_type,
    'note_collection'::public.sellable_entity_type
  ];

-- B. Backfill existing campus_ambassador_settings rows
UPDATE public.campus_ambassador_settings
SET applicable_entity_types = array_append(
  applicable_entity_types,
  'note_collection'::public.sellable_entity_type
)
WHERE NOT (
  'note_collection'::public.sellable_entity_type = ANY(applicable_entity_types)
);

-- C. Backfill existing campus ambassador coupons
UPDATE public.coupons
SET applicable_entity_types = array_append(
  applicable_entity_types,
  'note_collection'::public.sellable_entity_type
)
WHERE coupon_origin = 'campus_ambassador'
  AND NOT (
    'note_collection'::public.sellable_entity_type = ANY(applicable_entity_types)
  );

COMMIT;

-- ─── 00303: Add note_collection to sellable_entity_type enum ───────────────────
-- Extends the existing sellable_entity_type enum to include 'note_collection'.
-- This unblocks coupons.applicable_entity_types from accepting note_collection.
-- Must run BEFORE 00304 which uses this value.
-- ────────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.sellable_entity_type ADD VALUE IF NOT EXISTS 'note_collection';

-- Migration 00154: Phase 7 Access Audit — Missing Performance Indexes
--
-- Audit findings:
--   student_entitlements has (student_id), (master_course_id), (student_id, status), (college_id)
--   but NO index covering (student_id, source_type, valid_until) or (student_id, status, valid_until).
--   These are critical for purchased-courses queries and active entitlement checks.
--
--   master_course_items has (master_course_id) but NOT (video_asset_id).
--   Without this, resolveAccessibleVideoAsset → master_course_items join is slow.
--
--   student_content_entitlements, course_variant_items, video_assets all have adequate coverage.
--   No new indexes needed for those tables.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Composite index for purchased-courses query:
--    WHERE student_id = ? AND source_type = 'b2c_direct' AND valid_until > now()
--    Existing idx_student_entitlements_status covers (student_id, status) only.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_student_entitlements_source_valid
  ON public.student_entitlements (student_id, source_type, valid_until);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Composite index for general active entitlement lookups:
--    WHERE student_id = ? AND status = 'active' AND valid_until > now()
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_student_entitlements_status_valid
  ON public.student_entitlements (student_id, status, valid_until);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Support resolveAccessibleVideoAsset → master_course_items join
--    WHERE video_asset_id = ? (currently only has master_course_id index)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_master_course_items_video_asset_id
  ON public.master_course_items (video_asset_id);

COMMIT;

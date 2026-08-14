-- ================================================================
-- Performance Indexes: Missing indexes identified via application
-- query pattern audit against Vercel React Best Practices.
--
-- Targets: content_assignments composites, bundle/variant/module
-- FK indexes, video_assets coverage, publish_status for sidebar
-- metrics, email_campaign_recipients, and engagement tables.
-- ================================================================

-- ================================================================
-- PRIORITY 1: Content Assignments composites
-- Heavily queried in entitlement resolution, catalog access, and
-- assignment management across 10+ service files.
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_content_assignments_entity_status
  ON public.content_assignments (assigned_entity_type, assigned_entity_id, status);

CREATE INDEX IF NOT EXISTS idx_content_assignments_target_entity_status
  ON public.content_assignments (assignment_type, target_id, assigned_entity_type, status);

-- ================================================================
-- PRIORITY 2: Bundle/Variant/Module FK indexes
-- Queried on virtually every LMS page load for catalog resolution.
-- ================================================================

-- bundle_items.bundle_id: Used in bundle detail pages and catalog
-- resolution (course-bundles.ts, catalog-effective-access.ts)
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id
  ON public.bundle_items (bundle_id);

-- master_course_modules.master_course_id: Used in course structure
-- loading (master-course-structure.ts, master-courses.ts)
CREATE INDEX IF NOT EXISTS idx_master_course_modules_master_course_id
  ON public.master_course_modules (master_course_id);

-- master_course_items with sort_order: Used in course item listing
CREATE INDEX IF NOT EXISTS idx_master_course_items_course_sort
  ON public.master_course_items (master_course_id, sort_order);

-- course_variant_items with sort_order: Used in variant resolution
CREATE INDEX IF NOT EXISTS idx_course_variant_items_variant_sort
  ON public.course_variant_items (course_variant_id, sort_order);

-- ================================================================
-- PRIORITY 3: Video assets indexes
-- Used in sync, webhook, and analytics flows.
-- ================================================================

-- video_assets.tp_asset_id: Used in webhook processing
CREATE INDEX IF NOT EXISTS idx_video_assets_tp_asset_id
  ON public.video_assets (tp_asset_id);

-- video_assets.processing_status: Used in tpstreams analytics dashboard
CREATE INDEX IF NOT EXISTS idx_video_assets_processing_status
  ON public.video_assets (processing_status);

-- video_assets composite for module + sync_status
CREATE INDEX IF NOT EXISTS idx_video_assets_module_sync
  ON public.video_assets (master_course_module_id, sync_status)
  WHERE sync_status = 'active';

-- video_assets composite for master_course_id + sync_status
CREATE INDEX IF NOT EXISTS idx_video_assets_course_sync
  ON public.video_assets (master_course_id, sync_status);

-- ================================================================
-- PRIORITY 4: Publish/status indexes for sidebar metrics
-- Count queries on every page via sidebar-metrics.ts.
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_colleges_status
  ON public.colleges (status);

CREATE INDEX IF NOT EXISTS idx_master_courses_publish_status
  ON public.master_courses (publish_status);

CREATE INDEX IF NOT EXISTS idx_course_variants_publish_status
  ON public.course_variants (publish_status);

CREATE INDEX IF NOT EXISTS idx_course_bundles_publish_status
  ON public.course_bundles (publish_status);

-- ================================================================
-- PRIORITY 5: Email campaign recipients
-- Used in recipients.ts, outbox.ts, webhooks/ingest.ts
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign_id
  ON public.email_campaign_recipients (campaign_id);

-- ================================================================
-- PRIORITY 6: Student engagement tables
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_student_lesson_notes_master_course_id
  ON public.student_lesson_notes (master_course_id);

CREATE INDEX IF NOT EXISTS idx_student_lesson_bookmarks_master_course_id
  ON public.student_lesson_bookmarks (master_course_id);

-- ================================================================
-- PRIORITY 7: Dashboard/ops page performance
-- ================================================================

-- students.placement_ready_status: Used in ops-pages.ts
CREATE INDEX IF NOT EXISTS idx_students_placement_ready_updated
  ON public.students (placement_ready_status, updated_at DESC)
  WHERE placement_ready_status IS NOT NULL;

-- college_memberships.status + created_at: Used in dashboard queries
CREATE INDEX IF NOT EXISTS idx_college_memberships_status_created
  ON public.college_memberships (status, created_at DESC);

-- tpstreams_webhook_logs processed_success + received_at composite
CREATE INDEX IF NOT EXISTS idx_tpstreams_webhook_logs_processed_received
  ON public.tpstreams_webhook_logs (processed_success, received_at DESC);

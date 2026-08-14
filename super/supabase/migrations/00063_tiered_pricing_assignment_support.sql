-- Phase 5 — tiered pricing, assignments, entitlements (additive)
--
-- Clarifies live assignment rows vs materialized entitlements; adds composite indexes
-- for admin queries and verification. No new tables (00059 schema is sufficient).

comment on table public.tiered_price_records is
  'Commercial price rows for live tiered course_variant or bundle identities. History preserved via state (draft/scheduled/active/expired/superseded); overlapping active windows should be avoided in app logic.';

comment on table public.tiered_assignments is
  'Super-admin audience assignment of a live published bundle or course_variant. Points at live assignable rows (not bundle revision snapshots). Entitlements are materialized rows derived from current live composition and rebuildable via sync.';

comment on table public.tiered_entitlements is
  'Materialized learner access for the tiered catalog (assignment/purchase/manual_grant). Phase 5: assignment-sourced rows are internal/admin-only; global_course_enrollments remains canonical runtime for global courses.';

comment on table public.tiered_entitlement_assets is
  'Flattened content_asset grants per entitlement, rebuilt on assignment sync from live bundle/variant composition; unique (entitlement_id, content_asset_id).';

create index if not exists idx_tiered_price_records_target_state_effective
  on public.tiered_price_records (target_type, target_id, state, effective_from);

create index if not exists idx_tiered_assignments_assignable_status
  on public.tiered_assignments (assignable_type, assignable_id, status);

create index if not exists idx_tiered_entitlements_student_status_access
  on public.tiered_entitlements (student_id, status, access_starts_at, access_ends_at);

create index if not exists idx_tiered_entitlement_assets_entitlement_asset
  on public.tiered_entitlement_assets (entitlement_id, content_asset_id);

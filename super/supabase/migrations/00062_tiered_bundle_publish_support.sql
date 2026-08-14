-- Tiered bundle publish support (Phase 4) — documentation + query-friendly index only.
-- Live composition: tiered_bundles + tiered_bundle_draft_items (mutable by Super Admin).
-- Publish artifact: tiered_bundle_versions + tiered_bundle_version_assets (flattened, deduplicated assets).

comment on table public.tiered_bundles is
  'Commercial bundle container. Phase 4: live draft items may reference course variants and/or content assets; publish writes a flattened deduplicated snapshot to tiered_bundle_version_assets (no nested bundles). Super Admin only.';

comment on table public.tiered_bundle_draft_items is
  'Live editable bundle composition. Phase 4: item_type in (course_variant, content_asset) only; on publish, composition is resolved via live tiered_course_variant_assets (not variant revisions), deduped by content_asset_id, first-seen order.';

comment on table public.tiered_bundle_versions is
  'Append-only publish snapshots for bundles. Each publish inserts a new revision_no; tiered_bundle_version_assets stores the flat resolved asset list for audit and future runtime.';

comment on table public.tiered_bundle_version_assets is
  'Flattened unique content assets for one bundle revision. Lineage: source_bundle_id, optional source_variant_id (if asset came through a variant), optional source_master_course_id; metadata may record via=direct|variant.';

-- Speeds “latest revision per bundle” lookups (publish + verify).
create index if not exists idx_tiered_bundle_versions_bundle_revision_desc
  on public.tiered_bundle_versions (bundle_id, revision_no desc);

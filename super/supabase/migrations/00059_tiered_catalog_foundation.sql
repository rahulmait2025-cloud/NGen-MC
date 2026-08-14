-- Tiered catalog foundation (Phase 1 — additive only)
--
-- This migration introduces parallel catalog tables for a future workflow:
--   content assets → master courses → course variants → bundles → assignments → entitlements
--
-- IMPORTANT (read before using):
-- - This schema is additive. It does NOT replace public.global_courses or related runtime yet.
-- - Existing student, college-admin, purchase, and RPC flows remain unchanged; no data backfill.
-- - public.global_course_enrollments remains the compatibility learner-access path until later phases.
-- - Published bundle / variant *live* rows are mutable by Super Admin only (enforced in app + RLS here:
--   only superadmin policies on these tables for Phase 1). Colleges and students cannot mutate structure.
-- - Every publish or structural edit that should be auditable should insert a snapshot row into
--   tiered_bundle_versions + tiered_bundle_version_assets (flattened asset resolution for audit,
--   analytics, and simpler rebuilds). Live draft composition stays in tiered_bundle_draft_items.
-- - No existing tables are dropped or behaviorally rewritten in this phase.

-- ─── 1) tiered_content_assets ─────────────────────────────────────────────────

create table public.tiered_content_assets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  asset_type text not null
    check (asset_type in (
      'video', 'article', 'quiz', 'assignment', 'resource', 'project', 'live_session', 'external', 'other'
    )),
  difficulty_level text
    check (difficulty_level is null or difficulty_level in ('beginner', 'intermediate', 'advanced')),
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'unpublished')),
  source_kind text,
  source_ref_id uuid,
  duration_seconds integer
    check (duration_seconds is null or duration_seconds >= 0),
  prerequisites jsonb not null default '[]'::jsonb
    check (jsonb_typeof(prerequisites) = 'array'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  lineage jsonb not null default '{}'::jsonb
    check (jsonb_typeof(lineage) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tiered_content_assets is
  'Smallest reusable learning unit in the tiered catalog. Additive; does not replace global_course_lessons at runtime in Phase 1.';

create index if not exists idx_tiered_content_assets_publish_status
  on public.tiered_content_assets (publish_status);
create index if not exists idx_tiered_content_assets_asset_type
  on public.tiered_content_assets (asset_type);

drop trigger if exists trg_tiered_content_assets_updated_at on public.tiered_content_assets;
create trigger trg_tiered_content_assets_updated_at
  before update on public.tiered_content_assets
  for each row execute function public.set_updated_at();

-- ─── 2) tiered_master_courses ────────────────────────────────────────────────

create table public.tiered_master_courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  pillar text,
  program_tag text,
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'unpublished')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tiered_master_courses is
  'Logical grouping of reusable content assets (tiered catalog). Not the same row as public.global_courses.';

create index if not exists idx_tiered_master_courses_publish_status
  on public.tiered_master_courses (publish_status);
create index if not exists idx_tiered_master_courses_pillar
  on public.tiered_master_courses (pillar)
  where pillar is not null;

drop trigger if exists trg_tiered_master_courses_updated_at on public.tiered_master_courses;
create trigger trg_tiered_master_courses_updated_at
  before update on public.tiered_master_courses
  for each row execute function public.set_updated_at();

-- ─── 3) tiered_master_course_assets ──────────────────────────────────────────

create table public.tiered_master_course_assets (
  id uuid primary key default gen_random_uuid(),
  master_course_id uuid not null references public.tiered_master_courses (id) on delete cascade,
  content_asset_id uuid not null references public.tiered_content_assets (id) on delete cascade,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (master_course_id, content_asset_id)
);

comment on table public.tiered_master_course_assets is
  'Ordered map of reusable assets into a master course.';

create index if not exists idx_tiered_master_course_assets_master
  on public.tiered_master_course_assets (master_course_id);
create index if not exists idx_tiered_master_course_assets_asset
  on public.tiered_master_course_assets (content_asset_id);
create index if not exists idx_tiered_master_course_assets_master_sort
  on public.tiered_master_course_assets (master_course_id, sort_order);

-- ─── 4) tiered_course_variants ───────────────────────────────────────────────

create table public.tiered_course_variants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  source_master_course_id uuid references public.tiered_master_courses (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  visibility_scope text not null default 'private'
    check (visibility_scope in ('private', 'college', 'partner_network', 'public')),
  derived_from_variant_id uuid references public.tiered_course_variants (id) on delete set null,
  current_revision_no integer not null default 0
    check (current_revision_no >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tiered_course_variants is
  'Packaging layer: selected subsets of assets, optionally derived from another variant. Live rows editable by Super Admin only; revision snapshots deferred to later phases for variants.';

create index if not exists idx_tiered_course_variants_status
  on public.tiered_course_variants (status);
create index if not exists idx_tiered_course_variants_visibility
  on public.tiered_course_variants (visibility_scope);
create index if not exists idx_tiered_course_variants_source_master
  on public.tiered_course_variants (source_master_course_id)
  where source_master_course_id is not null;

drop trigger if exists trg_tiered_course_variants_updated_at on public.tiered_course_variants;
create trigger trg_tiered_course_variants_updated_at
  before update on public.tiered_course_variants
  for each row execute function public.set_updated_at();

-- ─── 5) tiered_course_variant_assets ─────────────────────────────────────────

create table public.tiered_course_variant_assets (
  id uuid primary key default gen_random_uuid(),
  course_variant_id uuid not null references public.tiered_course_variants (id) on delete cascade,
  content_asset_id uuid not null references public.tiered_content_assets (id) on delete cascade,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  inclusion_rule jsonb not null default '{}'::jsonb
    check (jsonb_typeof(inclusion_rule) = 'object'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (course_variant_id, content_asset_id)
);

comment on table public.tiered_course_variant_assets is
  'Selected reusable asset membership and order within a course variant.';

create index if not exists idx_tiered_course_variant_assets_variant
  on public.tiered_course_variant_assets (course_variant_id);
create index if not exists idx_tiered_course_variant_assets_asset
  on public.tiered_course_variant_assets (content_asset_id);
create index if not exists idx_tiered_course_variant_assets_variant_sort
  on public.tiered_course_variant_assets (course_variant_id, sort_order);

-- ─── 6) tiered_bundles ───────────────────────────────────────────────────────

create table public.tiered_bundles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  visibility_scope text not null default 'private'
    check (visibility_scope in ('private', 'college', 'partner_network', 'public')),
  is_discoverable boolean not null default false,
  is_publicly_purchasable boolean not null default false,
  derived_from_bundle_id uuid references public.tiered_bundles (id) on delete set null,
  current_published_revision_no integer not null default 0
    check (current_published_revision_no >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tiered_bundles is
  'Commercial bundle container; live composition in tiered_bundle_draft_items. Super Admin may edit published bundles in place; each auditable publish should snapshot into tiered_bundle_versions.';

create index if not exists idx_tiered_bundles_status
  on public.tiered_bundles (status);
create index if not exists idx_tiered_bundles_visibility
  on public.tiered_bundles (visibility_scope);
create index if not exists idx_tiered_bundles_discoverable
  on public.tiered_bundles (is_discoverable)
  where is_discoverable = true;
create index if not exists idx_tiered_bundles_public_purchase
  on public.tiered_bundles (is_publicly_purchasable)
  where is_publicly_purchasable = true;

drop trigger if exists trg_tiered_bundles_updated_at on public.tiered_bundles;
create trigger trg_tiered_bundles_updated_at
  before update on public.tiered_bundles
  for each row execute function public.set_updated_at();

-- ─── 7) tiered_bundle_draft_items ───────────────────────────────────────────

create table public.tiered_bundle_draft_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.tiered_bundles (id) on delete cascade,
  item_type text not null
    check (item_type in ('course_variant', 'content_asset')),
  course_variant_id uuid references public.tiered_course_variants (id) on delete cascade,
  content_asset_id uuid references public.tiered_content_assets (id) on delete cascade,
  sort_order integer not null default 0,
  inclusion_rule jsonb not null default '{}'::jsonb
    check (jsonb_typeof(inclusion_rule) = 'object'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tiered_bundle_draft_items_type_payload_chk check (
    (item_type = 'course_variant' and course_variant_id is not null and content_asset_id is null)
    or (item_type = 'content_asset' and content_asset_id is not null and course_variant_id is null)
  )
);

comment on table public.tiered_bundle_draft_items is
  'Live editable bundle composition (including while published). Nested bundles are not supported in Phase 1.';

create index if not exists idx_tiered_bundle_draft_items_bundle
  on public.tiered_bundle_draft_items (bundle_id);
create index if not exists idx_tiered_bundle_draft_items_type
  on public.tiered_bundle_draft_items (item_type);
create index if not exists idx_tiered_bundle_draft_items_bundle_sort
  on public.tiered_bundle_draft_items (bundle_id, sort_order);

drop trigger if exists trg_tiered_bundle_draft_items_updated_at on public.tiered_bundle_draft_items;
create trigger trg_tiered_bundle_draft_items_updated_at
  before update on public.tiered_bundle_draft_items
  for each row execute function public.set_updated_at();

-- ─── 8) tiered_bundle_versions ───────────────────────────────────────────────

create table public.tiered_bundle_versions (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.tiered_bundles (id) on delete cascade,
  revision_no integer not null
    check (revision_no >= 1),
  status text not null default 'published'
    check (status in ('draft', 'published', 'superseded', 'archived')),
  published_at timestamptz not null default now(),
  derived_from_bundle_version_id uuid references public.tiered_bundle_versions (id) on delete set null,
  change_summary text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bundle_id, revision_no)
);

comment on table public.tiered_bundle_versions is
  'Immutable-by-convention revision snapshots for bundle structure and pricing context. App should append rows on each publish/update audit event; live bundle remains editable by Super Admin.';

create index if not exists idx_tiered_bundle_versions_bundle
  on public.tiered_bundle_versions (bundle_id);
create index if not exists idx_tiered_bundle_versions_status
  on public.tiered_bundle_versions (status);
create index if not exists idx_tiered_bundle_versions_published_at
  on public.tiered_bundle_versions (published_at desc);

-- ─── 9) tiered_bundle_version_assets ─────────────────────────────────────────

create table public.tiered_bundle_version_assets (
  id uuid primary key default gen_random_uuid(),
  bundle_version_id uuid not null references public.tiered_bundle_versions (id) on delete cascade,
  content_asset_id uuid not null references public.tiered_content_assets (id) on delete cascade,
  source_bundle_id uuid references public.tiered_bundles (id) on delete set null,
  source_variant_id uuid references public.tiered_course_variants (id) on delete set null,
  source_master_course_id uuid references public.tiered_master_courses (id) on delete set null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (bundle_version_id, content_asset_id)
);

comment on table public.tiered_bundle_version_assets is
  'Flattened resolved content assets for a bundle revision snapshot (audit, analytics, simpler runtime rebuilds).';

create index if not exists idx_tiered_bundle_version_assets_version
  on public.tiered_bundle_version_assets (bundle_version_id);
create index if not exists idx_tiered_bundle_version_assets_asset
  on public.tiered_bundle_version_assets (content_asset_id);
create index if not exists idx_tiered_bundle_version_assets_version_sort
  on public.tiered_bundle_version_assets (bundle_version_id, sort_order);

-- ─── 10) tiered_price_records ─────────────────────────────────────────────────

create table public.tiered_price_records (
  id uuid primary key default gen_random_uuid(),
  target_type text not null
    check (target_type in ('course_variant', 'bundle')),
  target_id uuid not null,
  state text not null default 'draft'
    check (state in ('draft', 'scheduled', 'active', 'retired', 'superseded')),
  currency_code text not null default 'INR'
    check (currency_code ~ '^[A-Z]{3}$'),
  amount_minor integer not null
    check (amount_minor >= 0),
  display_price_label text,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint tiered_price_records_effective_window_chk check (
    effective_to is null or effective_to >= effective_from
  )
);

comment on table public.tiered_price_records is
  'Commercial price rows for tiered course variants or bundles. No linkage to global_courses.b2c_price_minor in Phase 1.';

create index if not exists idx_tiered_price_records_target
  on public.tiered_price_records (target_type, target_id);
create index if not exists idx_tiered_price_records_state
  on public.tiered_price_records (state);
create index if not exists idx_tiered_price_records_effective_from
  on public.tiered_price_records (effective_from);
create index if not exists idx_tiered_price_records_effective_to
  on public.tiered_price_records (effective_to);

-- ─── 11) tiered_assignments ─────────────────────────────────────────────────

create table public.tiered_assignments (
  id uuid primary key default gen_random_uuid(),
  assignable_type text not null
    check (assignable_type in ('bundle', 'course_variant')),
  assignable_id uuid not null,
  scope_type text not null
    check (scope_type in ('college', 'batch', 'group', 'student')),
  college_id uuid references public.colleges (id) on delete set null,
  scope_ref_id uuid,
  mode text not null default 'parallel'
    check (mode in ('parallel', 'exclusive', 'override')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'active', 'paused', 'ended', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tiered_assignments_window_chk check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

comment on table public.tiered_assignments is
  'Future audience-scoped assignment of a bundle or course variant. Additive to public.global_course_college_assignments; not used by runtime in Phase 1.';

create index if not exists idx_tiered_assignments_assignable
  on public.tiered_assignments (assignable_type, assignable_id);
create index if not exists idx_tiered_assignments_scope_type
  on public.tiered_assignments (scope_type);
create index if not exists idx_tiered_assignments_college
  on public.tiered_assignments (college_id)
  where college_id is not null;
create index if not exists idx_tiered_assignments_status
  on public.tiered_assignments (status);
create index if not exists idx_tiered_assignments_starts_at
  on public.tiered_assignments (starts_at);
create index if not exists idx_tiered_assignments_ends_at
  on public.tiered_assignments (ends_at);

drop trigger if exists trg_tiered_assignments_updated_at on public.tiered_assignments;
create trigger trg_tiered_assignments_updated_at
  before update on public.tiered_assignments
  for each row execute function public.set_updated_at();

-- ─── 12) tiered_entitlements ─────────────────────────────────────────────────

create table public.tiered_entitlements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  assignment_id uuid references public.tiered_assignments (id) on delete set null,
  source_type text not null
    check (source_type in ('assignment', 'purchase', 'manual_grant')),
  source_ref_id uuid,
  status text not null default 'active'
    check (status in ('active', 'pending', 'expired', 'revoked')),
  access_starts_at timestamptz,
  access_ends_at timestamptz,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tiered_entitlements_access_window_chk check (
    access_starts_at is null or access_ends_at is null or access_ends_at >= access_starts_at
  ),
  constraint tiered_entitlements_revoked_chk check (
    (status <> 'revoked') or (revoked_at is not null)
  )
);

comment on table public.tiered_entitlements is
  'Future learner-level access for the tiered catalog. public.global_course_enrollments remains canonical for global courses in Phase 1.';

create index if not exists idx_tiered_entitlements_student
  on public.tiered_entitlements (student_id);
create index if not exists idx_tiered_entitlements_assignment
  on public.tiered_entitlements (assignment_id)
  where assignment_id is not null;
create index if not exists idx_tiered_entitlements_status
  on public.tiered_entitlements (status);
create index if not exists idx_tiered_entitlements_access_starts
  on public.tiered_entitlements (access_starts_at);
create index if not exists idx_tiered_entitlements_access_ends
  on public.tiered_entitlements (access_ends_at);

drop trigger if exists trg_tiered_entitlements_updated_at on public.tiered_entitlements;
create trigger trg_tiered_entitlements_updated_at
  before update on public.tiered_entitlements
  for each row execute function public.set_updated_at();

-- ─── 13) tiered_entitlement_assets ───────────────────────────────────────────

create table public.tiered_entitlement_assets (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.tiered_entitlements (id) on delete cascade,
  content_asset_id uuid not null references public.tiered_content_assets (id) on delete cascade,
  source_bundle_id uuid references public.tiered_bundles (id) on delete set null,
  source_variant_id uuid references public.tiered_course_variants (id) on delete set null,
  source_assignment_id uuid references public.tiered_assignments (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (entitlement_id, content_asset_id)
);

comment on table public.tiered_entitlement_assets is
  'Flattened per-asset learner access derived from bundles/variants/assignments (future runtime).';

create index if not exists idx_tiered_entitlement_assets_entitlement
  on public.tiered_entitlement_assets (entitlement_id);
create index if not exists idx_tiered_entitlement_assets_asset
  on public.tiered_entitlement_assets (content_asset_id);

-- ─── RLS: Super Admin only (Phase 1 — no student/college runtime reads) ───────

alter table public.tiered_content_assets enable row level security;
alter table public.tiered_master_courses enable row level security;
alter table public.tiered_master_course_assets enable row level security;
alter table public.tiered_course_variants enable row level security;
alter table public.tiered_course_variant_assets enable row level security;
alter table public.tiered_bundles enable row level security;
alter table public.tiered_bundle_draft_items enable row level security;
alter table public.tiered_bundle_versions enable row level security;
alter table public.tiered_bundle_version_assets enable row level security;
alter table public.tiered_price_records enable row level security;
alter table public.tiered_assignments enable row level security;
alter table public.tiered_entitlements enable row level security;
alter table public.tiered_entitlement_assets enable row level security;

drop policy if exists tiered_content_assets_superadmin_all on public.tiered_content_assets;
create policy tiered_content_assets_superadmin_all on public.tiered_content_assets
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_master_courses_superadmin_all on public.tiered_master_courses;
create policy tiered_master_courses_superadmin_all on public.tiered_master_courses
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_master_course_assets_superadmin_all on public.tiered_master_course_assets;
create policy tiered_master_course_assets_superadmin_all on public.tiered_master_course_assets
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_course_variants_superadmin_all on public.tiered_course_variants;
create policy tiered_course_variants_superadmin_all on public.tiered_course_variants
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_course_variant_assets_superadmin_all on public.tiered_course_variant_assets;
create policy tiered_course_variant_assets_superadmin_all on public.tiered_course_variant_assets
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_bundles_superadmin_all on public.tiered_bundles;
create policy tiered_bundles_superadmin_all on public.tiered_bundles
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_bundle_draft_items_superadmin_all on public.tiered_bundle_draft_items;
create policy tiered_bundle_draft_items_superadmin_all on public.tiered_bundle_draft_items
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_bundle_versions_superadmin_all on public.tiered_bundle_versions;
create policy tiered_bundle_versions_superadmin_all on public.tiered_bundle_versions
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_bundle_version_assets_superadmin_all on public.tiered_bundle_version_assets;
create policy tiered_bundle_version_assets_superadmin_all on public.tiered_bundle_version_assets
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_price_records_superadmin_all on public.tiered_price_records;
create policy tiered_price_records_superadmin_all on public.tiered_price_records
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_assignments_superadmin_all on public.tiered_assignments;
create policy tiered_assignments_superadmin_all on public.tiered_assignments
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_entitlements_superadmin_all on public.tiered_entitlements;
create policy tiered_entitlements_superadmin_all on public.tiered_entitlements
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_entitlement_assets_superadmin_all on public.tiered_entitlement_assets;
create policy tiered_entitlement_assets_superadmin_all on public.tiered_entitlement_assets
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- Authenticated role: table privileges for future Super Admin tooling; RLS restricts to is_superadmin().
grant select, insert, update, delete on public.tiered_content_assets to authenticated;
grant select, insert, update, delete on public.tiered_master_courses to authenticated;
grant select, insert, update, delete on public.tiered_master_course_assets to authenticated;
grant select, insert, update, delete on public.tiered_course_variants to authenticated;
grant select, insert, update, delete on public.tiered_course_variant_assets to authenticated;
grant select, insert, update, delete on public.tiered_bundles to authenticated;
grant select, insert, update, delete on public.tiered_bundle_draft_items to authenticated;
grant select, insert, update, delete on public.tiered_bundle_versions to authenticated;
grant select, insert, update, delete on public.tiered_bundle_version_assets to authenticated;
grant select, insert, update, delete on public.tiered_price_records to authenticated;
grant select, insert, update, delete on public.tiered_assignments to authenticated;
grant select, insert, update, delete on public.tiered_entitlements to authenticated;
grant select, insert, update, delete on public.tiered_entitlement_assets to authenticated;

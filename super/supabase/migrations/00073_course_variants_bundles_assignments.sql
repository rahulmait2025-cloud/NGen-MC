-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00073: Course Variants / Bundles / Assignments (Phase 5)
--
-- Builds the packaging and enrollment layer ON TOP of the Master Course system.
-- References: master_courses, master_course_modules, master_course_items, video_assets
--
-- IMPORTANT:
-- - Fresh schema only. NO data migration from tiered_* tables.
-- - All packaging is reference-based (no content duplication).
-- - No TPStreams folder creation outside Master Course.
-- - Phase 4 runtime (student_entitlements, student_progress) continues unchanged.
--
-- Tables:
--   1. course_variants          — Packaged subsets of Master Courses
--   2. course_variant_items     — References to master course items within a variant
--   3. course_bundles           — Commercial bundle container
--   4. bundle_items             — Polymorphic references (variant/course/item)
--   5. content_assignments      — Distribution engine (college/batch/group/student)
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. course_variants ──────────────────────────────────────────────────────
-- A reusable packaged subset of a Master Course.
-- Inherits TPStreams assets, resources, curriculum metadata from parent.

create table public.course_variants (
  id uuid primary key default gen_random_uuid(),

  -- Parent course reference
  master_course_id uuid not null references public.master_courses (id) on delete cascade,

  -- Identity
  title text not null,
  slug text not null unique,
  code text not null unique,
  description text,

  -- Pricing placeholders (Phase 8 hooks only — not used yet)
  selling_price integer,              -- INR minor units (e.g., 99900 = ₹999)
  discounted_price integer,
  internal_cost integer,
  pricing_model text
    check (pricing_model is null or pricing_model in ('one_time', 'subscription', 'per_seat')),

  -- Publishing
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'unpublished')),

  -- Audit
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.course_variants is
  'Reusable packaged subset of a Master Course. Reference-based only — no content duplication. Super Admin management; students access via assignments.';

create index idx_course_variants_master_course on public.course_variants (master_course_id);
create index idx_course_variants_publish_status on public.course_variants (publish_status);
create index idx_course_variants_slug on public.course_variants (slug);
create index idx_course_variants_code on public.course_variants (code);

create trigger trg_course_variants_updated_at
  before update on public.course_variants
  for each row execute function public.set_updated_at();

-- ─── 2. course_variant_items ─────────────────────────────────────────────────
-- References to Master Course items (no duplication).

create table public.course_variant_items (
  id uuid primary key default gen_random_uuid(),

  course_variant_id uuid not null references public.course_variants (id) on delete cascade,
  master_course_item_id uuid not null references public.master_course_items (id) on delete cascade,

  sort_order integer not null default 0,
  inclusion_type text not null default 'selected_item'
    check (inclusion_type in ('full_module', 'selected_item')),

  created_at timestamptz not null default now(),

  -- Prevent duplicate item references within same variant
  unique (course_variant_id, master_course_item_id)
);

comment on table public.course_variant_items is
  'References to existing Master Course items within a variant. Purely relational — no content duplication.';

create index idx_course_variant_items_variant on public.course_variant_items (course_variant_id);
create index idx_course_variant_items_item on public.course_variant_items (master_course_item_id);
create index idx_course_variant_items_variant_sort on public.course_variant_items (course_variant_id, sort_order);

-- ─── 3. course_bundles ───────────────────────────────────────────────────────
-- A packaging layer containing multiple variants, courses, or items.
-- MUST NEVER create TPStreams folders.

create table public.course_bundles (
  id uuid primary key default gen_random_uuid(),

  -- Identity
  title text not null,
  slug text not null unique,
  code text not null unique,
  description text,

  -- Pricing placeholders (Phase 8 hooks only — not used yet)
  selling_price integer,
  discounted_price integer,
  internal_cost integer,
  pricing_model text
    check (pricing_model is null or pricing_model in ('one_time', 'subscription', 'per_seat')),

  -- Publishing
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'unpublished')),

  -- Lifecycle (commercial state machine)
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'active', 'expired', 'ended', 'archived')),

  -- Audit
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.course_bundles is
  'Commercial bundle container. Reference-only packaging — NO TPStreams folder creation. Super Admin management.';

create index idx_course_bundles_publish_status on public.course_bundles (publish_status);
create index idx_course_bundles_lifecycle_status on public.course_bundles (lifecycle_status);
create index idx_course_bundles_slug on public.course_bundles (slug);
create index idx_course_bundles_code on public.course_bundles (code);

create trigger trg_course_bundles_updated_at
  before update on public.course_bundles
  for each row execute function public.set_updated_at();

-- ─── 4. bundle_items ─────────────────────────────────────────────────────────
-- Polymorphic references: variant / master_course / master_course_item

create table public.bundle_items (
  id uuid primary key default gen_random_uuid(),

  bundle_id uuid not null references public.course_bundles (id) on delete cascade,

  -- Polymorphic reference
  item_type text not null
    check (item_type in ('variant', 'master_course', 'master_course_item')),
  reference_id uuid not null,  -- FK target depends on item_type

  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.bundle_items is
  'Polymorphic bundle composition: variants, master courses, or individual items. Reference-only — no content duplication.';

create index idx_bundle_items_bundle on public.bundle_items (bundle_id);
create index idx_bundle_items_type on public.bundle_items (item_type);
create index idx_bundle_items_reference on public.bundle_items (reference_id);
create index idx_bundle_items_bundle_sort on public.bundle_items (bundle_id, sort_order);

-- ─── 5. content_assignments ──────────────────────────────────────────────────
-- Distribution engine: assigns variants/bundles/courses to colleges/batches/groups/students.
-- Creates entitlement records automatically on assignment.

create table public.content_assignments (
  id uuid primary key default gen_random_uuid(),

  -- Target audience
  assignment_type text not null
    check (assignment_type in ('college', 'batch', 'group', 'student')),
  target_id uuid not null,  -- college_id / batch_id / group_id / student_id

  -- What is being assigned
  assigned_entity_type text not null
    check (assigned_entity_type in ('variant', 'bundle', 'master_course')),
  assigned_entity_id uuid not null,  -- course_variant_id / course_bundle_id / master_course_id

  -- Scheduling
  start_date timestamptz,
  end_date timestamptz,

  -- Status
  status text not null default 'active'
    check (status in ('active', 'scheduled', 'expired', 'revoked')),

  -- Audit
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Validation: end must be >= start if both present
  constraint content_assignments_window_chk check (
    start_date is null or end_date is null or end_date >= start_date
  )
);

comment on table public.content_assignments is
  'Distribution engine: assigns packaged content (variants/bundles/courses) to target audiences. Auto-generates student entitlement records.';

create index idx_content_assignments_target on public.content_assignments (assignment_type, target_id);
create index idx_content_assignments_entity on public.content_assignments (assigned_entity_type, assigned_entity_id);
create index idx_content_assignments_status on public.content_assignments (status);
create index idx_content_assignments_start_date on public.content_assignments (start_date);
create index idx_content_assignments_end_date on public.content_assignments (end_date);

create trigger trg_content_assignments_updated_at
  before update on public.content_assignments
  for each row execute function public.set_updated_at();

-- ─── RLS Policies ────────────────────────────────────────────────────────────
-- Phase 5: Super Admin full access; Students read-only own accessible data.

alter table public.course_variants enable row level security;
alter table public.course_variant_items enable row level security;
alter table public.course_bundles enable row level security;
alter table public.bundle_items enable row level security;
alter table public.content_assignments enable row level security;

-- SuperAdmin: full CRUD on all Phase 5 tables
drop policy if exists course_variants_superadmin_all on public.course_variants;
create policy course_variants_superadmin_all on public.course_variants
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists course_variant_items_superadmin_all on public.course_variant_items;
create policy course_variant_items_superadmin_all on public.course_variant_items
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists course_bundles_superadmin_all on public.course_bundles;
create policy course_bundles_superadmin_all on public.course_bundles
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists bundle_items_superadmin_all on public.bundle_items;
create policy bundle_items_superadmin_all on public.bundle_items
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists content_assignments_superadmin_all on public.content_assignments;
create policy content_assignments_superadmin_all on public.content_assignments
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Students: read-only access to their accessible variants/bundles/assignments
-- (via entitlement resolution — not direct table reads in Phase 5)
-- RLS for student reads will be expanded when LMS runtime integration is complete.

-- ─── Grants ──────────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.course_variants to authenticated;
grant select, insert, update, delete on public.course_variant_items to authenticated;
grant select, insert, update, delete on public.course_bundles to authenticated;
grant select, insert, update, delete on public.bundle_items to authenticated;
grant select, insert, update, delete on public.content_assignments to authenticated;

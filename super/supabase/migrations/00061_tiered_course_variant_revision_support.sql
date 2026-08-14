-- Tiered course variant revision support (Phase 3)
--
-- Live tiered_course_variants + tiered_course_variant_assets remain the editable composition
-- Super Admin uses for catalog work. tiered_course_variant_revisions (+ _revision_assets) are
-- append-only audit snapshots taken on each publish (including re-publish after editing a
-- published variant). No student or college runtime reads these tables in Phase 3.

comment on table public.tiered_course_variants is
  'Packaging layer: selected subsets of tiered content assets. Live row is the editable identity; Phase 3 adds tiered_course_variant_revisions for publish/edit audit snapshots. Super Admin only.';

-- ─── tiered_course_variant_revisions ─────────────────────────────────────────

create table public.tiered_course_variant_revisions (
  id uuid primary key default gen_random_uuid(),
  course_variant_id uuid not null references public.tiered_course_variants (id) on delete cascade,
  revision_no integer not null
    check (revision_no >= 1),
  status text not null default 'published'
    check (status in ('draft', 'published', 'superseded', 'archived')),
  published_at timestamptz not null default now(),
  change_summary text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (course_variant_id, revision_no)
);

comment on table public.tiered_course_variant_revisions is
  'Immutable audit snapshots of a course variant at publish time. Created on first publish and on every subsequent publish while live assets/metadata may still be edited in tiered_course_variants.';

create index if not exists idx_tiered_course_variant_revisions_variant
  on public.tiered_course_variant_revisions (course_variant_id);
create index if not exists idx_tiered_course_variant_revisions_published_at
  on public.tiered_course_variant_revisions (published_at desc);
create index if not exists idx_tiered_course_variant_revisions_status
  on public.tiered_course_variant_revisions (status);

-- ─── tiered_course_variant_revision_assets ───────────────────────────────────

create table public.tiered_course_variant_revision_assets (
  id uuid primary key default gen_random_uuid(),
  course_variant_revision_id uuid not null references public.tiered_course_variant_revisions (id) on delete cascade,
  content_asset_id uuid not null references public.tiered_content_assets (id) on delete cascade,
  source_master_course_id uuid references public.tiered_master_courses (id) on delete set null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (course_variant_revision_id, content_asset_id)
);

comment on table public.tiered_course_variant_revision_assets is
  'Flattened ordered asset list for one course variant revision snapshot (audit / future rebuild).';

create index if not exists idx_tiered_cv_revision_assets_revision
  on public.tiered_course_variant_revision_assets (course_variant_revision_id);
create index if not exists idx_tiered_cv_revision_assets_asset
  on public.tiered_course_variant_revision_assets (content_asset_id);
create index if not exists idx_tiered_cv_revision_assets_revision_sort
  on public.tiered_course_variant_revision_assets (course_variant_revision_id, sort_order);

-- ─── RLS + grants (Super Admin only, consistent with Phase 1 tiered tables) ─

alter table public.tiered_course_variant_revisions enable row level security;
alter table public.tiered_course_variant_revision_assets enable row level security;

drop policy if exists tiered_course_variant_revisions_superadmin_all on public.tiered_course_variant_revisions;
create policy tiered_course_variant_revisions_superadmin_all on public.tiered_course_variant_revisions
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists tiered_course_variant_revision_assets_superadmin_all on public.tiered_course_variant_revision_assets;
create policy tiered_course_variant_revision_assets_superadmin_all on public.tiered_course_variant_revision_assets
  for all using (public.is_superadmin()) with check (public.is_superadmin());

grant select, insert, update, delete on public.tiered_course_variant_revisions to authenticated;
grant select, insert, update, delete on public.tiered_course_variant_revision_assets to authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00070: master_courses + video_assets (TPStreams-centered LMS)
-- Phase 2B — Replaces legacy Supabase-first course architecture.
--
-- Rules enforced at application layer:
--   1. ONLY Master Course creation triggers TPStreams folder creation.
--   2. Bundles NEVER create TPStreams folders.
--   3. Variants NEVER create TPStreams folders.
--   4. Assignments/Entitlements NEVER create TPStreams folders.
--
-- Supabase remains the storage layer for non-video assets:
--   PDFs, notes, worksheets, attachments, assignments, downloadable resources.
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1) master_courses ───────────────────────────────────────────────────────

create table public.master_courses (
  id uuid primary key default gen_random_uuid(),

  -- Core identification
  code text not null unique,
  title text not null,
  description text,
  short_description text,
  pillar text,
  program_tag text,

  -- Publish control
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'unpublished')),

  -- Logical module structure (stored as JSON for flexibility)
  -- Format: [{ "id": string, "title": string, "description": string, "sort_order": number }]
  modules jsonb not null default '[]'::jsonb
    check (jsonb_typeof(modules) = 'array'),

  -- ─── TPStreams sync fields ──────────────────────────────────────────────────

  -- Folder creation status: 'pending' | 'created' | 'failed'
  tp_folder_status text not null default 'pending'
    check (tp_folder_status in ('pending', 'created', 'failed')),

  -- The TPStreams folder UUID returned by the Folders API
  tp_folder_uuid text unique,

  -- The title used when creating the TPStreams folder
  tp_folder_title text,

  -- Last successful sync timestamp
  tp_last_synced_at timestamptz,

  -- Last error message from TPStreams API (if tp_folder_status = 'failed')
  tp_last_error text,

  -- ─── Metadata ───────────────────────────────────────────────────────────────

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.master_courses is
  'Master Course definitions. Each Master Course creates exactly one TPStreams folder on creation. This is the ONLY entity that creates TPStreams folders.';

comment on column public.master_courses.tp_folder_status is
  'Tracks TPStreams folder sync state: pending (not yet created), created (folder exists), failed (creation failed, see tp_last_error).';

comment on column public.master_courses.tp_folder_uuid is
  'UUID of the dedicated TPStreams folder for this course. Set only once during creation. Never changed.';

comment on column public.master_courses.modules is
  'Logical module structure for course organization. Does NOT map to TPStreams sub-folders — purely metadata for UI ordering.';

-- Indexes
create index if not exists idx_master_courses_publish_status
  on public.master_courses (publish_status);

create index if not exists idx_master_courses_pillar
  on public.master_courses (pillar)
  where pillar is not null;

create index if not exists idx_master_courses_code
  on public.master_courses (code);

create index if not exists idx_master_courses_tp_folder_status
  on public.master_courses (tp_folder_status)
  where tp_folder_status != 'created';

-- Trigger: updated_at
drop trigger if exists trg_master_courses_updated_at on public.master_courses;
create trigger trg_master_courses_updated_at
  before update on public.master_courses
  for each row execute function public.set_updated_at();

-- ─── 2) video_assets ─────────────────────────────────────────────────────────

create table public.video_assets (
  id uuid primary key default gen_random_uuid(),

  -- FK to parent Master Course
  master_course_id uuid not null references public.master_courses (id) on delete cascade,

  -- TPStreams asset identifiers
  tp_asset_id text not null unique,
  tp_folder_uuid text not null,

  -- Asset metadata (mirrored from TPStreams API)
  title text not null,
  description text,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'queued', 'processing', 'completed', 'error')),
  duration_seconds integer,
  thumbnail_url text,
  playback_url text,
  dash_url text,
  content_protection_type text
    check (content_protection_type in ('drm', 'aes', 'disable')),

  -- Resolution information
  resolutions text[],

  -- Video/audio codec info
  video_codec text,
  audio_codec text,

  -- Module mapping: which logical module does this video belong to?
  module_id text,

  -- Sort order within the module
  sort_order integer not null default 0,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.video_assets is
  'Video assets registered against Master Courses via TPStreams. Each row represents one TPStreams video asset.';

comment on column public.video_assets.module_id is
  'References the module ID from master_courses.modules[]. Purely for logical grouping — does not create TPStreams sub-folders.';

-- Indexes
create index if not exists idx_video_assets_master_course
  on public.video_assets (master_course_id);

create index if not exists idx_video_assets_tp_asset
  on public.video_assets (tp_asset_id);

create index if not exists idx_video_assets_processing_status
  on public.video_assets (processing_status)
  where processing_status != 'completed';

create index if not exists idx_video_assets_module
  on public.video_assets (master_course_id, module_id, sort_order);

-- Trigger: updated_at
drop trigger if exists trg_video_assets_updated_at on public.video_assets;
create trigger trg_video_assets_updated_at
  before update on public.video_assets
  for each row execute function public.set_updated_at();

-- ─── 3) RLS Policies ─────────────────────────────────────────────────────────

alter table public.master_courses enable row level security;
alter table public.video_assets enable row level security;

-- Master Courses: SuperAdmin full control
drop policy if exists master_courses_superadmin_all on public.master_courses;
create policy master_courses_superadmin_all on public.master_courses
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'superadmin'
        and p.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'superadmin'
        and p.is_active = true
    )
  );

-- Master Courses: College admin read-only (for assigned courses)
drop policy if exists master_courses_college_admin_read on public.master_courses;
create policy master_courses_college_admin_read on public.master_courses
  for select
  to authenticated
  using (
    publish_status = 'published'
  );

-- Video Assets: SuperAdmin full control
drop policy if exists video_assets_superadmin_all on public.video_assets;
create policy video_assets_superadmin_all on public.video_assets
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'superadmin'
        and p.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'superadmin'
        and p.is_active = true
    )
  );

-- Video Assets: College admin read-only (for published courses)
drop policy if exists video_assets_college_admin_read on public.video_assets;
create policy video_assets_college_admin_read on public.video_assets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.master_courses mc
      where mc.id = video_assets.master_course_id
        and mc.publish_status = 'published'
    )
  );

-- ─── 4) Grants ────────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.master_courses to authenticated;
grant select, insert, update, delete on public.video_assets to authenticated;
grant usage, select on all sequences in schema public to authenticated;

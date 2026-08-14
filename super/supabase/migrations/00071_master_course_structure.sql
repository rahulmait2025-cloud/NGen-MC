-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00071: master_course_structure (Phase 3)
-- Introduces relational modules and items for Master Course composition.
--
-- Rules enforced:
-- 1. Master Course remains the ONLY entity owning a TPStreams folder.
-- 2. New relational structure replaces jsonb 'modules'.
-- 3. Provision 'course_resources' storage bucket for non-video resources.
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── Storage Bucket ───────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('course_resources', 'course_resources', false)
on conflict (id) do nothing;

create policy "SuperAdmin full access course_resources"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'course_resources' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true
    )
  )
  with check (
    bucket_id = 'course_resources' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true
    )
  );

create policy "Authenticated read access course_resources"
  on storage.objects for select to authenticated
  using ( bucket_id = 'course_resources' );

-- ─── master_course_modules ────────────────────────────────────────────────────

create table public.master_course_modules (
  id uuid primary key default gen_random_uuid(),
  master_course_id uuid not null references public.master_courses (id) on delete cascade,
  title text not null,
  description text,
  slug text,
  sort_order integer not null default 0,
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'unpublished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_master_course_modules_course on public.master_course_modules (master_course_id);
create index idx_master_course_modules_sort on public.master_course_modules (master_course_id, sort_order);

create trigger trg_master_course_modules_updated_at
  before update on public.master_course_modules
  for each row execute function public.set_updated_at();

-- ─── master_course_items ──────────────────────────────────────────────────────

create table public.master_course_items (
  id uuid primary key default gen_random_uuid(),
  master_course_id uuid not null references public.master_courses (id) on delete cascade,
  module_id uuid not null references public.master_course_modules (id) on delete cascade,
  title text not null,
  description text,
  item_type text not null
    check (item_type in ('video', 'document', 'resource', 'assignment_placeholder', 'quiz_placeholder', 'link', 'note', 'worksheet')),
  sort_order integer not null default 0,
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'unpublished')),
  
  -- Reference to TPStreams video asset
  video_asset_id uuid references public.video_assets (id) on delete set null,
  
  preview_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
    
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_master_course_items_module on public.master_course_items (module_id);
create index idx_master_course_items_sort on public.master_course_items (module_id, sort_order);
create index idx_master_course_items_video on public.master_course_items (video_asset_id);

create trigger trg_master_course_items_updated_at
  before update on public.master_course_items
  for each row execute function public.set_updated_at();

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

alter table public.master_course_modules enable row level security;
alter table public.master_course_items enable row level security;

-- SuperAdmin all access
create policy modules_superadmin_all on public.master_course_modules
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true));

create policy items_superadmin_all on public.master_course_items
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true));

-- College admin read (if published)
create policy modules_college_admin_read on public.master_course_modules
  for select to authenticated
  using (publish_status = 'published');

create policy items_college_admin_read on public.master_course_items
  for select to authenticated
  using (publish_status = 'published');

-- Grants
grant select, insert, update, delete on public.master_course_modules to authenticated;
grant select, insert, update, delete on public.master_course_items to authenticated;

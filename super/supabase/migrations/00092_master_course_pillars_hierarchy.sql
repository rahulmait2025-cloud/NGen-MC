-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00092: master_course_pillars_hierarchy
-- Introduces a 3-level TPStreams hierarchy: Pillar -> Course -> Module.
-- Includes backfill for existing pillars.
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1) master_course_pillars ──────────────────────────────────────────────

create table if not exists public.master_course_pillars (
  id uuid primary key default gen_random_uuid(),
  
  -- Core identification
  code text unique not null,
  title text not null,
  slug text unique not null,
  description text,
  short_description text,
  sort_order integer not null default 0,
  
  -- Publish control
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'unpublished')),
    
  -- Visibility (controls listing, not entitlement)
  visible_to_college_admins boolean not null default false,
  visible_to_college_students boolean not null default false,
  visible_to_global_students boolean not null default false,

  -- TPStreams sync fields
  tp_folder_status text not null default 'pending'
    check (tp_folder_status in ('pending', 'created', 'failed')),
  tp_folder_uuid text unique,
  tp_folder_title text,
  tp_last_synced_at timestamptz,
  tp_last_error text,

  -- Audit/Metadata
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.master_course_pillars is
  'A pillar is the top-level content grouping for SuperAdmin. Each new pillar will later create one parent TPStreams folder. Pillar visibility controls listing, not entitlement/access by itself.';

comment on column public.master_course_pillars.tp_folder_status is
  'Tracks TPStreams folder sync state for the pillar parent folder.';

-- Trigger: updated_at (Idempotent)
drop trigger if exists trg_master_course_pillars_updated_at on public.master_course_pillars;
create trigger trg_master_course_pillars_updated_at
  before update on public.master_course_pillars
  for each row execute function public.set_updated_at();

-- ─── 2) Alter master_courses ───────────────────────────────────────────────

alter table public.master_courses 
  add column if not exists pillar_id uuid references public.master_course_pillars(id) on delete restrict,
  add column if not exists slug text,
  add column if not exists visible_to_college_admins boolean not null default false,
  add column if not exists visible_to_college_students boolean not null default false,
  add column if not exists visible_to_global_students boolean not null default false;

-- Unique index for slug per pillar
create unique index if not exists idx_master_courses_pillar_slug 
  on public.master_courses (pillar_id, slug) 
  where slug is not null;

create index if not exists idx_master_courses_pillar_id on public.master_courses(pillar_id);

comment on column public.master_courses.pillar_id is
  'References the new master_course_pillars table. Course folder will later be created inside the pillar TPStreams folder.';

comment on column public.master_courses.visible_to_college_admins is
  'Course visibility controls listing, not entitlement/access by itself.';

-- ─── 3) Backfill master_course_pillars (Hardened) ──────────────────────────

do $$
declare
  pillar_record record;
  new_pillar_id uuid;
  safe_slug text;
  safe_code text;
  legacy_pillar_exists boolean;
begin
  -- Check if pillar column exists in master_courses
  select exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'master_courses' 
    and column_name = 'pillar'
  ) into legacy_pillar_exists;

  if legacy_pillar_exists then
    -- 1. Backfill from distinct non-empty pillar values
    for pillar_record in (
      select distinct trim(pillar) as pillar_name 
      from public.master_courses 
      where pillar is not null and trim(pillar) != ''
    ) loop
      -- First, check if a pillar with this exact title already exists
      select id into new_pillar_id 
      from public.master_course_pillars 
      where title = pillar_record.pillar_name;

      if new_pillar_id is null then
        safe_slug := lower(regexp_replace(pillar_record.pillar_name, '[^a-zA-Z0-9]+', '-', 'g'));
        -- Remove leading/trailing hyphens
        safe_slug := trim(both '-' from safe_slug);
        safe_code := safe_slug;
        
        -- Handle collisions (deterministic suffix using md5 of title)
        if exists (select 1 from public.master_course_pillars where code = safe_code or slug = safe_slug) then
          safe_code := safe_code || '-' || substring(md5(pillar_record.pillar_name), 1, 4);
          safe_slug := safe_code;
        end if;

        -- Final check for code/slug after suffix
        select id into new_pillar_id from public.master_course_pillars where code = safe_code or slug = safe_slug;
        
        if new_pillar_id is null then
          insert into public.master_course_pillars (title, code, slug, publish_status)
          values (pillar_record.pillar_name, safe_code, safe_slug, 'published')
          returning id into new_pillar_id;
        end if;
      end if;

      -- Only update courses where pillar_id is still null to avoid redundant updates or overwriting
      update public.master_courses 
      set pillar_id = new_pillar_id 
      where trim(pillar) = pillar_record.pillar_name 
      and pillar_id is null;
    end loop;
  end if;

  -- 2. Handle courses with null/empty pillar or if pillar column didn't exist
  if exists (select 1 from public.master_courses where pillar_id is null) then
    safe_slug := 'uncategorized';
    safe_code := 'uncategorized';
    
    -- Check if it already exists
    select id into new_pillar_id from public.master_course_pillars where code = safe_code;
    
    if new_pillar_id is null then
      insert into public.master_course_pillars (title, code, slug, publish_status)
      values ('Uncategorized', safe_code, safe_slug, 'draft')
      returning id into new_pillar_id;
    end if;

    update public.master_courses 
    set pillar_id = new_pillar_id 
    where pillar_id is null;
  end if;
end $$;

-- ─── 4) Alter master_course_modules ────────────────────────────────────────

alter table public.master_course_modules
  add column if not exists tp_folder_status text not null default 'pending'
    check (tp_folder_status in ('pending', 'created', 'failed')),
  add column if not exists tp_folder_uuid text unique,
  add column if not exists tp_folder_title text,
  add column if not exists tp_last_synced_at timestamptz,
  add column if not exists tp_last_error text,
  add column if not exists visible_to_students boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object');

comment on table public.master_course_modules is
  'Each module will later create one TPStreams child folder inside its course folder. Videos belonging to this module must upload into this module folder.';

-- ─── 5) Alter video_assets ─────────────────────────────────────────────────

alter table public.video_assets
  add column if not exists master_course_module_id uuid references public.master_course_modules(id) on delete set null;

create index if not exists idx_video_assets_module_rel on public.video_assets(master_course_id, master_course_module_id);
create index if not exists idx_video_assets_tp_folder_uuid on public.video_assets(tp_folder_uuid);

comment on column public.video_assets.master_course_module_id is
  'master_course_module_id is the new relational module mapping. module_id text is legacy and should not be used for new code after this migration.';

-- ─── 6) RLS Policies ───────────────────────────────────────────────────────

alter table public.master_course_pillars enable row level security;

-- SuperAdmin full control for pillars
drop policy if exists master_course_pillars_superadmin_all on public.master_course_pillars;
create policy master_course_pillars_superadmin_all on public.master_course_pillars
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ─── 7) View: master_course_pillar_stats (Hardened) ────────────────────────

create or replace view public.master_course_pillar_stats 
with (security_invoker = true)
as
select
  p.id as pillar_id,
  p.title,
  count(distinct mc.id) as course_count,
  count(distinct mcm.id) as module_count,
  count(distinct va.id) as video_count
from
  public.master_course_pillars p
left join public.master_courses mc on mc.pillar_id = p.id
left join public.master_course_modules mcm on mcm.master_course_id = mc.id
-- Update: Join video_assets directly to master_courses to count all videos in the course, 
-- regardless of whether they have been mapped to a relational module yet.
left join public.video_assets va on va.master_course_id = mc.id
group by
  p.id, p.title;

comment on view public.master_course_pillar_stats is
  'Aggregated stats for Master Course Pillars including course, module, and video counts.';

-- Migration: 00108_student_content_entitlements
-- Purpose: Add student_content_entitlements table for flexible content-level grants
-- (master_course, variant, bundle) without modifying existing student_entitlements.
-- This enables SuperAdmin manual grants for variant/bundle direct learner access
-- while preserving existing B2B/B2C payment entitlements.

-- ─── Create table ─────────────────────────────────────────────────────────────

create table if not exists public.student_content_entitlements (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students (id) on delete cascade,
  assigned_entity_type text not null check (assigned_entity_type in ('master_course', 'variant', 'bundle')),
  assigned_entity_id uuid not null,

  -- How was this entitlement created?
  source_type text not null default 'manual_grant'
    check (source_type in ('manual_grant')),

  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'suspended')),

  valid_from timestamptz not null default now(),
  valid_until timestamptz,

  created_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  revoke_reason text,

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_student_content_entitlements_student
  on public.student_content_entitlements (student_id);

create index if not exists idx_student_content_entitlements_entity
  on public.student_content_entitlements (assigned_entity_type, assigned_entity_id);

create index if not exists idx_student_content_entitlements_status
  on public.student_content_entitlements (student_id, status);

create index if not exists idx_student_content_entitlements_status_only
  on public.student_content_entitlements (status);

create index if not exists idx_student_content_entitlements_source_type
  on public.student_content_entitlements (source_type);

create unique index if not exists idx_student_content_entitlements_active_manual
  on public.student_content_entitlements (student_id, assigned_entity_type, assigned_entity_id)
  where status = 'active' and source_type = 'manual_grant';

-- ─── Updated-at trigger (project convention) ──────────────────────────────────

drop trigger if exists trg_student_content_entitlements_updated_at on public.student_content_entitlements;
create trigger trg_student_content_entitlements_updated_at
  before update on public.student_content_entitlements
  for each row execute function public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table public.student_content_entitlements enable row level security;

-- SuperAdmin full access
drop policy if exists "entitlements_superadmin_all" on public.student_content_entitlements;
create policy "entitlements_superadmin_all"
  on public.student_content_entitlements
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.global_role = 'superadmin'
        and profiles.is_active = true
    )
  );

-- Student read-only access to own entitlements
drop policy if exists "entitlements_student_read" on public.student_content_entitlements;
create policy "entitlements_student_read"
  on public.student_content_entitlements for select
  using (
    exists (
      select 1 from public.students
      where students.id = student_content_entitlements.student_id
        and students.user_id = auth.uid()
    )
  );

-- ─── Grants ───────────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.student_content_entitlements to authenticated;
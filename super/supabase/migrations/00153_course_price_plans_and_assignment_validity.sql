-- Migration 00153: Course Price Plans + Assignment Validity + Entitlement Validity
--
-- GOLDEN RULE:
--   TPStreams stores videos.
--   Supabase stores course metadata.
--   course_price_plans stores multiple price/validity options per course.
--   Orders reference a specific price plan.
--   Entitlements respect valid_until for access expiry.
--
-- This migration:
--   1. Creates course_price_plans table for multi-plan pricing per course.
--   2. Adds price_plan_id to orders table (nullable, backward compatible).
--   3. Backfills one default price plan per course from master_courses.selling_price.
--   4. Adds helper functions for active plan resolution and validity computation.
--   5. Ensures student_entitlements and content_assignments validity fields are used correctly.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: course_price_plans table
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.course_price_plans (
  id uuid primary key default gen_random_uuid(),

  -- Parent course reference
  master_course_id uuid not null references public.master_courses (id) on delete cascade,

  -- Plan identity
  plan_name text not null,
  description text,

  -- Validity: NULL = lifetime / no expiry
  validity_days integer,

  -- Price in minor units (paise for INR)
  price_minor integer not null,

  currency text not null default 'INR',

  -- Plan status
  is_active boolean not null default true,
  is_default boolean not null default false,

  -- Ordering
  sort_order integer not null default 0,

  -- Extensibility
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Constraints
  constraint course_price_plans_price_non_negative
    check (price_minor >= 0),
  constraint course_price_plans_validity_positive_when_set
    check (validity_days is null or validity_days > 0)
);

comment on table public.course_price_plans is
  'Multiple price/validity plans per master course. Students select a plan at purchase time.';

-- Indexes
create index idx_course_price_plans_course on public.course_price_plans (master_course_id);
create index idx_course_price_plans_active on public.course_price_plans (is_active);
create index idx_course_price_plans_course_active on public.course_price_plans (master_course_id, is_active);
drop index if exists idx_course_price_plans_default;
create unique index if not exists idx_course_price_plans_one_default_per_course
  on public.course_price_plans (master_course_id)
  where is_default = true;

-- updated_at trigger
create trigger trg_course_price_plans_updated_at
  before update on public.course_price_plans
  for each row execute function public.set_updated_at();

-- RLS
alter table public.course_price_plans enable row level security;

create policy course_price_plans_superadmin_all on public.course_price_plans
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Students: read-only access to active plans
create policy course_price_plans_student_read on public.course_price_plans
  for select to authenticated
  using (is_active = true);

grant select, insert, update, delete on public.course_price_plans to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Add price_plan_id to orders table (nullable, backward compatible)
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.orders
  add column if not exists price_plan_id uuid references public.course_price_plans (id) on delete set null;

create index if not exists idx_orders_price_plan on public.orders (price_plan_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Backfill — create one default price plan per course from selling_price
-- ═══════════════════════════════════════════════════════════════════════════════

-- Only backfill courses that:
--   - have a selling_price > 0
--   - do NOT already have any price plans
--   - are published

insert into public.course_price_plans (
  master_course_id,
  plan_name,
  description,
  validity_days,
  price_minor,
  currency,
  is_active,
  is_default,
  sort_order,
  metadata
)
select
  mc.id,
  'Standard Access',
  'Auto-created from legacy selling_price',
  mc.default_validity_days,
  -- selling_price is numeric(12,2) in rupees; convert to minor units (paise)
  round((mc.selling_price * 100))::integer,
  mc.currency,
  true,
  true,
  0,
  jsonb_build_object(
    'backfilled_from', 'selling_price',
    'legacy_base_price', mc.base_price,
    'legacy_discounted_price', mc.discounted_price
  )
from public.master_courses mc
where mc.selling_price is not null
  and mc.selling_price > 0
  and mc.publish_status = 'published'
  and not exists (
    select 1 from public.course_price_plans cpp
    where cpp.master_course_id = mc.id
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: Helper function — get active price plans for a course
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.get_active_price_plans(
  p_master_course_id uuid
)
returns table (
  id uuid,
  plan_name text,
  description text,
  validity_days integer,
  price_minor integer,
  currency text,
  is_default boolean,
  sort_order integer
)
language sql security definer stable
as $$
  select
    cpp.id,
    cpp.plan_name,
    cpp.description,
    cpp.validity_days,
    cpp.price_minor,
    cpp.currency,
    cpp.is_default,
    cpp.sort_order
  from public.course_price_plans cpp
  where cpp.master_course_id = p_master_course_id
    and cpp.is_active = true
  order by
    case when cpp.is_default then 0 else 1 end,
    cpp.sort_order,
    cpp.price_minor;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: Helper function — compute valid_until from plan + paid_at
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.compute_valid_until_from_plan(
  p_validity_days integer,
  p_paid_at timestamptz
)
returns timestamptz
language sql immutable
as $$
  select case
    when p_validity_days is null then null  -- lifetime
    else p_paid_at + (p_validity_days || ' days')::interval
  end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: Helper function — check if assignment is currently active
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.is_assignment_active(
  p_assignment public.content_assignments
)
returns boolean
language sql stable
as $$
  select
    p_assignment.status = 'active'
    and (p_assignment.start_date is null or p_assignment.start_date <= now())
    and (p_assignment.end_date is null or p_assignment.end_date > now());
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 7: Helper function — check if entitlement is currently active
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.is_entitlement_active(
  p_entitlement public.student_entitlements
)
returns boolean
language sql stable
as $$
  select
    p_entitlement.status = 'active'
    and p_entitlement.valid_from <= now()
    and (p_entitlement.valid_until is null or p_entitlement.valid_until > now());
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 8: Ensure student_entitlements has valid_until (already exists in 00072)
--         Ensure content_assignments has start_date/end_date (already exists in 00073)
--         No additional columns needed — just documenting that they exist.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 9: Maintenance function — expire assignments and entitlements
--         (Enhanced version of 00151 — now also handles price plan validity)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop the old function if it exists (from 00151) so we can replace it
drop function if exists public.expire_assignments();

create or replace function public.expire_assignments()
returns table (assignments_expired int, entitlements_revoked int)
language plpgsql security definer
as $$
declare
  expired_ids uuid[];
  a_count int := 0;
  e_count int := 0;
begin
  -- Step 1: expire assignments whose end_date has passed
  with expired as (
    update public.content_assignments
    set status = 'expired'
    where status = 'active'
      and end_date is not null
      and end_date < now()
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into expired_ids from expired;
  a_count := cardinality(expired_ids);

  -- Step 2: revoke entitlements linked to expired assignments
  if a_count > 0 then
    update public.student_entitlements
    set status = 'expired',
        revoked_at = now(),
        revoke_reason = 'assignment_expired'
    where status = 'active'
      and metadata->>'assignment_id' = any (expired_ids);
    get diagnostics e_count = row_count;
  end if;

  -- Step 3: expire B2C direct entitlements past their valid_until
  update public.student_entitlements
  set status = 'expired'
  where status = 'active'
    and source_type = 'b2c_direct'
    and valid_until is not null
    and valid_until < now();

  return query select a_count, e_count;
end;
$$;

COMMIT;

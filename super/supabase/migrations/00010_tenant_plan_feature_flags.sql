-- Phase 11: Tenant plan-based feature flags
-- Adds plans, plan_features, and tenant_feature_overrides.
-- Provides RPC helpers to check effective features with server-side enforcement.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_plans_sort_order on public.plans(sort_order);

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (plan_id, feature_key)
);

create index if not exists idx_plan_features_plan_id on public.plan_features(plan_id);
create index if not exists idx_plan_features_feature_key on public.plan_features(feature_key);

create table if not exists public.tenant_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, feature_key)
);

create index if not exists idx_tenant_feature_overrides_college_id on public.tenant_feature_overrides(college_id);
create index if not exists idx_tenant_feature_overrides_feature_key on public.tenant_feature_overrides(feature_key);

drop trigger if exists tenant_feature_overrides_updated_at on public.tenant_feature_overrides;
create trigger tenant_feature_overrides_updated_at
  before update on public.tenant_feature_overrides
  for each row execute function public.set_updated_at();

-- Attach a plan to each college.
alter table public.colleges
  add column if not exists plan_id uuid references public.plans(id) on delete restrict;

create index if not exists idx_colleges_plan_id on public.colleges(plan_id);

-- Seed plans.
insert into public.plans (key, name, sort_order)
values
  ('starter', 'Starter', 10),
  ('growth', 'Growth', 20),
  ('enterprise', 'Enterprise', 30)
on conflict (key) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

-- Default plan assignment for existing colleges:
-- - Prefer platform_settings.default_tenant_plan if present
-- - Otherwise fallback to starter
do $$
declare
  v_default_plan_key text;
  v_default_plan_id uuid;
begin
  select ps.default_tenant_plan into v_default_plan_key
  from public.platform_settings ps
  where ps.id = 'default'
  limit 1;

  v_default_plan_key := coalesce(v_default_plan_key, 'starter');

  select p.id into v_default_plan_id
  from public.plans p
  where p.key = v_default_plan_key
  limit 1;

  if v_default_plan_id is null then
    select p.id into v_default_plan_id from public.plans p where p.key = 'starter' limit 1;
  end if;

  update public.colleges
  set plan_id = v_default_plan_id
  where plan_id is null;
end $$;

alter table public.colleges
  alter column plan_id set not null;

-- Seed a conservative default feature matrix per plan.
-- Missing features are treated as disabled.
with starter as (select id from public.plans where key = 'starter' limit 1),
     growth as (select id from public.plans where key = 'growth' limit 1),
     enterprise as (select id from public.plans where key = 'enterprise' limit 1)
insert into public.plan_features (plan_id, feature_key, enabled)
select starter.id, f.feature_key, true
from starter
cross join (
  values
    ('lectures'),
    ('attendance'),
    ('assessments'),
    ('notifications'),
    ('certificate_generation')
) as f(feature_key)
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

with growth as (select id from public.plans where key = 'growth' limit 1)
insert into public.plan_features (plan_id, feature_key, enabled)
select growth.id, f.feature_key, true
from growth
cross join (
  values
    ('lectures'),
    ('attendance'),
    ('assessments'),
    ('advanced_analytics'),
    ('placement_workflow'),
    ('mentor_review'),
    ('notifications'),
    ('certificate_generation'),
    ('bulk_import'),
    ('interview_tracking'),
    ('advanced_reports')
) as f(feature_key)
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

with enterprise as (select id from public.plans where key = 'enterprise' limit 1)
insert into public.plan_features (plan_id, feature_key, enabled)
select enterprise.id, f.feature_key, true
from enterprise
cross join (
  values
    ('lectures'),
    ('attendance'),
    ('assessments'),
    ('advanced_analytics'),
    ('placement_workflow'),
    ('mentor_review'),
    ('notifications'),
    ('certificate_generation'),
    ('audit_dashboard'),
    ('bulk_import'),
    ('interview_tracking'),
    ('custom_branding'),
    ('advanced_reports'),
    ('api_access'),
    ('sso')
) as f(feature_key)
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.tenant_feature_overrides enable row level security;

-- plans: readable by authenticated users; writable by superadmin only
drop policy if exists plans_read_authenticated on public.plans;
create policy plans_read_authenticated
  on public.plans for select
  to authenticated
  using (true);

drop policy if exists plans_superadmin_all on public.plans;
create policy plans_superadmin_all
  on public.plans for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- plan_features: readable by authenticated users; writable by superadmin only
drop policy if exists plan_features_read_authenticated on public.plan_features;
create policy plan_features_read_authenticated
  on public.plan_features for select
  to authenticated
  using (true);

drop policy if exists plan_features_superadmin_all on public.plan_features;
create policy plan_features_superadmin_all
  on public.plan_features for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- tenant_feature_overrides: tenant members can read; superadmin can manage
drop policy if exists tenant_feature_overrides_read_tenant on public.tenant_feature_overrides;
create policy tenant_feature_overrides_read_tenant
  on public.tenant_feature_overrides for select
  to authenticated
  using (
    exists (
      select 1
      from public.college_memberships m
      where m.user_id = auth.uid()
        and m.college_id = tenant_feature_overrides.college_id
        and m.status = 'active'
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  );

drop policy if exists tenant_feature_overrides_superadmin_all on public.tenant_feature_overrides;
create policy tenant_feature_overrides_superadmin_all
  on public.tenant_feature_overrides for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- Stub table for get_effective_features legacy CTE (full def in 00013_admin_security)
create table if not exists public.college_features (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, feature_key)
);
create index if not exists idx_college_features_college_id on public.college_features(college_id);
create index if not exists idx_college_features_key on public.college_features(feature_key);

-- RPC: has_feature(college_id, feature_key) -> boolean
-- Enforces that callers can only check features for their own tenant unless superadmin.
create or replace function public.has_feature(
  p_college_id uuid,
  p_feature_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_superadmin boolean;
  v_is_member boolean;
  v_enabled boolean;
begin
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  into v_is_superadmin;

  if not v_is_superadmin then
    select exists (
      select 1
      from public.college_memberships m
      where m.user_id = auth.uid()
        and m.college_id = p_college_id
        and m.status = 'active'
    )
    into v_is_member;

    if not v_is_member then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  select
    coalesce(
      o.enabled,
      legacy.enabled,
      pf.enabled,
      false
    )
  into v_enabled
  from public.colleges c
  left join public.plan_features pf
    on pf.plan_id = c.plan_id
   and pf.feature_key = p_feature_key
  left join public.tenant_feature_overrides o
    on o.college_id = c.id
   and o.feature_key = p_feature_key
  left join public.college_features legacy
    on legacy.college_id = c.id
   and legacy.feature_key = p_feature_key
  where c.id = p_college_id
  limit 1;

  return coalesce(v_enabled, false);
end;
$$;

grant execute on function public.has_feature(uuid, text) to authenticated;

-- RPC: get_effective_features(college_id) -> rows of effective feature flags
create or replace function public.get_effective_features(
  p_college_id uuid
)
returns table (
  feature_key text,
  enabled boolean,
  source text
)
language sql
security definer
set search_path = public
as $$
  with superadmin as (
    select exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin') as ok
  ),
  member as (
    select exists (
      select 1
      from public.college_memberships m
      where m.user_id = auth.uid()
        and m.college_id = p_college_id
        and m.status = 'active'
    ) as ok
  ),
  authz as (
    select (select ok from superadmin) or (select ok from member) as ok
  ),
  base as (
    select pf.feature_key, pf.enabled, 'plan'::text as source
    from public.colleges c
    join public.plan_features pf on pf.plan_id = c.plan_id
    where c.id = p_college_id
  ),
  legacy as (
    select cf.feature_key, cf.enabled, 'legacy_override'::text as source
    from public.college_features cf
    where cf.college_id = p_college_id
  ),
  overrides as (
    select o.feature_key, o.enabled, 'override'::text as source
    from public.tenant_feature_overrides o
    where o.college_id = p_college_id
  ),
  combined as (
    select feature_key, enabled, source from base
    union all
    select feature_key, enabled, source from legacy
    union all
    select feature_key, enabled, source from overrides
  ),
  ranked as (
    select
      c.feature_key,
      c.enabled,
      c.source,
      case
        when c.source = 'override' then 3
        when c.source = 'legacy_override' then 2
        when c.source = 'plan' then 1
        else 0
      end as priority
    from combined c
  ),
  picked as (
    select distinct on (r.feature_key)
      r.feature_key,
      r.enabled,
      r.source
    from ranked r
    order by r.feature_key, r.priority desc
  )
  select p.feature_key, p.enabled, p.source
  from picked p
  where (select ok from authz) = true;
$$;

grant execute on function public.get_effective_features(uuid) to authenticated;


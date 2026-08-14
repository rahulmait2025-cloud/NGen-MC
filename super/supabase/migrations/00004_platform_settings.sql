-- Phase 10: platform-level persisted settings for SuperAdmin

create table if not exists public.platform_settings (
  id text primary key,
  maintenance_mode boolean not null default false,
  announcement_banner boolean not null default false,
  force_2fa_admins boolean not null default true,
  default_tenant_plan text not null default 'starter' check (default_tenant_plan in ('starter', 'growth', 'enterprise')),
  feature_placements boolean not null default true,
  feature_assessments boolean not null default true,
  email_provider text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_platform_settings_updated_at on public.platform_settings;
create trigger trg_platform_settings_updated_at
before update on public.platform_settings
for each row
execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_read_authenticated on public.platform_settings;
create policy platform_settings_read_authenticated
on public.platform_settings
for select
to authenticated
using (true);

insert into public.platform_settings (id)
values ('default')
on conflict (id) do nothing;
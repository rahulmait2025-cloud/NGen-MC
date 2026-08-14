-- Analytics settings for GA4: toggles and measurement ID.
-- Landing page reads public config via anon; Super Admin manages via authenticated superadmin.

create table if not exists public.analytics_settings (
  id text primary key default 'default',
  ga_enabled boolean not null default false,
  section_tracking_enabled boolean not null default true,
  cta_tracking_enabled boolean not null default true,
  form_tracking_enabled boolean not null default true,
  measurement_id text,
  ga4_connection_status text check (ga4_connection_status in ('ok', 'error', 'pending')),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_analytics_settings_updated_at on public.analytics_settings;
create trigger trg_analytics_settings_updated_at
  before update on public.analytics_settings
  for each row execute function public.set_updated_at();

alter table public.analytics_settings enable row level security;

-- Allow anon to read the single config row (for landing page API)
drop policy if exists analytics_settings_anon_read on public.analytics_settings;
create policy analytics_settings_anon_read
  on public.analytics_settings for select
  to anon
  using (id = 'default');

-- Authenticated users (superadmin) can read and update
drop policy if exists analytics_settings_authenticated_read on public.analytics_settings;
create policy analytics_settings_authenticated_read
  on public.analytics_settings for select
  to authenticated
  using (true);

drop policy if exists analytics_settings_authenticated_update on public.analytics_settings;
create policy analytics_settings_authenticated_update
  on public.analytics_settings for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.global_role = 'superadmin'
    )
  );

drop policy if exists analytics_settings_authenticated_insert on public.analytics_settings;
create policy analytics_settings_authenticated_insert
  on public.analytics_settings for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.global_role = 'superadmin'
    )
  );

-- Insert default row
insert into public.analytics_settings (id)
values ('default')
on conflict (id) do nothing;

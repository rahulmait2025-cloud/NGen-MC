-- Event pipeline / activity tracking (same as root supabase/migrations/00011)
-- activity_events: structured events for login, invites, feature changes, etc.

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.colleges(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  actor_type text,
  event_name text not null,
  event_category text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  session_id text,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_events_tenant_id on public.activity_events(tenant_id);
create index if not exists idx_activity_events_actor_user_id on public.activity_events(actor_user_id);
create index if not exists idx_activity_events_event_name on public.activity_events(event_name);
create index if not exists idx_activity_events_event_category on public.activity_events(event_category);
create index if not exists idx_activity_events_created_at on public.activity_events(created_at desc);
create index if not exists idx_activity_events_tenant_created on public.activity_events(tenant_id, created_at desc);
create index if not exists idx_activity_events_entity on public.activity_events(entity_type, entity_id) where entity_type is not null;

alter table public.activity_events enable row level security;

drop policy if exists "Superadmin read all activity_events" on public.activity_events;
create policy "Superadmin read all activity_events" on public.activity_events for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

drop policy if exists "Tenant admin read own activity_events" on public.activity_events;
create policy "Tenant admin read own activity_events" on public.activity_events for select
  using (tenant_id in (select m.college_id from public.college_memberships m where m.user_id = auth.uid() and m.status = 'active' and m.role in ('college_admin', 'faculty_spoc')));

drop policy if exists "Student read own activity_events" on public.activity_events;
create policy "Student read own activity_events" on public.activity_events for select
  using (actor_user_id = auth.uid() and tenant_id in (select m.college_id from public.college_memberships m where m.user_id = auth.uid() and m.status = 'active'));

create or replace function public.insert_activity_event(
  p_tenant_id uuid, p_actor_user_id uuid, p_actor_role text, p_actor_type text,
  p_event_name text, p_event_category text, p_entity_type text, p_entity_id text,
  p_metadata jsonb, p_ip_address text, p_user_agent text, p_session_id text, p_request_id text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.activity_events (tenant_id, actor_user_id, actor_role, actor_type, event_name, event_category, entity_type, entity_id, metadata, ip_address, user_agent, session_id, request_id)
  values (p_tenant_id, p_actor_user_id, p_actor_role, p_actor_type, p_event_name, p_event_category, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb), p_ip_address, p_user_agent, p_session_id, p_request_id)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) to authenticated;

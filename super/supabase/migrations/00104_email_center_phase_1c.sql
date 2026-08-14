-- Email Center Phase 1C - Tracking, Analytics, Webhooks, Preferences
-- Migration: 00104_email_center_phase_1c.sql

begin;

-- 1. email_events - Immutable event log
create table if not exists public.email_events (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid references email_campaigns(id) on delete set null,
    recipient_id uuid references email_campaign_recipients(id) on delete set null,
    outbox_id uuid references email_outbox(id) on delete set null,
    provider text not null,
    provider_event_id text,
    provider_message_id text,
    event_type text not null,
    event_timestamp timestamptz not null default now(),
    email text,
    url text,
    user_agent text,
    ip_hash text,
    raw_event jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_events_campaign on public.email_events(campaign_id);
create index if not exists idx_email_events_recipient on public.email_events(recipient_id);
create index if not exists idx_email_events_outbox on public.email_events(outbox_id);
create index if not exists idx_email_events_provider on public.email_events(provider);
create index if not exists idx_email_events_message on public.email_events(provider_message_id);
create index if not exists idx_email_events_type on public.email_events(event_type);
create index if not exists idx_email_events_timestamp on public.email_events(event_timestamp desc);

create unique index if not exists idx_email_events_unique
    on public.email_events(provider, provider_event_id)
    where provider_event_id is not null;

-- 2. email_click_links - Tracking rewritten links
create table if not exists public.email_click_links (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references email_campaigns(id) on delete cascade,
    recipient_id uuid references email_campaign_recipients(id) on delete set null,
    outbox_id uuid references email_outbox(id) on delete set null,
    original_url text not null,
    tracking_token text not null unique,
    click_count int not null default 0,
    first_clicked_at timestamptz,
    last_clicked_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_click_links_campaign on public.email_click_links(campaign_id);
create index if not exists idx_email_click_links_recipient on public.email_click_links(recipient_id);
create index if not exists idx_email_click_links_token on public.email_click_links(tracking_token);
create index if not exists idx_email_click_links_url on public.email_click_links(original_url);

-- 3. email_open_tokens - Open tracking tokens
create table if not exists public.email_open_tokens (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references email_campaigns(id) on delete cascade,
    recipient_id uuid not null references email_campaign_recipients(id) on delete cascade,
    outbox_id uuid references email_outbox(id) on delete set null,
    tracking_token text not null unique,
    open_count int not null default 0,
    first_opened_at timestamptz,
    last_opened_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists idx_email_open_tokens_campaign on public.email_open_tokens(campaign_id);
create index if not exists idx_email_open_tokens_recipient on public.email_open_tokens(recipient_id);
create index if not exists idx_email_open_tokens_token on public.email_open_tokens(tracking_token);

-- 4. email_preferences - Per-email preference state
create table if not exists public.email_preferences (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    marketing_opt_out boolean not null default false,
    announcements_opt_out boolean not null default false,
    product_updates_opt_out boolean not null default false,
    notices_opt_out boolean not null default false,
    operational_opt_out boolean not null default false,
    global_unsubscribe boolean not null default false,
    unsubscribed_at timestamptz,
    unsubscribe_reason text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_email_preferences_email on public.email_preferences(lower(email));
create index if not exists idx_email_preferences_global on public.email_preferences(global_unsubscribe);

-- 5. email_unsubscribe_tokens - Secure unsubscribe links
create table if not exists public.email_unsubscribe_tokens (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    token_hash text not null unique,
    campaign_id uuid references email_campaigns(id) on delete set null,
    recipient_id uuid references email_campaign_recipients(id) on delete set null,
    expires_at timestamptz,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_unsubscribe_tokens_email on public.email_unsubscribe_tokens(lower(email));
create index if not exists idx_email_unsubscribe_tokens_hash on public.email_unsubscribe_tokens(token_hash);
create index if not exists idx_email_unsubscribe_tokens_campaign on public.email_unsubscribe_tokens(campaign_id);
create index if not exists idx_email_unsubscribe_tokens_recipient on public.email_unsubscribe_tokens(recipient_id);

-- 6. updated_at triggers
drop trigger if exists trg_email_preferences_updated_at on public.email_preferences;
create trigger trg_email_preferences_updated_at
    before update on public.email_preferences
    for each row execute function public.set_updated_at();

-- 7. RLS on new tables
alter table public.email_events enable row level security;
alter table public.email_click_links enable row level security;
alter table public.email_open_tokens enable row level security;
alter table public.email_preferences enable row level security;
alter table public.email_unsubscribe_tokens enable row level security;

create policy "email_events_service_role_full_access"
    on public.email_events for all using (true) with check (true);
create policy "email_click_links_service_role_full_access"
    on public.email_click_links for all using (true) with check (true);
create policy "email_open_tokens_service_role_full_access"
    on public.email_open_tokens for all using (true) with check (true);
create policy "email_preferences_service_role_full_access"
    on public.email_preferences for all using (true) with check (true);
create policy "email_unsubscribe_tokens_service_role_full_access"
    on public.email_unsubscribe_tokens for all using (true) with check (true);

-- 8. email_campaigns analytics counters (add if missing)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='delivered_count') then
        alter table public.email_campaigns add column delivered_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='opened_count') then
        alter table public.email_campaigns add column opened_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='clicked_count') then
        alter table public.email_campaigns add column clicked_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='bounced_count') then
        alter table public.email_campaigns add column bounced_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='complained_count') then
        alter table public.email_campaigns add column complained_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='unsubscribed_count') then
        alter table public.email_campaigns add column unsubscribed_count int not null default 0;
    end if;
end $$;

-- 9. Helper RPC: get_email_event_counts
create or replace function public.get_email_event_counts(
    p_campaign_id uuid
)
returns table(
    event_type text,
    event_count bigint
)
language plpgsql
as $$
begin
    return query
    select e.event_type, count(*)::bigint
    from public.email_events e
    where e.campaign_id = p_campaign_id
    group by e.event_type;
end;
$$;

-- 10. Helper RPC: record_click_event
create or replace function public.record_click_event(
    p_tracking_token text,
    p_user_agent text,
    p_ip_hash text
)
returns void
language plpgsql
as $$
declare
    v_link record;
    v_now timestamptz := now();
begin
    select * into v_link
    from public.email_click_links
    where tracking_token = p_tracking_token;

    if not found then
        return;
    end if;

    update public.email_click_links
    set click_count = click_count + 1,
        last_clicked_at = v_now,
        first_clicked_at = coalesce(first_clicked_at, v_now)
    where id = v_link.id;

    insert into public.email_events (
        campaign_id, recipient_id, outbox_id, provider,
        event_type, url, user_agent, ip_hash
    ) values (
        v_link.campaign_id, v_link.recipient_id, v_link.outbox_id, 'internal',
        'clicked', v_link.original_url, p_user_agent, p_ip_hash
    );

    update public.email_campaigns
    set clicked_count = clicked_count + 1
    where id = v_link.campaign_id;
end;
$$;

-- 11. Helper RPC: record_open_event
create or replace function public.record_open_event(
    p_tracking_token text
)
returns void
language plpgsql
as $$
declare
    v_token record;
    v_now timestamptz := now();
begin
    select * into v_token
    from public.email_open_tokens
    where tracking_token = p_tracking_token;

    if not found then
        return;
    end if;

    update public.email_open_tokens
    set open_count = open_count + 1,
        last_opened_at = v_now,
        first_opened_at = coalesce(first_opened_at, v_now)
    where id = v_token.id;

    insert into public.email_events (
        campaign_id, recipient_id, outbox_id, provider,
        event_type
    ) values (
        v_token.campaign_id, v_token.recipient_id, v_token.outbox_id, 'internal',
        'opened'
    );

    update public.email_campaigns
    set opened_count = opened_count + 1
    where id = v_token.campaign_id;
end;
$$;

commit;
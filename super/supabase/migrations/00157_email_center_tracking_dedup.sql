-- Email Center: dedupe internal open/click tracking at DB layer + fix legacy RPCs.

begin;

-- Remove duplicate internal events so unique indexes can be created.
delete from public.email_events a
using public.email_events b
where a.provider = 'internal'
  and a.event_type = 'clicked'
  and b.provider = 'internal'
  and b.event_type = 'clicked'
  and a.campaign_id = b.campaign_id
  and a.recipient_id = b.recipient_id
  and a.url = b.url
  and a.id > b.id;

delete from public.email_events a
using public.email_events b
where a.provider = 'internal'
  and a.event_type = 'opened'
  and b.provider = 'internal'
  and b.event_type = 'opened'
  and a.campaign_id = b.campaign_id
  and a.recipient_id = b.recipient_id
  and a.id > b.id;

-- One internal click event per campaign + recipient + destination URL.
create unique index if not exists idx_email_events_unique_internal_click
  on public.email_events (campaign_id, recipient_id, url)
  where provider = 'internal'
    and event_type = 'clicked'
    and campaign_id is not null
    and recipient_id is not null
    and url is not null;

-- One internal open event per campaign + recipient.
create unique index if not exists idx_email_events_unique_internal_open
  on public.email_events (campaign_id, recipient_id)
  where provider = 'internal'
    and event_type = 'opened'
    and campaign_id is not null
    and recipient_id is not null;

-- record_click_event: only first click per link records analytics.
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
        first_clicked_at = v_now,
        last_clicked_at = v_now
    where id = v_link.id
      and first_clicked_at is null;

    if not found then
        update public.email_click_links
        set click_count = click_count + 1,
            last_clicked_at = v_now
        where id = v_link.id;
        return;
    end if;

    insert into public.email_events (
        campaign_id, recipient_id, outbox_id, provider,
        event_type, url, user_agent, ip_hash
    ) values (
        v_link.campaign_id, v_link.recipient_id, v_link.outbox_id, 'internal',
        'clicked', v_link.original_url, p_user_agent, p_ip_hash
    )
    on conflict do nothing;

    update public.email_campaigns
    set clicked_count = clicked_count + 1
    where id = v_link.campaign_id;
end;
$$;

-- record_open_event: only first open per token records analytics.
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
        first_opened_at = v_now,
        last_opened_at = v_now
    where id = v_token.id
      and first_opened_at is null;

    if not found then
        update public.email_open_tokens
        set open_count = open_count + 1,
            last_opened_at = v_now
        where id = v_token.id;
        return;
    end if;

    insert into public.email_events (
        campaign_id, recipient_id, outbox_id, provider,
        event_type
    ) values (
        v_token.campaign_id, v_token.recipient_id, v_token.outbox_id, 'internal',
        'opened'
    )
    on conflict do nothing;

    update public.email_campaigns
    set opened_count = opened_count + 1
    where id = v_token.campaign_id;
end;
$$;

-- Reconcile campaign counters to unique engagement (recipient / recipient+url).
update public.email_campaigns c
set
  opened_count = coalesce((
    select count(distinct t.recipient_id)::int
    from public.email_open_tokens t
    where t.campaign_id = c.id
      and t.first_opened_at is not null
  ), 0),
  clicked_count = coalesce((
    select count(*)::int
    from (
      select distinct t.recipient_id, t.original_url
      from public.email_click_links t
      where t.campaign_id = c.id
        and t.first_clicked_at is not null
    ) u
  ), 0);

commit;

-- Reconcile email_campaigns.delivered_count from email_outbox (not webhook events).

begin;

update public.email_campaigns c
set delivered_count = coalesce((
  select count(*)::int
  from public.email_outbox o
  where o.campaign_id = c.id
    and o.status in ('sent', 'delivered')
), 0);

commit;

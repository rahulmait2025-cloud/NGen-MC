-- Email Center: campaign email_category lane + backfill outbox.category from campaigns.

begin;

alter table public.email_campaigns
  add column if not exists email_category text;

update public.email_campaigns
set email_category = case campaign_type
  when 'marketing' then 'growth_marketing'
  when 'product_launch' then 'growth_marketing'
  when 'custom' then 'growth_marketing'
  when 'announcement' then 'academics'
  when 'notice' then 'notices'
  when 'operational' then 'transactional_essential'
  when 'notification' then 'transactional_essential'
  else 'growth_marketing'
end
where email_category is null;

alter table public.email_campaigns
  alter column email_category set default 'growth_marketing';

update public.email_campaigns
set email_category = 'growth_marketing'
where email_category is null;

alter table public.email_campaigns
  alter column email_category set not null;

update public.email_outbox o
set category = c.email_category
from public.email_campaigns c
where o.campaign_id = c.id
  and o.category = 'announcement'
  and c.email_category is not null
  and c.email_category <> 'announcement';

-- Footer preference link copy (templates using legacy unsubscribe sentence).
update public.email_templates
set html_template = replace(
  html_template,
  'If you are no longer interested, click <a href="{{unsubscribe_url}}">here</a> to unsubscribe.',
  '<a href="{{unsubscribe_url}}" style="font-size:12px;color:#F4A854;text-decoration:none;font-weight:600;">Manage preferences or unsubscribe</a>'
)
where html_template like '%here</a> to unsubscribe%';

update public.email_templates
set text_template = replace(
  text_template,
  'Unsubscribe or manage preferences:',
  'Manage preferences or unsubscribe:'
)
where text_template like '%Unsubscribe or manage preferences:%';

commit;

begin;

-- Custom Email composer: structured draft state + content mode.
-- Compiled delivery snapshots remain in subject / preview_text / html_body / text_body.
-- Existing rows stay compatible: content_mode defaults to 'template'; all null-template
-- campaigns (including empty drafts) are classified as legacy_html.

alter table public.email_campaigns
  add column if not exists content_mode text not null default 'template';

alter table public.email_campaigns
  add column if not exists composer_state jsonb;

alter table public.email_campaigns
  drop constraint if exists email_campaigns_content_mode_check;

alter table public.email_campaigns
  add constraint email_campaigns_content_mode_check
  check (content_mode in ('template', 'custom_composer', 'legacy_html'));

comment on column public.email_campaigns.content_mode is
  'template = predefined template; custom_composer = structured Custom Email; legacy_html = old no-template compiled HTML';

comment on column public.email_campaigns.composer_state is
  'Structured Custom EmailComposerState (schema_version, heading, body_html, body_text, ctas). Null for template/legacy.';

-- Backfill: every null-template campaign is legacy_html (including empty drafts).
-- Do not invent composer_state.
update public.email_campaigns
set content_mode = 'legacy_html'
where template_id is null
  and content_mode = 'template';

commit;

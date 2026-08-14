-- Email Center: update Instagram social URL in seeded / stored templates.
-- DO NOT auto-execute from CI or agent workflows — apply manually after review.
--
-- Why: Custom Email shell now uses EMAIL_SOCIAL_LINKS, but historical rows in
-- public.email_templates still embed the old Instagram handle
-- (code.with.ctobhaiya). This migration rewrites stored HTML/text so platform
-- template campaigns and previews match the approved production URLs.
--
-- No schema changes. No recipient / outbox changes.
-- Rollback: reverse the two replace() calls (swap old/new URLs).

begin;

update public.email_templates
set
  html_template = replace(
    html_template,
    'https://www.instagram.com/code.with.ctobhaiya?igsh=MTgyM3ZyY2V6enJheQ==',
    'https://www.instagram.com/anuj.kumar.codes?igsh=N2wxYWo4bGw4OHRq'
  ),
  text_template = case
    when text_template is null then null
    else replace(
      text_template,
      'https://www.instagram.com/code.with.ctobhaiya?igsh=MTgyM3ZyY2V6enJheQ==',
      'https://www.instagram.com/anuj.kumar.codes?igsh=N2wxYWo4bGw4OHRq'
    )
  end,
  updated_at = now()
where
  coalesce(html_template, '') like '%code.with.ctobhaiya%'
  or coalesce(text_template, '') like '%code.with.ctobhaiya%';

-- Also rewrite any campaign bodies that still embed the old Instagram URL
-- (Custom Email and template snapshots that baked the footer at compile time).
update public.email_campaigns
set
  html_body = replace(
    html_body,
    'https://www.instagram.com/code.with.ctobhaiya?igsh=MTgyM3ZyY2V6enJheQ==',
    'https://www.instagram.com/anuj.kumar.codes?igsh=N2wxYWo4bGw4OHRq'
  ),
  text_body = case
    when text_body is null then null
    else replace(
      text_body,
      'https://www.instagram.com/code.with.ctobhaiya?igsh=MTgyM3ZyY2V6enJheQ==',
      'https://www.instagram.com/anuj.kumar.codes?igsh=N2wxYWo4bGw4OHRq'
    )
  end,
  updated_at = now()
where
  coalesce(html_body, '') like '%code.with.ctobhaiya%'
  or coalesce(text_body, '') like '%code.with.ctobhaiya%';

commit;

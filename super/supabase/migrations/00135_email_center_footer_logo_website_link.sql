begin;

-- Footer brand row: logo links to https://nextgen-cto.in/ (same intent as college-lead-confirmation site link).
update public.email_templates
set
  html_template = replace(
    html_template,
    '<td valign="middle" style="padding-right:10px;"><img src="{{email_logo_url}}" alt="NextGen CTO" width="56" style="display:block;border:0;outline:none;text-decoration:none;height:auto;"/></td>',
    '<td valign="middle" style="padding-right:10px;"><a href="{{email_website_url}}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;"><img src="{{email_logo_url}}" alt="NextGen CTO" width="56" style="display:block;border:0;outline:none;text-decoration:none;height:auto;"/></a></td>'
  ),
  updated_at = now()
where coalesce(html_template, '') ilike '%{{email_logo_url}}%'
  and coalesce(html_template, '') ilike '%width="56"%'
  and coalesce(html_template, '') not ilike '%href="{{email_website_url}}"%width="56"%';

commit;

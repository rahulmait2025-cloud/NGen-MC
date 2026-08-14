begin;

-- ai-agentic-ai-module-announcement: align header with 00132+ shell (dynamic {{email_header_display}} via career merge).
update public.email_templates
set
  html_template = replace(
    html_template,
    'NextGen CTO &times; {{college_name}}',
    '{{email_header_display}}'
  ),
  updated_at = now()
where slug = 'ai-agentic-ai-module-announcement'
  and coalesce(html_template, '') like '%NextGen CTO &times; {{college_name}}%';

commit;

begin;

-- Career Readiness Program Launch: partner vs direct-learner college copy (merge keys filled in app)
update public.email_templates
set
  preview_text_template = '{{email_preheader_text}}',
  html_template = replace(
    replace(
      replace(
        html_template,
        'Your college has enabled access to {{program_name}} - build foundations, projects, profiles, AI exposure, and interview readiness.',
        '{{email_preheader_text}}'
      ),
      '<td style="font-size:18px;font-weight:800;color:#FFFFFF;padding-left:12px;vertical-align:middle;">NextGen CTO &times; {{college_name}}</td>',
      '<td style="font-size:18px;font-weight:800;color:#FFFFFF;padding-left:12px;vertical-align:middle;">{{email_header_display}}</td>'
    ),
    '<p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your college has enabled access to <strong>{{program_name}}</strong> - a structured career readiness journey designed to help you move from learning concepts to building real career assets.</p>',
    '<p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">{{email_program_lead_html}}</p>'
  ),
  text_template = replace(
    text_template,
    E'Your college has enabled access to {{program_name}} - a structured career readiness journey designed to help you move from learning concepts to building real career assets.\n\nThis is not just another course.',
    E'{{email_program_lead_text}}\n\nThis is not just another course.'
  ),
  updated_at = now()
where slug = 'career-readiness-program-launch';

commit;

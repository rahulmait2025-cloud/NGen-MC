begin;

-- Replace program/college compliance line with fixed NextGen CTO subscriber copy (html + text, all templates).
update public.email_templates
set
  html_template = replace(
    replace(
      replace(
        replace(html_template,
          'You are receiving this email because you are part of {{program_name}} at {{college_name}}.',
          'You are receiving this email because you are a subscriber of NextGen CTO.'),
        'You are receiving this email because you are part of {{program_name}}.',
        'You are receiving this email because you are a subscriber of NextGen CTO.'),
      'You are receiving this because you are part of {{program_name}}.',
      'You are receiving this email because you are a subscriber of NextGen CTO.'),
    'You are receiving this because you are part of {{program_name}}.<br>',
    'You are receiving this email because you are a subscriber of NextGen CTO.<br>'),
  text_template = replace(
    replace(
      replace(text_template,
        'You are receiving this email because you are part of {{program_name}} at {{college_name}}.',
        'You are receiving this email because you are a subscriber of NextGen CTO.'),
      'You are receiving this email because you are part of {{program_name}}.',
      'You are receiving this email because you are a subscriber of NextGen CTO.'),
    'You are receiving this because you are part of {{program_name}}.',
    'You are receiving this email because you are a subscriber of NextGen CTO.'),
  updated_at = now()
where coalesce(html_template, '') ilike '%receiving this%part of {{program_name}}%'
   or coalesce(text_template, '') ilike '%receiving this%part of {{program_name}}%';

commit;

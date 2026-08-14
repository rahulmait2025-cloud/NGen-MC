-- Email Center Template Seed Fix
-- Migration: 00106_email_center_template_seed_fix.sql
-- Inserts the 6 expected system/prebuilt templates idempotently.
-- These should have been part of 00102 but were never seeded.

begin;

-- Template variable definitions used across templates
-- {{first_name}}, {{full_name}}, {{college_name}}, {{course_name}}
-- {{cta_url}}, {{cta_label}}, {{dashboard_url}}, {{unsubscribe_url}}

-- 1. premium-product-launch
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Premium Product Launch',
    'premium-product-launch',
    'product_launch',
    'Announce a new premium product or course to your platform audience.',
    'Introducing {{product_name}} – Now Available',
    'Learn more about {{product_name}} and get started today.',
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.container{max-width:600px;margin:0 auto;padding:24px 16px}.card{background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.header{text-align:center;padding-bottom:24px;border-bottom:1px solid #e4e4e7}.header h1{font-size:24px;color:#18181b;margin:0 0 8px}.header p{font-size:14px;color:#71717a;margin:0}.body{padding:24px 0;font-size:15px;line-height:1.6;color:#3f3f46}.cta{text-align:center;padding:16px 0}.cta a{display:inline-block;background-color:#18181b;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}.footer{padding-top:24px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center}.footer a{color:#71717a;text-decoration:underline}</style></head><body><div class="container"><div class="card"><div class="header"><h1>Introducing {{product_name}}</h1><p>New premium offering from {{college_name}}</p></div><div class="body"><p>Dear {{first_name}},</p><p>We are thrilled to announce the launch of <strong>{{product_name}}</strong> – our newest premium offering designed to help you achieve more.</p><p>This exclusive product includes:</p><ul><li>Expert-crafted curriculum</li><li>Hands-on projects and assessments</li><li>Certificate of completion</li><li>Priority support</li></ul><p>Don''t miss this opportunity to take your learning to the next level.</p></div><div class="cta"><a href="{{cta_url}}">{{cta_label}}</a></div><div class="footer"><p>You are receiving this because you are a valued member of {{college_name}}.</p><p><a href="{{dashboard_url}}">Visit Dashboard</a> &middot; <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></div></div></body></html>',
    'Dear {{first_name}},

We are thrilled to announce the launch of {{product_name}} – our newest premium offering designed to help you achieve more.

This exclusive product includes:
- Expert-crafted curriculum
- Hands-on projects and assessments
- Certificate of completion
- Priority support

Don''t miss this opportunity to take your learning to the next level.

{{cta_label}}: {{cta_url}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}',
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"product_name","label":"Product Name","type":"string","required":true,"description":"Name of the product being launched"},
        {"key":"college_name","label":"College Name","type":"string","required":true,"description":"Sender college name"},
        {"key":"cta_url","label":"CTA URL","type":"url","required":true,"description":"Call-to-action link"},
        {"key":"cta_label","label":"CTA Label","type":"string","required":true,"description":"Call-to-action button text"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 2. official-college-notice
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Official College Notice',
    'official-college-notice',
    'notice',
    'Send an official notice or announcement to students and staff.',
    'Official Notice: {{notice_title}}',
    'Important information from {{college_name}} regarding {{notice_title}}.',
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.container{max-width:600px;margin:0 auto;padding:24px 16px}.card{background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.badge{display:inline-block;background:#dc2626;color:#ffffff;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:16px}.header h1{font-size:22px;color:#18181b;margin:0 0 8px}.header .meta{font-size:13px;color:#71717a;margin:0}.body{padding:24px 0;font-size:15px;line-height:1.6;color:#3f3f46}.footer{padding-top:24px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center}.footer a{color:#71717a;text-decoration:underline}</style></head><body><div class="container"><div class="card"><div class="badge">Official Notice</div><div class="header"><h1>{{notice_title}}</h1><p class="meta">{{college_name}} &middot; {{notice_date}}</p></div><div class="body"><p>Dear {{first_name}},</p>{{notice_body}}<p>Please read this notice carefully. If you have any questions, contact the administration office.</p></div><div class="footer"><p><a href="{{dashboard_url}}">Visit Dashboard</a> &middot; <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></div></div></body></html>',
    'OFFICIAL NOTICE

{{notice_title}}
{{college_name}} - {{notice_date}}

Dear {{first_name}},

{{notice_body}}

Please read this notice carefully. If you have any questions, contact the administration office.

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}',
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"notice_title","label":"Notice Title","type":"string","required":true,"description":"Title of the notice"},
        {"key":"notice_body","label":"Notice Body","type":"string","required":true,"description":"Main notice content (supports HTML)"},
        {"key":"notice_date","label":"Notice Date","type":"date","required":true,"description":"Date of the notice"},
        {"key":"college_name","label":"College Name","type":"string","required":true,"description":"Sender college name"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 3. new-course-announcement
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'New Course Announcement',
    'new-course-announcement',
    'announcement',
    'Announce a new course available for enrollment.',
    'New Course: {{course_name}} – Enroll Now',
    '{{college_name}} has launched {{course_name}}. Secure your spot today.',
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.container{max-width:600px;margin:0 auto;padding:24px 16px}.card{background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.header{text-align:center;padding-bottom:24px;border-bottom:1px solid #e4e4e7}.header h1{font-size:24px;color:#18181b;margin:0 0 8px}.header p{font-size:14px;color:#71717a;margin:0}.body{padding:24px 0;font-size:15px;line-height:1.6;color:#3f3f46}.details{background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0;font-size:14px}.details dt{font-weight:600;color:#18181b;margin-top:8px}.details dt:first-child{margin-top:0}.details dd{color:#3f3f46;margin:2px 0 0 0}.cta{text-align:center;padding:16px 0}.cta a{display:inline-block;background-color:#18181b;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}.footer{padding-top:24px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center}.footer a{color:#71717a;text-decoration:underline}</style></head><body><div class="container"><div class="card"><div class="header"><h1>{{course_name}}</h1><p>New course from {{college_name}}</p></div><div class="body"><p>Dear {{first_name}},</p><p>We are excited to announce a new course: <strong>{{course_name}}</strong>.</p><p>{{course_description}}</p><dl class="details"><dt>Duration</dt><dd>{{course_duration}}</dd><dt>Start Date</dt><dd>{{start_date}}</dd><dt>Instructor</dt><dd>{{instructor_name}}</dd></dl></div><div class="cta"><a href="{{cta_url}}">Enroll Now</a></div><div class="footer"><p>You are receiving this because you are a member of {{college_name}}.</p><p><a href="{{dashboard_url}}">Visit Dashboard</a> &middot; <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></div></div></body></html>',
    'Dear {{first_name}},

We are excited to announce a new course: {{course_name}}.

{{course_description}}

Duration: {{course_duration}}
Start Date: {{start_date}}
Instructor: {{instructor_name}}

Enroll Now: {{cta_url}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}',
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"course_name","label":"Course Name","type":"string","required":true,"description":"Name of the course"},
        {"key":"course_description","label":"Course Description","type":"string","required":true,"description":"Brief course description"},
        {"key":"course_duration","label":"Course Duration","type":"string","required":true,"description":"e.g. 8 weeks, 3 months"},
        {"key":"start_date","label":"Start Date","type":"date","required":true,"description":"Course start date"},
        {"key":"instructor_name","label":"Instructor Name","type":"string","required":true,"description":"Instructor full name"},
        {"key":"college_name","label":"College Name","type":"string","required":true,"description":"Sender college name"},
        {"key":"cta_url","label":"CTA URL","type":"url","required":true,"description":"Enrollment link"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 4. deadline-reminder
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Deadline Reminder',
    'deadline-reminder',
    'notification',
    'Send a reminder about an upcoming deadline for assignments, payments, or registrations.',
    'Reminder: {{deadline_title}} – Due {{deadline_date}}',
    '{{deadline_title}} deadline is approaching. Complete it before {{deadline_date}}.',
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.container{max-width:600px;margin:0 auto;padding:24px 16px}.card{background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.alert{text-align:center;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px}.alert .icon{font-size:32px;margin-bottom:8px}.alert h2{font-size:18px;color:#991b1b;margin:0 0 4px}.alert p{font-size:14px;color:#b91c1c;margin:0}.body{padding:16px 0;font-size:15px;line-height:1.6;color:#3f3f46}.deadline-box{background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0;text-align:center}.deadline-box .label{font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.5px}.deadline-box .date{font-size:20px;font-weight:700;color:#dc2626;margin:4px 0}.cta{text-align:center;padding:16px 0}.cta a{display:inline-block;background-color:#18181b;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}.footer{padding-top:24px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center}.footer a{color:#71717a;text-decoration:underline}</style></head><body><div class="container"><div class="card"><div class="alert"><div class="icon">⏰</div><h2>Deadline Approaching</h2><p>Action required before {{deadline_date}}</p></div><div class="body"><p>Dear {{first_name}},</p><p>This is a friendly reminder that the deadline for <strong>{{deadline_title}}</strong> is approaching.</p><p>{{deadline_description}}</p><div class="deadline-box"><div class="label">Due Date</div><div class="date">{{deadline_date}}</div></div><p>Please complete this before the deadline to avoid any penalties or missed opportunities.</p></div><div class="cta"><a href="{{cta_url}}">{{cta_label}}</a></div><div class="footer"><p><a href="{{dashboard_url}}">Visit Dashboard</a> &middot; <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></div></div></body></html>',
    '⏰ DEADLINE APPROACHING

Dear {{first_name}},

This is a friendly reminder that the deadline for {{deadline_title}} is approaching.

{{deadline_description}}

Due Date: {{deadline_date}}

Please complete this before the deadline to avoid any penalties or missed opportunities.

{{cta_label}}: {{cta_url}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}',
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"deadline_title","label":"Deadline Title","type":"string","required":true,"description":"What the deadline is for"},
        {"key":"deadline_description","label":"Deadline Description","type":"string","required":true,"description":"Details about the deadline"},
        {"key":"deadline_date","label":"Deadline Date","type":"date","required":true,"description":"Due date"},
        {"key":"cta_url","label":"CTA URL","type":"url","required":true,"description":"Action link"},
        {"key":"cta_label","label":"CTA Label","type":"string","required":true,"description":"Action button text"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 5. event-webinar-invite
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Event & Webinar Invite',
    'event-webinar-invite',
    'marketing',
    'Invite recipients to a live event, webinar, or workshop.',
    'You''re Invited: {{event_name}} – {{event_date}}',
    'Join us for {{event_name}} on {{event_date}}. Reserve your spot now.',
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.container{max-width:600px;margin:0 auto;padding:24px 16px}.card{background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.header{text-align:center;padding-bottom:24px;border-bottom:1px solid #e4e4e7}.header h1{font-size:24px;color:#18181b;margin:0 0 8px}.header p{font-size:14px;color:#71717a;margin:0}.body{padding:24px 0;font-size:15px;line-height:1.6;color:#3f3f46}.event-info{background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0}.event-info dt{font-weight:600;color:#18181b;margin-top:8px}.event-info dt:first-child{margin-top:0}.event-info dd{color:#3f3f46;margin:2px 0 0 0}.cta{text-align:center;padding:16px 0}.cta a{display:inline-block;background-color:#18181b;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}.footer{padding-top:24px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center}.footer a{color:#71717a;text-decoration:underline}</style></head><body><div class="container"><div class="card"><div class="header"><h1>{{event_name}}</h1><p>You are cordially invited</p></div><div class="body"><p>Dear {{first_name}},</p><p>We are excited to invite you to <strong>{{event_name}}</strong>.</p><p>{{event_description}}</p><dl class="event-info"><dt>Date</dt><dd>{{event_date}}</dd><dt>Time</dt><dd>{{event_time}}</dd><dt>Platform</dt><dd>{{event_platform}}</dd></dl></div><div class="cta"><a href="{{cta_url}}">Reserve My Spot</a></div><div class="footer"><p><a href="{{dashboard_url}}">Visit Dashboard</a> &middot; <a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></div></div></body></html>',
    'Dear {{first_name}},

We are excited to invite you to {{event_name}}.

{{event_description}}

Date: {{event_date}}
Time: {{event_time}}
Platform: {{event_platform}}

Reserve My Spot: {{cta_url}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}',
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"event_name","label":"Event Name","type":"string","required":true,"description":"Name of the event"},
        {"key":"event_description","label":"Event Description","type":"string","required":true,"description":"Brief description of the event"},
        {"key":"event_date","label":"Event Date","type":"date","required":true,"description":"Date of the event"},
        {"key":"event_time","label":"Event Time","type":"string","required":true,"description":"Time of the event"},
        {"key":"event_platform","label":"Event Platform","type":"string","required":true,"description":"Platform hosting the event"},
        {"key":"cta_url","label":"CTA URL","type":"url","required":true,"description":"Registration link"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 6. blank-professional
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Blank Professional',
    'blank-professional',
    'custom',
    'Start with a clean, professional email template and build from scratch.',
    '{{subject}}',
    null,
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.container{max-width:600px;margin:0 auto;padding:24px 16px}.card{background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.body{font-size:15px;line-height:1.6;color:#3f3f46}.footer{padding-top:24px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center}.footer a{color:#71717a;text-decoration:underline}</style></head><body><div class="container"><div class="card"><div class="body">{{body}}</div><div class="footer"><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></div></div></body></html>',
    '{{body}}

---
Unsubscribe: {{unsubscribe_url}}',
    '[
        {"key":"subject","label":"Subject","type":"string","required":true,"description":"Email subject line"},
        {"key":"body","label":"Body","type":"string","required":true,"description":"Email body content (supports HTML)"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

commit;
-- Email Center Professional Template Upgrade
-- Migration: 00108_email_templates_professional.sql
-- Updates the 6 system templates with professional, Gmail-compatible layouts.

begin;

-- 1. new-course-announcement
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'New Course Announcement',
    'new-course-announcement',
    'announcement',
    'Announce a new course available for enrollment.',
    'New Course: {{course_name}} - Enroll Now',
    '{{college_name}} has launched {{course_name}}. Secure your spot today.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    {{college_name}} has launched {{course_name}}. Secure your spot today.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1F2937;">
                <tr>
                  <td style="padding:20px 24px;" align="left">
                    <img src="{{logo_url}}" width="120" alt="{{company_name}}" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;">
                  </td>
                  <td style="padding:20px 24px;text-align:right;color:#F9FAFB;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
                    {{college_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;">
                <tr>
                  <td style="padding:40px 30px;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
                    <span style="display:inline-block;background-color:#E8790C;color:#FFFFFF;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
                      New Course Launch
                    </span>
                    <h1 style="margin:16px 0 12px 0;font-size:26px;line-height:1.2;color:#111827;">{{course_name}}</h1>
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#374151;">Hello {{first_name}},</p>
                    <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#374151;">{{course_description}}</p>
                    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#6B7280;">
                      <strong style="color:#374151;">Instructor:</strong> {{instructor_name}}
                    </p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:0 0 12px 0;font-size:16px;line-height:1.6;color:#374151;font-weight:700;">
                          Course Highlights
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="50%" style="padding:6px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                            <tr><td style="padding:14px;font-size:14px;color:#111827;">Technical Foundations</td></tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:6px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                            <tr><td style="padding:14px;font-size:14px;color:#111827;">AI &amp; Modern Development</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:6px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                            <tr><td style="padding:14px;font-size:14px;color:#111827;">Hands-on Projects</td></tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:6px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                            <tr><td style="padding:14px;font-size:14px;color:#111827;">Career Readiness</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:6px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                            <tr><td style="padding:14px;font-size:14px;color:#111827;">Communication &amp; Behavioral Skills</td></tr>
                          </table>
                        </td>
                        <td width="50%" style="padding:6px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                            <tr><td style="padding:14px;font-size:14px;color:#111827;">Mentorship</td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;">
                      <tr>
                        <td style="background-color:#ECFDF3;border:1px solid #A7F3D0;border-radius:10px;padding:16px;">
                          <p style="margin:0;font-size:14px;line-height:1.5;color:#065F46;">
                            Certificate Highlight: Earn an industry-recognized certificate upon completion.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" bgcolor="#E8790C" style="border-radius:8px;">
                                <a href="{{cta_url}}" style="display:inline-block;padding:12px 28px;font-size:15px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;">
                <tr>
                  <td style="border-top:1px solid #E5E7EB;padding-top:16px;text-align:center;font-size:12px;color:#9CA3AF;">
                    &copy; {{company_name}}. All rights reserved.<br>
                    <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Visit Dashboard</a> &nbsp;|&nbsp;
                    <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hello {{first_name}},

{{college_name}} has launched {{course_name}}.

{{course_description}}

Instructor: {{instructor_name}}

Course Highlights:
- Technical Foundations
- AI & Modern Development
- Hands-on Projects
- Career Readiness
- Communication & Behavioral Skills
- Mentorship

Certificate Highlight: Earn an industry-recognized certificate upon completion.

{{cta_label}}: {{cta_url}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"course_name","label":"Course Name","type":"string","required":true,"description":"Name of the course"},
        {"key":"course_description","label":"Course Description","type":"string","required":true,"description":"Brief course description"},
        {"key":"instructor_name","label":"Instructor Name","type":"string","required":true,"description":"Instructor full name"},
        {"key":"college_name","label":"College Name","type":"string","required":true,"description":"Sender college name"},
        {"key":"cta_url","label":"CTA URL","type":"url","required":true,"description":"Enrollment link"},
        {"key":"cta_label","label":"CTA Label","type":"string","required":true,"description":"Call-to-action button text","default":"Enroll Now"},
        {"key":"company_name","label":"Company Name","type":"string","required":false,"description":"Brand name","default":"NextGen CTO"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"},
        {"key":"logo_url","label":"Logo URL","type":"url","required":false,"description":"Logo image URL","default":"https://nextgencto.com/images/logo-email.png"}
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
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Important information from {{college_name}} regarding {{notice_title}}.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1F2937;">
                <tr>
                  <td style="padding:20px 24px;" align="left">
                    <img src="{{logo_url}}" width="120" alt="{{company_name}}" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;">
                  </td>
                  <td style="padding:20px 24px;text-align:right;color:#F9FAFB;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
                    {{college_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;">
                <tr>
                  <td style="padding:40px 30px;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
                    <span style="display:inline-block;background-color:#DC2626;color:#FFFFFF;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
                      Official Notice
                    </span>
                    <h1 style="margin:16px 0 8px 0;font-size:26px;line-height:1.2;color:#111827;">{{notice_title}}</h1>
                    <p style="margin:0 0 20px 0;font-size:14px;color:#6B7280;">{{college_name}} &middot; {{notice_date}}</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
                      <tr>
                        <td style="background-color:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;padding:14px;font-size:14px;color:#92400E;">
                          Important: Please review this notice carefully.
                        </td>
                      </tr>
                    </table>

                    <div style="font-size:16px;line-height:1.6;color:#374151;">{{notice_body}}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;">
                <tr>
                  <td style="border-top:1px solid #E5E7EB;padding-top:16px;text-align:center;font-size:12px;color:#9CA3AF;">
                    &copy; {{company_name}}. All rights reserved.<br>
                    <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Visit Dashboard</a> &nbsp;|&nbsp;
                    <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$OFFICIAL NOTICE

{{notice_title}}
{{college_name}} - {{notice_date}}

Hello {{first_name}},

{{notice_body}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"notice_title","label":"Notice Title","type":"string","required":true,"description":"Title of the notice"},
        {"key":"notice_body","label":"Notice Body","type":"string","required":true,"description":"Main notice content (supports HTML)"},
        {"key":"notice_date","label":"Notice Date","type":"date","required":true,"description":"Date of the notice"},
        {"key":"college_name","label":"College Name","type":"string","required":true,"description":"Sender college name"},
        {"key":"company_name","label":"Company Name","type":"string","required":false,"description":"Brand name","default":"NextGen CTO"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"},
        {"key":"logo_url","label":"Logo URL","type":"url","required":false,"description":"Logo image URL","default":"https://nextgencto.com/images/logo-email.png"}
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

-- 3. deadline-reminder
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Deadline Reminder',
    'deadline-reminder',
    'notification',
    'Send a reminder about an upcoming deadline for assignments, payments, or registrations.',
    'Reminder: {{deadline_title}} - Due {{deadline_date}}',
    '{{deadline_title}} deadline is approaching. Complete it before {{deadline_date}}.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    {{deadline_title}} deadline is approaching. Complete it before {{deadline_date}}.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1F2937;">
                <tr>
                  <td style="padding:20px 24px;" align="left">
                    <img src="{{logo_url}}" width="120" alt="{{company_name}}" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;">
                  </td>
                  <td style="padding:20px 24px;text-align:right;color:#F9FAFB;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
                    {{college_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;">
                <tr>
                  <td style="padding:40px 30px;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
                    <span style="display:inline-block;background-color:#E8790C;color:#FFFFFF;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
                      Deadline Reminder
                    </span>
                    <h1 style="margin:16px 0 12px 0;font-size:26px;line-height:1.2;color:#111827;">{{deadline_title}}</h1>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;">
                      <tr>
                        <td style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px;text-align:center;">
                          <div style="font-size:26px;line-height:1;">&#x23F0;</div>
                          <div style="font-size:16px;font-weight:700;color:#991B1B;margin-top:6px;">Deadline Approaching</div>
                          <div style="font-size:13px;color:#B91C1C;margin-top:2px;">Action required before {{deadline_date}}</div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#374151;">Hello {{first_name}},</p>
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#374151;">{{deadline_description}}</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;">
                      <tr>
                        <td style="background-color:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;padding:16px;text-align:center;">
                          <div style="font-size:12px;color:#9A3412;text-transform:uppercase;letter-spacing:0.6px;">Due Date</div>
                          <div style="font-size:22px;font-weight:700;color:#DC2626;margin-top:4px;">{{deadline_date}}</div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" bgcolor="#E8790C" style="border-radius:8px;">
                                <a href="{{cta_url}}" style="display:inline-block;padding:12px 28px;font-size:15px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;">
                <tr>
                  <td style="border-top:1px solid #E5E7EB;padding-top:16px;text-align:center;font-size:12px;color:#9CA3AF;">
                    &copy; {{company_name}}. All rights reserved.<br>
                    <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Visit Dashboard</a> &nbsp;|&nbsp;
                    <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$DEADLINE REMINDER

Hello {{first_name}},

{{deadline_title}} is due on {{deadline_date}}.

{{deadline_description}}

{{cta_label}}: {{cta_url}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"deadline_title","label":"Deadline Title","type":"string","required":true,"description":"What the deadline is for"},
        {"key":"deadline_description","label":"Deadline Description","type":"string","required":true,"description":"Details about the deadline"},
        {"key":"deadline_date","label":"Deadline Date","type":"date","required":true,"description":"Due date"},
        {"key":"college_name","label":"College Name","type":"string","required":true,"description":"Sender college name"},
        {"key":"cta_url","label":"CTA URL","type":"url","required":true,"description":"Action link"},
        {"key":"cta_label","label":"CTA Label","type":"string","required":true,"description":"Action button text"},
        {"key":"company_name","label":"Company Name","type":"string","required":false,"description":"Brand name","default":"NextGen CTO"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"},
        {"key":"logo_url","label":"Logo URL","type":"url","required":false,"description":"Logo image URL","default":"https://nextgencto.com/images/logo-email.png"}
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

-- 4. event-webinar-invite
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Event & Webinar Invite',
    'event-webinar-invite',
    'marketing',
    'Invite recipients to a live event, webinar, or workshop.',
    'You''re Invited: {{event_name}} - {{event_date}}',
    'Join us for {{event_name}} on {{event_date}}. Reserve your spot now.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Join us for {{event_name}} on {{event_date}}. Reserve your spot now.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1F2937;">
                <tr>
                  <td style="padding:20px 24px;" align="left">
                    <img src="{{logo_url}}" width="120" alt="{{company_name}}" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;">
                  </td>
                  <td style="padding:20px 24px;text-align:right;color:#F9FAFB;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
                    {{college_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;">
                <tr>
                  <td style="padding:40px 30px;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
                    <span style="display:inline-block;background-color:#7C3AED;color:#FFFFFF;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
                      You're Invited
                    </span>
                    <h1 style="margin:16px 0 12px 0;font-size:26px;line-height:1.2;color:#111827;">{{event_name}}</h1>
                    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#374151;">Hello {{first_name}},</p>
                    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#374151;">{{event_description}}</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:700;width:30%;">Date</td>
                        <td style="padding:14px 16px;font-size:14px;color:#374151;">{{event_date}}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:700;width:30%;border-top:1px solid #E5E7EB;">Time</td>
                        <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #E5E7EB;">{{event_time}}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:700;width:30%;border-top:1px solid #E5E7EB;">Platform</td>
                        <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #E5E7EB;">{{event_platform}}</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" bgcolor="#E8790C" style="border-radius:8px;">
                                <a href="{{cta_url}}" style="display:inline-block;padding:12px 28px;font-size:15px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">Reserve My Spot</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;">
                <tr>
                  <td style="border-top:1px solid #E5E7EB;padding-top:16px;text-align:center;font-size:12px;color:#9CA3AF;">
                    &copy; {{company_name}}. All rights reserved.<br>
                    <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Visit Dashboard</a> &nbsp;|&nbsp;
                    <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$EVENT INVITE

Hello {{first_name}},

You are invited to {{event_name}}.

{{event_description}}

Date: {{event_date}}
Time: {{event_time}}
Platform: {{event_platform}}

Reserve My Spot: {{cta_url}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"event_name","label":"Event Name","type":"string","required":true,"description":"Name of the event"},
        {"key":"event_description","label":"Event Description","type":"string","required":true,"description":"Brief description of the event"},
        {"key":"event_date","label":"Event Date","type":"date","required":true,"description":"Date of the event"},
        {"key":"event_time","label":"Event Time","type":"string","required":true,"description":"Time of the event"},
        {"key":"event_platform","label":"Event Platform","type":"string","required":true,"description":"Platform hosting the event"},
        {"key":"college_name","label":"College Name","type":"string","required":true,"description":"Sender college name"},
        {"key":"cta_url","label":"CTA URL","type":"url","required":true,"description":"Registration link"},
        {"key":"company_name","label":"Company Name","type":"string","required":false,"description":"Brand name","default":"NextGen CTO"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"},
        {"key":"logo_url","label":"Logo URL","type":"url","required":false,"description":"Logo image URL","default":"https://nextgencto.com/images/logo-email.png"}
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

-- 5. premium-product-launch
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Premium Product Launch',
    'premium-product-launch',
    'product_launch',
    'Announce a new premium product or course to your platform audience.',
    'Introducing {{product_name}} - Now Available',
    'Learn more about {{product_name}} and get started today.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Learn more about {{product_name}} and get started today.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1F2937;">
                <tr>
                  <td style="padding:20px 24px;" align="left">
                    <img src="{{logo_url}}" width="120" alt="{{company_name}}" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;">
                  </td>
                  <td style="padding:20px 24px;text-align:right;color:#F9FAFB;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
                    {{college_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;">
                <tr>
                  <td style="padding:40px 30px;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
                    <span style="display:inline-block;background-color:#059669;color:#FFFFFF;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
                      New Launch
                    </span>
                    <h1 style="margin:16px 0 12px 0;font-size:26px;line-height:1.2;color:#111827;">Introducing {{product_name}}</h1>
                    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#374151;">Hello {{first_name}},</p>
                    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#374151;">We are thrilled to launch a premium experience built for ambitious learners.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;">
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#374151;">
                          <span style="color:#059669;font-weight:700;">&#x2714;</span> Executive-level curriculum
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#374151;">
                          <span style="color:#059669;font-weight:700;">&#x2714;</span> Applied capstone projects
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#374151;">
                          <span style="color:#059669;font-weight:700;">&#x2714;</span> Mentorship &amp; peer reviews
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#374151;">
                          <span style="color:#059669;font-weight:700;">&#x2714;</span> Career advancement toolkit
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" bgcolor="#E8790C" style="border-radius:8px;">
                                <a href="{{cta_url}}" style="display:inline-block;padding:12px 28px;font-size:15px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;">
                <tr>
                  <td style="border-top:1px solid #E5E7EB;padding-top:16px;text-align:center;font-size:12px;color:#9CA3AF;">
                    &copy; {{company_name}}. All rights reserved.<br>
                    <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Visit Dashboard</a> &nbsp;|&nbsp;
                    <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$INTRODUCING {{product_name}}

Hello {{first_name}},

Learn more about {{product_name}} and get started today.

{{cta_label}}: {{cta_url}}

Visit Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"product_name","label":"Product Name","type":"string","required":true,"description":"Name of the product being launched"},
        {"key":"college_name","label":"College Name","type":"string","required":true,"description":"Sender college name"},
        {"key":"cta_url","label":"CTA URL","type":"url","required":true,"description":"Call-to-action link"},
        {"key":"cta_label","label":"CTA Label","type":"string","required":true,"description":"Call-to-action button text","default":"Learn More"},
        {"key":"company_name","label":"Company Name","type":"string","required":false,"description":"Brand name","default":"NextGen CTO"},
        {"key":"dashboard_url","label":"Dashboard URL","type":"url","required":false,"description":"Dashboard link"},
        {"key":"unsubscribe_url","label":"Unsubscribe URL","type":"url","required":false,"description":"Unsubscribe link"},
        {"key":"logo_url","label":"Logo URL","type":"url","required":false,"description":"Logo image URL","default":"https://nextgencto.com/images/logo-email.png"}
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
    '{{body (first 50 characters)}}',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    {{body}}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1F2937;">
                <tr>
                  <td style="padding:20px 24px;" align="left">
                    <img src="{{logo_url}}" width="120" alt="{{company_name}}" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;">
                  </td>
                  <td style="padding:20px 24px;text-align:right;color:#F9FAFB;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
                    {{company_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;">
                <tr>
                  <td style="padding:40px 30px;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
                    <h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;color:#111827;">{{subject}}</h1>
                    <div style="font-size:16px;line-height:1.6;color:#374151;">{{body}}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;">
                <tr>
                  <td style="border-top:1px solid #E5E7EB;padding-top:16px;text-align:center;font-size:12px;color:#9CA3AF;">
                    © {{company_name}}. All rights reserved.<br>
                    <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $${{subject}}

{{body}}

Unsubscribe: {{unsubscribe_url}}$$,
    '[
        {"key":"first_name","label":"First Name","type":"string","required":true,"description":"Recipient first name"},
        {"key":"subject","label":"Subject","type":"string","required":true,"description":"Email subject line"},
        {"key":"body","label":"Body","type":"string","required":true,"description":"Email body content (supports HTML)"},
        {"key":"company_name","label":"Company Name","type":"string","required":false,"description":"Brand name","default":"NextGen CTO"},
        {"key":"logo_url","label":"Logo URL","type":"url","required":false,"description":"Logo image URL","default":"https://nextgencto.com/images/logo-email.png"},
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

begin;

-- Email Center: career-readiness-program-launch foundation (public logo URL, College Leads shell, variables)
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Career Readiness Program Launch',
  'career-readiness-program-launch',
  'marketing',
  'Launch announcement for the Career Readiness Program. Detailed walkthrough of the structured career readiness journey with foundations, projects, profiles, AI exposure, and interview preparation.',
  'Welcome to {{program_name}}',
  'Your college has enabled access to {{program_name}} - build foundations, projects, profiles, and interview readiness.',
  $crl_html$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to {{program_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#111827;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Your college has enabled access to {{program_name}} - build foundations, projects, profiles, AI exposure, and interview readiness.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;border-bottom:2px solid #F59E0B;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="{{email_logo_url}}" alt="NextGen CTO Logo" style="width:48px;height:auto;display:block;border:0;outline:none;text-decoration:none;" />
                  </td>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;padding-left:12px;vertical-align:middle;">NextGen CTO &times; {{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 22px 24px 22px;background-color:#FFFFFF;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Program Launch</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Welcome to {{program_name}}</h1>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">Hi <strong>{{first_name}}</strong>,</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 26px 0;">
                <tr>
                  <td align="left">
                    <a href="{{cta_url}}" style="display:inline-block;background:linear-gradient(135deg, #e58c33 0%, #d97a1f 100%);color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 22px;border-radius:50px;box-shadow:0 6px 20px rgba(229, 140, 51, 0.35);letter-spacing:0.5px;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your college has enabled access to <strong>{{program_name}}</strong> - a structured career readiness journey designed to help you move from learning concepts to building real career assets.</p>
              <p style="margin:0 0 6px 0;font-size:15px;line-height:1.7;color:#334155;">This is not just another course.</p>
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">It is designed to help you build the things that actually matter when you start preparing for internships, interviews, and your first serious career opportunities:</p>
              <ul style="margin:0 0 18px 0;padding-left:18px;">
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Strong technical foundations</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Hands-on project experience</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">GitHub, Resume, and LinkedIn readiness</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">AI-powered development exposure</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Interview and communication confidence</li>
                <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Mentorship and community support</li>
              </ul>

              <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">Why this matters</p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#334155;">Most students learn randomly.</p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#334155;">One day DSA. One day web development. One day AI tools. One day resume building.</p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#334155;">But without a clear path, learning becomes confusing.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">{{program_name}} gives you a structured roadmap so you know what to learn, what to build, and how to present your work professionally.</p>

              <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">What you will work on</p>
              <ol style="margin:0 0 18px 0;padding-left:18px;">
                <li style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Build your technical base.</strong> Strengthen programming fundamentals, problem-solving thinking, web basics, backend concepts, APIs, databases, Git, and GitHub.</li>
                <li style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Explore modern AI-powered development.</strong> Learn how AI-assisted coding, prompt basics, generative AI, agentic AI concepts, and simple automation workflows fit into modern software development.</li>
                <li style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Create project proof.</strong> Work on portfolio-building and real-world application practice so your learning is visible, not hidden inside notebooks or theory.</li>
                <li style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Improve your career profile.</strong> Start building a stronger Resume, GitHub profile, and LinkedIn presence so you look more prepared when opportunities come.</li>
                <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;"><strong>Prepare for interviews with confidence.</strong> Improve communication, structured thinking, interview mindset, and practical readiness with mentorship and guided support.</li>
              </ol>

              <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">What you should aim for</p>
              <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;color:#334155;">By the end of this journey, you should be able to show visible progress:</p>
              <ul style="margin:0 0 18px 0;padding-left:18px;">
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">A stronger understanding of technical concepts</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">A GitHub profile with meaningful project work</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">A more complete Resume + LinkedIn profile</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Better confidence in interviews and communication</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Exposure to AI-driven development workflows</li>
                <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">A clear eligibility path for the NextGen CTO Academy Industry Ready Certificate</li>
              </ul>

              <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">Your first step</p>
              <p style="margin:0 0 6px 0;font-size:15px;line-height:1.7;color:#334155;">Open your dashboard, explore the roadmap, and start with the first recommended module.</p>
              <p style="margin:0 0 6px 0;font-size:15px;line-height:1.7;color:#334155;">Do not wait for the perfect time.</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">Start small. Stay consistent. Build visible proof.</p>

              <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0F172A;">Need help during the journey?</p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#334155;">You are not expected to figure everything out alone. Use the support and community channels whenever you feel stuck.</p>
              <p style="margin:0 0 8px 0;font-size:13px;color:#5A3D1A;">Support: <a href="{{support_url}}" style="color:#F4A854;text-decoration:none;font-weight:600;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="text-align:center;margin-top:50px;font-size:0.9em;color:#777;padding:25px 20px;background:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{email_logo_url}}" alt="NextGen CTO" width="56" style="display:block;border:0;outline:none;text-decoration:none;height:auto;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.2;color:#1E335C;">NextGen CTO</td>
                </tr>
              </table>
              <div style="margin:auto;text-align:center;">
                <p style="color:#172B4D;font-size:14px;font-weight:600;">Follow us on</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                  <tr>
                    <td style="padding:0 6px;">
                      <a href="https://www.instagram.com/code.with.ctobhaiya?igsh=MTgyM3ZyY2V6enJheQ==" style="cursor:pointer;text-decoration:none;">
                        <img src="https://algozenith.s3.ap-south-1.amazonaws.com/content/07-06-24/8059_a58afaf2-29b8-4761-9c0e-6d9fc6ae6f4a.png" style="width:40px;height:40px;" alt="Instagram">
                      </a>
                    </td>
                    <td style="padding:0 6px;">
                      <a href="https://www.linkedin.com/in/anuj-kumar-a-k-a-cto-bhaiya-on-youtube-9a188968/" style="cursor:pointer;text-decoration:none;">
                        <img src="https://algozenith.s3.ap-south-1.amazonaws.com/content/07-06-24/8059_44a6715c-441d-43f8-b5ee-bad637d717d3.png" style="width:40px;height:40px;" alt="LinkedIn">
                      </a>
                    </td>
                    <td style="padding:0 6px;">
                      <a href="https://www.youtube.com/@CodingwithCTOBhaiya" style="cursor:pointer;text-decoration:none;">
                        <img src="https://algozenith.s3.ap-south-1.amazonaws.com/content/07-06-24/8059_11a31c49-ba39-442b-81ac-b0816e2a71a1.png" style="width:40px;height:40px;" alt="YouTube">
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="flex-grow:1;height:1px;background-color:black;margin-top:2rem;"></div>
              <p style="font-weight:300;margin:0;padding:0;text-align:center;font-size:15px;">
                If you are no longer interested, click <a href="{{unsubscribe_url}}">here</a> to unsubscribe.
              </p>
              <p style="font-weight:300;margin-top:6px;text-align:center;font-size:15px;">© Copyright 2025. NextGen CTO Pvt Ltd. All Rights Reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$crl_html$,
  $crl_txt$Hi {{first_name}},

{{cta_label}}: {{cta_url}}

Your college has enabled access to {{program_name}} - a structured career readiness journey designed to help you move from learning concepts to building real career assets.

This is not just another course.

It is designed to help you build the things that actually matter when you start preparing for internships, interviews, and your first serious career opportunities:

Strong technical foundations
Hands-on project experience
GitHub, Resume, and LinkedIn readiness
AI-powered development exposure
Interview and communication confidence
Mentorship and community support

Why this matters

Most students learn randomly.

One day DSA.
One day web development.
One day AI tools.
One day resume building.

But without a clear path, learning becomes confusing.

{{program_name}} gives you a structured roadmap so you know what to learn, what to build, and how to present your work professionally.

What you will work on

1. Build your technical base
   Strengthen programming fundamentals, problem-solving thinking, web basics, backend concepts, APIs, databases, Git, and GitHub.

2. Explore modern AI-powered development
   Learn how AI-assisted coding, prompt basics, generative AI, agentic AI concepts, and simple automation workflows fit into modern software development.

3. Create project proof
   Work on portfolio-building and real-world application practice so your learning is visible, not hidden inside notebooks or theory.

4. Improve your career profile
   Start building a stronger Resume, GitHub profile, and LinkedIn presence so you look more prepared when opportunities come.

5. Prepare for interviews with confidence
   Improve communication, structured thinking, interview mindset, and practical readiness with mentorship and guided support.

What you should aim for

By the end of this journey, you should be able to show visible progress:

A stronger understanding of technical concepts
A GitHub profile with meaningful project work
A more complete Resume + LinkedIn profile
Better confidence in interviews and communication
Exposure to AI-driven development workflows
A clear eligibility path for the NextGen CTO Academy Industry Ready Certificate

Your first step

Open your dashboard, explore the roadmap, and start with the first recommended module.

Do not wait for the perfect time.

Start small. Stay consistent. Build visible proof.

Need help during the journey?

You are not expected to figure everything out alone. Use the support and community channels whenever you feel stuck.

Support: {{support_url}}

You are receiving this email because you are part of {{program_name}}.

Unsubscribe or manage preferences:
{{unsubscribe_url}}$crl_txt$,
  $crl_vars$[{"key":"email_logo_url","label":"Brand logo URL","required":false,"sample":"https://www.nextgen-cto.in/assets/logo-hd.png","inputType":"url","source":"system","helpText":"Public HTTPS URL from EMAIL_BRAND_LOGO_URL or NEXT_PUBLIC_EMAIL_BRAND_LOGO_URL. Not a campaign field."},{"key":"first_name","label":"Recipient first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient","helpText":"Auto-filled from recipient profile or email. Not a campaign field."},{"key":"full_name","label":"Recipient full name","required":false,"sample":"Anuj Sharma","inputType":"text","source":"recipient","helpText":"Auto-filled from recipient profile."},{"key":"college_name","label":"College name","required":false,"sample":"MAIT","inputType":"text","source":"recipient","helpText":"Auto-filled from audience context."},{"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},{"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},{"key":"cta_label","label":"CTA button text","required":true,"sample":"Open your dashboard","inputType":"text","source":"campaign"},{"key":"support_url","label":"Support URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},{"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"System-generated on send. Preview-only in Email Center."}]$crl_vars$::jsonb,
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
  is_system = excluded.is_system,
  is_active = excluded.is_active,
  updated_at = now();

commit;

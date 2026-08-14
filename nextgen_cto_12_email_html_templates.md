# NextGen CTO Email Center — 12 Career Readiness HTML Templates

All templates below use the premium email-safe UI system: slate background `#F1F5F9`, white card, dark header `#0B0F19`, orange CTA `#F97316`, table-based layout, inline CSS, and mobile-safe width rules.

Notes:
- These are the 12 active Career Readiness templates only.
- Old Professional templates are intentionally not included.
- No fixed hour count, no banned program wording, and no generic shared variable set.
- Student-facing templates include unsubscribe/preferences. The college-admin report is operational/admin-facing and does not include `{{first_name}}` or `{{unsubscribe_url}}`.

---

## 1. Career Readiness Program Launch

**Slug:** `career-readiness-program-launch`  
**Category:** `marketing`

**Subject Template:**
```txt
Welcome to {{program_name}}
```

**Preview Text:**
```txt
Start your college-aligned career readiness journey with foundations, projects, and mentoring.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
Your college has enabled access to {{program_name}} — a structured career readiness journey designed to help you move from learning concepts to building real career assets.
This is not just another course. It helps you build foundations, projects, Resume/GitHub/LinkedIn readiness, AI-powered development exposure, interview confidence, and mentorship support.
Open your dashboard, explore the roadmap, and start with the first recommended module.
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to {{program_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Start your college-aligned career readiness journey with foundations, projects, and mentoring.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Career Readiness</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Program Launch</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Welcome to {{program_name}}</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your college has enabled access to <strong>{{program_name}}</strong> — a structured career readiness journey designed to help you move from learning concepts to building real career assets.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This is not just another course. It helps you build foundations, projects, Resume/GitHub/LinkedIn readiness, AI-powered development exposure, interview confidence, and mentorship support.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#0F172A;text-transform:uppercase;letter-spacing:0.05em;">What you will focus on</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Technical foundations and problem-solving</li><li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Projects that show real proof</li><li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Profile readiness: Resume, GitHub, LinkedIn</li><li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">AI-powered development exposure</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Mentorship and interview confidence</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;"><tr><td style="padding:16px 18px;"><p style="margin:0;font-size:14px;line-height:1.7;color:#9A3412;">Open your dashboard, explore the roadmap, and start with the first recommended module.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Student Onboarding: Career Readiness Roadmap

**Slug:** `student-onboarding-career-readiness-roadmap`  
**Category:** `announcement`

**Subject Template:**
```txt
Your roadmap for {{program_name}}
```

**Preview Text:**
```txt
Start with foundations, then AI, projects, and profile readiness.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{dashboard_url}}` | url | No | system |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
Welcome to your roadmap for {{program_name}}.
Start with technical foundations, then move to AI and modern development, then project proof, and finally Resume, GitHub, LinkedIn, and interview readiness.
Do not try to do everything randomly. Follow the roadmap step by step.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your roadmap for {{program_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Start with foundations, then AI, projects, and profile readiness.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Roadmap</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Student Onboarding</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Your roadmap for {{program_name}}</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">Welcome to your roadmap for {{program_name}}. Start with foundations, then move to AI and modern development, then project proof, and finally Resume, GitHub, LinkedIn, and interview readiness.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Do not try to do everything randomly. Follow the roadmap step by step.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Step 1: Foundations</p><p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">Programming basics, DSA thinking, web/backend basics, APIs, databases, Git, GitHub.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Step 2: AI + modern development</p><p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">AI-assisted coding, prompt thinking, generative and agentic AI basics, workflows.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Step 3: Projects + profile readiness</p><p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">Project proof, Resume, GitHub, LinkedIn, and interview readiness.</p></td></tr></table>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">Your dashboard will help you track what is complete and what needs attention next.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Technical Foundations Reminder

**Slug:** `technical-foundations-reminder`  
**Category:** `notification`

**Subject Template:**
```txt
Technical foundations: your next milestone
```

**Preview Text:**
```txt
Complete the programming and DSA foundations to stay on track in your career readiness journey.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{module_name}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{dashboard_url}}` | url | No | system |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
Your next milestone in {{program_name}} is {{module_name}}.
Before tools and shortcuts, your fundamentals must be clear. Continue the module and strengthen programming basics, problem-solving thinking, web/backend concepts, APIs, databases, Git, and GitHub.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Technical foundations: your next milestone</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Complete the programming and DSA foundations to stay on track in your career readiness journey.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Foundations</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Technical Foundations</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Technical foundations: your next milestone</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your next milestone in {{program_name}} is {{module_name}}. Before tools and shortcuts, your fundamentals must be clear.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Continue the module and strengthen programming basics, problem-solving thinking, web/backend concepts, APIs, databases, Git, and GitHub.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Focus areas</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Programming basics and DSA thinking</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Web and backend fundamentals</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">APIs, databases, Git, and GitHub</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Problem-solving confidence</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">Strong fundamentals help you understand what AI tools generate, debug faster, and explain your work clearly in interviews.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. AI and Agentic AI Module Announcement

**Slug:** `ai-agentic-ai-module-announcement`  
**Category:** `announcement`

**Subject Template:**
```txt
AI and modern development module is open
```

**Preview Text:**
```txt
Explore AI-assisted coding, prompt engineering, and agentic AI fundamentals.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{module_name}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{dashboard_url}}` | url | No | system |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
AI is changing how developers write, debug, and build software.
The real advantage is not just using AI tools. The real advantage is knowing how to use AI with strong fundamentals and clear thinking.
Start the {{module_name}} module inside {{program_name}} and explore AI-assisted coding, prompt thinking, generative and agentic AI basics, automation workflows, and hands-on AI project practice.
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AI and modern development module is open</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Explore AI-assisted coding, prompt engineering, and agentic AI fundamentals.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">AI & Modern Dev</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Module Announcement</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">AI and modern development module is open</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">AI is changing how developers write, debug, and build software. The real advantage is not just using AI tools.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">The real advantage is knowing how to use AI with strong fundamentals and clear thinking. Start the {{module_name}} module inside {{program_name}} and explore AI-assisted coding, prompt thinking, generative and agentic AI basics, automation workflows, and hands-on AI project practice.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">You will explore</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">AI-assisted coding and debugging</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Prompt thinking and automation workflows</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Generative and agentic AI basics</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">How fundamentals still drive quality</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#1E3A8A;">AI is a support tool, not a shortcut. Build clarity, then use AI to move faster and smarter.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Project Completion Nudge

**Slug:** `project-completion-nudge`  
**Category:** `notification`

**Subject Template:**
```txt
Your project can become your strongest proof
```

**Preview Text:**
```txt
Finish your project, push it to GitHub, and make your learning visible.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{project_name}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{dashboard_url}}` | url | No | system |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
Quick reminder — your {{project_name}} milestone inside {{program_name}} is waiting for you.
A completed project shows that you can actually build. Finish the core features, push your code to GitHub, write a simple README, and mention what you learned.
Do not aim for perfect right now. Aim for complete.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your project can become your strongest proof</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Finish your project, push it to GitHub, and make your learning visible.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Project Milestone</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Project Completion</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Your project can become your strongest proof</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Quick reminder — your {{project_name}} milestone inside {{program_name}} is waiting for you.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">A completed project shows that you can actually build. Finish the core features, push your code to GitHub, write a simple README, and mention what you learned.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Make it visible</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Complete the core features</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Push the code to GitHub</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Write a simple README</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Summarize what you learned</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">Do not aim for perfect right now. Aim for complete.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 6. Resume, GitHub, LinkedIn Reminder

**Slug:** `resume-github-linkedin-reminder`  
**Category:** `notification`

**Subject Template:**
```txt
Your profile should show your effort
```

**Preview Text:**
```txt
Update your Resume, GitHub, and LinkedIn so your work is visible.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{dashboard_url}}` | url | No | system |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
Your learning needs visible proof.
Update your Resume, clean your GitHub, and improve your LinkedIn so mentors, recruiters, and college teams can understand what you have built.
Do not wait until placement season to fix your profile.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your profile should show your effort</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Update your Resume, GitHub, and LinkedIn so your work is visible.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Profile Readiness</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Profile Reminder</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Your profile should show your effort</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your learning needs visible proof. Update your Resume, clean your GitHub, and improve your LinkedIn so mentors, recruiters, and college teams can understand what you have built.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Do not wait until placement season to fix your profile.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Profile checklist</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Update your Resume with recent projects</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Clean up GitHub repos and README files</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Refresh LinkedIn summary and highlights</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 7. Mock Interview Invite

**Slug:** `mock-interview-invite`  
**Category:** `announcement`

**Subject Template:**
```txt
Your mock interview practice is scheduled
```

**Preview Text:**
```txt
Practice your answers, get mentor feedback, and build interview confidence.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{mentor_name}}` | string | Yes | campaign |
| `{{session_date}}` | string | Yes | campaign |
| `{{session_time}}` | string | Yes | campaign |
| `{{zoom_meeting_url}}` | url | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
Your mock interview practice session with {{mentor_name}} is coming up.
This session is not about being perfect. It is about practicing how you explain your thoughts, projects, and answers before a real interview.
Date: {{session_date}}
Time: {{session_time}}
Zoom Link: {{zoom_meeting_url}}
Keep your updated resume, one explainable project, and a calm feedback mindset ready.
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your mock interview practice is scheduled</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Practice your answers, get mentor feedback, and build interview confidence.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Mock Interview</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Interview Practice</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Your mock interview practice is scheduled</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your mock interview practice session with {{mentor_name}} is coming up.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This session is not about being perfect. It is about practicing how you explain your thoughts, projects, and answers before a real interview.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Session details</p><p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">Date: {{session_date}}<br>Time: {{session_time}}<br>Zoom: <a href="{{zoom_meeting_url}}" style="color:#2563EB;text-decoration:underline;">{{zoom_meeting_url}}</a></p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#1E3A8A;">Keep your updated resume, one explainable project, and a calm feedback mindset ready.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 8. Founder Mentorship Session Invite

**Slug:** `founder-mentorship-session-invite`  
**Category:** `announcement`

**Subject Template:**
```txt
You're invited to a practical mentorship session
```

**Preview Text:**
```txt
Get clarity on projects, profiles, interviews, and your next steps.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{mentor_name}}` | string | Yes | campaign |
| `{{session_date}}` | string | Yes | campaign |
| `{{session_time}}` | string | Yes | campaign |
| `{{zoom_meeting_url}}` | url | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
You are invited to a mentorship session with {{mentor_name}}.
This session is meant to be practical, direct, and useful — not a long motivational lecture.
You will get clarity on what to prioritize, how to avoid random learning, how to build better project proof, how to improve Resume, GitHub, and LinkedIn, how to prepare for interviews, and how to use AI, fundamentals, and projects together.
Date: {{session_date}}
Time: {{session_time}}
Zoom Link: {{zoom_meeting_url}}
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're invited to a practical mentorship session</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Get clarity on projects, profiles, interviews, and your next steps.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Mentorship</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Mentorship Session</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">You're invited to a practical mentorship session</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">You are invited to a mentorship session with {{mentor_name}}.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This session is meant to be practical, direct, and useful — not a long motivational lecture. You will get clarity on projects, profiles, interviews, and how to use AI, fundamentals, and projects together.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Session details</p><p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">Date: {{session_date}}<br>Time: {{session_time}}<br>Zoom: <a href="{{zoom_meeting_url}}" style="color:#2563EB;text-decoration:underline;">{{zoom_meeting_url}}</a></p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">Bring one project you can explain, a quick profile update list, and your current questions.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 9. Certificate Eligibility Notice

**Slug:** `certificate-eligibility-notice`  
**Category:** `operational`

**Subject Template:**
```txt
You're close to earning your certificate
```

**Preview Text:**
```txt
Complete your remaining milestones and move closer to your Industry Ready Certificate.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{certificate_url}}` | url | No | campaign |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
You are getting closer to completing {{program_name}}.
Your Industry Ready Certificate is proof that you stayed consistent, completed required milestones, worked on your skills, and moved closer to becoming career-ready.
Complete the remaining eligibility steps: required modules, project work, Resume/GitHub/LinkedIn updates, and readiness activities.
{{cta_label}}: {{cta_url}}
Certificate link, if available: {{certificate_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're close to earning your certificate</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Complete your remaining milestones and move closer to your Industry Ready Certificate.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Certificate</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Certificate Eligibility</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">You're close to earning your certificate</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">You are getting closer to completing {{program_name}}.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Your Industry Ready Certificate is proof that you stayed consistent, completed required milestones, worked on your skills, and moved closer to becoming career-ready.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Remaining steps</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Required modules and readiness activities</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Project completion and proof</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Resume/GitHub/LinkedIn updates</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">Check your eligibility status and complete anything that is still pending.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Certificate link, if already available: <a href="{{certificate_url}}" style="color:#F97316;text-decoration:underline;">{{certificate_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 10. College Admin Progress Report

**Slug:** `college-admin-progress-report`  
**Category:** `operational`

**Subject Template:**
```txt
{{program_name}} progress snapshot for {{college_name}}
```

**Preview Text:**
```txt
A quick view of student progress, readiness signals, and next steps.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{progress_percent}}` | percent | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{dashboard_url}}` | url | No | system |
| `{{support_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hello,
Here is the latest progress snapshot for {{college_name}} under {{program_name}}.
Current overall progress stands at {{progress_percent}}%.
This report gives you a quick view of learning progress, project completion, and profile-readiness indicators.
Inside the report, you can review student participation trends, module progress, project completion signals, Resume/GitHub/LinkedIn readiness, and interview preparation indicators.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{program_name}} progress snapshot for {{college_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">A quick view of student progress, readiness signals, and next steps.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Admin Report</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">College Admin Report</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">{{program_name}} progress snapshot for {{college_name}}</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hello,</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Here is the latest progress snapshot for {{college_name}} under {{program_name}}. Current overall progress stands at {{progress_percent}}%.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This report gives you a quick view of learning progress, project completion, and profile-readiness indicators.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Included signals</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Participation and module progress trends</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Project completion and proof signals</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Resume/GitHub/LinkedIn readiness</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Interview preparation indicators</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;">This operational report was generated for {{college_name}} under {{program_name}}.</p></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 11. Program Deadline Alert

**Slug:** `program-deadline-alert`  
**Category:** `notice`

**Subject Template:**
```txt
Complete your remaining steps before {{deadline_date}}
```

**Preview Text:**
```txt
A few pending steps can delay your progress. Check what's left and complete it on time.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{deadline_date}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{dashboard_url}}` | url | No | system |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
A quick reminder — the deadline to complete your remaining steps in {{program_name}} is {{deadline_date}}.
This is not to create pressure. It is to make sure you do not miss progress because of a few pending tasks.
Check project submission, profile updates, Resume/GitHub/LinkedIn work, readiness activities, and final checklist items.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Complete your remaining steps before {{deadline_date}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">A few pending steps can delay your progress. Check what's left and complete it on time.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Deadline Reminder</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Deadline Alert</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Complete your remaining steps before {{deadline_date}}</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">A quick reminder — the deadline to complete your remaining steps in {{program_name}} is {{deadline_date}}.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This is not to create pressure. It is to make sure you do not miss progress because of a few pending tasks.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Check what is pending</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Project submission and proof</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Profile updates: Resume, GitHub, LinkedIn</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Readiness activities and final checklist</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">If you are stuck, do not wait till the last day. Use the support channel and keep moving.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 12. Advanced Add-ons Teaser

**Slug:** `advanced-addons-teaser`  
**Category:** `marketing`

**Subject Template:**
```txt
Ready to go deeper after the core program?
```

**Preview Text:**
```txt
Explore optional advanced add-ons when you are ready for the next level.
```

**Variables:**
| Key | Type | Required | Source |
|---|---|---:|---|
| `{{first_name}}` | string | No | recipient |
| `{{college_name}}` | string | No | recipient |
| `{{program_name}}` | string | Yes | campaign |
| `{{cta_url}}` | url | Yes | campaign |
| `{{cta_label}}` | string | Yes | campaign |
| `{{support_url}}` | url | No | system |
| `{{unsubscribe_url}}` | url | No | system |

**Plain Text Fallback:**
```txt
Hi {{first_name}},
Once you build your foundations, the next question is simple: what should you learn next?
Advanced add-ons are optional learning paths for students who want to go deeper after the core career readiness journey inside {{program_name}}.
You can explore System Design, HLD and LLD, Advanced DSA, Advanced AI and applied AI engineering, scalability concepts, advanced hands-on exercises, and additional mentorship support.
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ready to go deeper after the core program?</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">Explore optional advanced add-ons when you are ready for the next level.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td><td align="right" style="font-size:12px;color:#E5E7EB;">Advanced Add-ons</td></tr></table></td>
          </tr>
          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Optional Advanced Tracks</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Ready to go deeper after the core program?</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="height:2px;background-color:#F59E0B;"></td></tr></table>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Once you build your foundations, the next question is simple: what should you learn next?</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Advanced add-ons are optional learning paths for students who want to go deeper after the core career readiness journey inside {{program_name}}.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Optional add-ons include</p><ul style="margin:0;padding-left:18px;"><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">System Design, HLD and LLD</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Advanced DSA and problem-solving</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Advanced AI and applied AI engineering</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Scalability concepts and architecture</li><li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Advanced hands-on exercises</li><li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Additional mentorship support</li></ul></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#1E3A8A;">These add-ons are optional and not required for the core certificate.</p></td></tr></table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr><td bgcolor="#F97316" style="border-radius:10px;"><a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a></td></tr></table>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p><a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

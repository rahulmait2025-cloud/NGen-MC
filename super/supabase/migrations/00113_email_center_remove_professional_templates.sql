-- Email Center: Remove Professional Templates
-- Migration: 00113_email_center_remove_professional_templates.sql
-- Deactivate the 6 professional system templates.
-- Keep only the 12 Career Readiness Program templates active.

begin;

-- Deactivate professional system templates
update public.email_templates
set
  is_active = false,
  updated_at = now()
where is_system = true
  and slug in (
    'new-course-announcement',
    'official-college-notice',
    'deadline-reminder',
    'event-webinar-invite',
    'premium-product-launch',
    'blank-professional'
  );

commit;
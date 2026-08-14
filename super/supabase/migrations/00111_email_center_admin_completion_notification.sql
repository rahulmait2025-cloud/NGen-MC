-- Email Center: SuperAdmin Campaign Completion Notification
-- Migration: 00111
-- Adds columns for tracking admin notification after campaign finishes sending

begin;

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS
  completion_notification_sent_at timestamptz null;

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS
  completion_notification_recipient text null;

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS
  completion_notification_error text null;

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS
  completion_notification_attempted_at timestamptz null;

commit;

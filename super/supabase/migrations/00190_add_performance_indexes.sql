CREATE INDEX IF NOT EXISTS idx_email_campaigns_updated_at
ON public.email_campaigns (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_templates_name
ON public.email_templates (name);

CREATE INDEX IF NOT EXISTS idx_colleges_name
ON public.colleges (name);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at
ON public.email_campaigns (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_lms_email_outbox_next_attempt_at
ON public.lms_email_outbox (next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_master_courses_created_at
ON public.master_courses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_placement_profiles_college_id
ON public.placement_profiles (college_id);

CREATE INDEX IF NOT EXISTS idx_orders_paid_at
ON public.orders (paid_at);
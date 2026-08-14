-- Placeholder college for users who sign in via root /login (e.g. Google) without an existing college.
-- They can set their college later in profile settings.
-- plan_id is required (colleges.plan_id NOT NULL); use starter plan.
INSERT INTO public.colleges (name, slug, status, plan_id)
SELECT 'Unknown college', 'unknown', 'active', p.id
FROM public.plans p
WHERE p.key = 'starter'
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

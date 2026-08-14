-- ============================================================================
-- 00319_team_page_settings.sql
-- Singleton settings for the public "Our Team" page hero (content + group photo).
-- Managed from SuperAdmin, read publicly (anon) for the LMS + landing team pages.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.team_page_settings (
  id                    smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_title            text NOT NULL DEFAULT 'Meet the humans behind the tabs.',
  hero_description      text NOT NULL DEFAULT 'We build careers, fix bugs, reply to students, and pretend that 47 open tabs is completely normal.',
  hero_annotation       text DEFAULT 'Someone is probably deploying right now.',
  hero_image_path       text,
  hero_image_alt_text   text DEFAULT 'The NextGen CTO team',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.team_page_settings IS
  'Singleton hero content and group-photo settings for the public Our Team page.';

DROP TRIGGER IF EXISTS trg_team_page_settings_updated_at ON public.team_page_settings;
CREATE TRIGGER trg_team_page_settings_updated_at
  BEFORE UPDATE ON public.team_page_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.team_page_settings ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated) may only READ the singleton row.
DROP POLICY IF EXISTS "team_page_settings_public_read" ON public.team_page_settings;
CREATE POLICY "team_page_settings_public_read" ON public.team_page_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- Only SuperAdmins may INSERT the row.
DROP POLICY IF EXISTS "team_page_settings_superadmin_insert" ON public.team_page_settings;
CREATE POLICY "team_page_settings_superadmin_insert" ON public.team_page_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

-- Only SuperAdmins may UPDATE the row.
DROP POLICY IF EXISTS "team_page_settings_superadmin_update" ON public.team_page_settings;
CREATE POLICY "team_page_settings_superadmin_update" ON public.team_page_settings
  FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Note: no DELETE policy is defined, so RLS denies row deletion for anon and
-- authenticated users. Photo removal sets hero_image_path to NULL rather than
-- deleting the settings row.

-- Seed the single row (idempotent).
INSERT INTO public.team_page_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMIT;

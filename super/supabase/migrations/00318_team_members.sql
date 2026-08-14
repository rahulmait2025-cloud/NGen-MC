-- ============================================================================
-- 00318_team_members.sql
-- Public team page profiles managed from SuperAdmin.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.team_members (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  slug                  text NOT NULL
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  role                  text NOT NULL,
  short_role            text,
  short_bio             text,
  full_bio              text,
  photo_path            text,
  photo_alt_text        text,
  email                 text,
  linkedin_url          text,
  twitter_url           text,
  github_url            text,
  instagram_url         text,
  youtube_url           text,
  personal_website_url  text,
  location              text,
  is_founder            boolean NOT NULL DEFAULT false,
  is_featured           boolean NOT NULL DEFAULT false,
  is_published          boolean NOT NULL DEFAULT false,
  display_order         integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.team_members IS
  'Profiles displayed on the public NextGen CTO team page.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_slug_unique
  ON public.team_members (slug);

CREATE INDEX IF NOT EXISTS team_members_public_order_idx
  ON public.team_members (is_published, display_order, created_at);

CREATE INDEX IF NOT EXISTS team_members_featured_idx
  ON public.team_members (is_published, is_featured, display_order);

DROP TRIGGER IF EXISTS trg_team_members_updated_at ON public.team_members;
CREATE TRIGGER trg_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for team profile photos (public read for published imagery)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-members',
  'team-members',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Team members photos: public read" ON storage.objects;
CREATE POLICY "Team members photos: public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'team-members');

DROP POLICY IF EXISTS "Team members photos: superadmin insert" ON storage.objects;
CREATE POLICY "Team members photos: superadmin insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-members'
  AND public.is_superadmin()
);

DROP POLICY IF EXISTS "Team members photos: superadmin update" ON storage.objects;
CREATE POLICY "Team members photos: superadmin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-members'
  AND public.is_superadmin()
)
WITH CHECK (
  bucket_id = 'team-members'
  AND public.is_superadmin()
);

DROP POLICY IF EXISTS "Team members photos: superadmin delete" ON storage.objects;
CREATE POLICY "Team members photos: superadmin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-members'
  AND public.is_superadmin()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_public_read" ON public.team_members;
CREATE POLICY "team_members_public_read" ON public.team_members
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "team_members_superadmin_all" ON public.team_members;
CREATE POLICY "team_members_superadmin_all" ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

COMMIT;

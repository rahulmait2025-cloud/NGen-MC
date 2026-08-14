-- Phase 6B: Platform Announcements — Global banner system
-- Only one announcement can be active at a time.

-- ─── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE announcement_type AS ENUM ('text', 'coupon', 'custom_html');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Table ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type announcement_type NOT NULL DEFAULT 'text',
  title TEXT NOT NULL,
  message TEXT,
  html_content TEXT,
  cta_label TEXT DEFAULT 'Learn More',
  cta_url TEXT,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_platform_announcements_active ON platform_announcements (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_announcements_expires ON platform_announcements (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_announcements_coupon ON platform_announcements (coupon_id) WHERE coupon_id IS NOT NULL;

-- ─── Unique constraint: at most one active announcement ────────────────────────
DO $$ BEGIN
  CREATE UNIQUE INDEX idx_one_active_announcement
    ON platform_announcements (is_active)
    WHERE is_active = true;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_platform_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_platform_announcements_updated_at ON platform_announcements;
CREATE TRIGGER trigger_update_platform_announcements_updated_at
  BEFORE UPDATE ON platform_announcements
  FOR EACH ROW EXECUTE FUNCTION update_platform_announcements_updated_at();

-- ─── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin full access" ON platform_announcements;
CREATE POLICY "Superadmin full access"
  ON platform_announcements FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Students can view active unexpired announcements" ON platform_announcements;
CREATE POLICY "Students can view active unexpired announcements"
  ON platform_announcements FOR SELECT
  USING (
    is_active = true
    AND starts_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  );

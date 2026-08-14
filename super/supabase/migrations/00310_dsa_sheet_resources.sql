-- Sheet-scoped visual resources for the DSA Sheets section.
-- These resources are intentionally separate from course_resource_items.

CREATE TABLE IF NOT EXISTS public.dsa_sheet_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.dsa_sheets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_url TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'auto' CHECK (resource_type IN ('auto', 'image', 'svg', 'iframe', 'excalidraw')),
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsa_sheet_resources_sheet_order
  ON public.dsa_sheet_resources(sheet_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_dsa_sheet_resources_visible
  ON public.dsa_sheet_resources(sheet_id, is_visible)
  WHERE is_visible = true;

ALTER TABLE public.dsa_sheet_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read visible DSA sheet resources" ON public.dsa_sheet_resources;
CREATE POLICY "Public read visible DSA sheet resources"
  ON public.dsa_sheet_resources
  FOR SELECT
  USING (is_visible = true);

DROP POLICY IF EXISTS "Service role full" ON public.dsa_sheet_resources;
CREATE POLICY "Service role full"
  ON public.dsa_sheet_resources
  FOR ALL
  USING (true)
  WITH CHECK (true);

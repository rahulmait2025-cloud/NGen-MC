-- Add draft tables and publish system for DSA Sheet

-- Draft categories (SuperAdmin edits here)
CREATE TABLE IF NOT EXISTS dsa_categories_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES dsa_sheets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Draft problems (SuperAdmin edits here)
CREATE TABLE IF NOT EXISTS dsa_problems_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES dsa_categories_draft(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  lc_url TEXT DEFAULT '',
  yt_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track draft state on the sheet
ALTER TABLE dsa_sheets ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ;

-- Indexes for draft tables
CREATE INDEX IF NOT EXISTS idx_dsa_categories_draft_sheet ON dsa_categories_draft(sheet_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_dsa_problems_draft_category ON dsa_problems_draft(category_id, sort_order);

-- RLS for draft tables (only service role / admin)
ALTER TABLE dsa_categories_draft ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full" ON dsa_categories_draft FOR ALL USING (true);

ALTER TABLE dsa_problems_draft ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full" ON dsa_problems_draft FOR ALL USING (true);

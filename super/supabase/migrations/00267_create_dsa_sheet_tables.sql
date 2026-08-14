-- DSA Sheet tables
-- Run this migration to create the DSA pattern sheet feature

-- 1. DSA Sheet (single global sheet)
CREATE TABLE IF NOT EXISTS dsa_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'DSA Pattern Sheet',
  description_md TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS dsa_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES dsa_sheets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Problems
CREATE TABLE IF NOT EXISTS dsa_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES dsa_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  lc_url TEXT DEFAULT '',
  yt_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Student progress (done)
CREATE TABLE IF NOT EXISTS dsa_progress (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES dsa_problems(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, problem_id)
);

-- 5. Student favorites
CREATE TABLE IF NOT EXISTS dsa_favorites (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES dsa_problems(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, problem_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dsa_categories_sheet ON dsa_categories(sheet_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_dsa_problems_category ON dsa_problems(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_dsa_progress_student ON dsa_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_dsa_favorites_student ON dsa_favorites(student_id);

-- RLS Policies
ALTER TABLE dsa_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON dsa_sheets FOR SELECT USING (true);
CREATE POLICY "Service role full" ON dsa_sheets FOR ALL USING (true);

ALTER TABLE dsa_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON dsa_categories FOR SELECT USING (true);
CREATE POLICY "Service role full" ON dsa_categories FOR ALL USING (true);

ALTER TABLE dsa_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON dsa_problems FOR SELECT USING (true);
CREATE POLICY "Service role full" ON dsa_problems FOR ALL USING (true);

ALTER TABLE dsa_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own" ON dsa_progress FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students insert own" ON dsa_progress FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students delete own" ON dsa_progress FOR DELETE USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Service role full" ON dsa_progress FOR ALL USING (true);

ALTER TABLE dsa_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own" ON dsa_favorites FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students insert own" ON dsa_favorites FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students delete own" ON dsa_favorites FOR DELETE USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Service role full" ON dsa_favorites FOR ALL USING (true);

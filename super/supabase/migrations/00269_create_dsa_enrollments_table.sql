-- Migration: Create DSA Enrollments Table
CREATE TABLE IF NOT EXISTS dsa_enrollments (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sheet_id UUID NOT NULL REFERENCES dsa_sheets(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, sheet_id)
);

-- Enable RLS
ALTER TABLE dsa_enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students read own enrollments" ON dsa_enrollments;
DROP POLICY IF EXISTS "Students insert own enrollments" ON dsa_enrollments;
DROP POLICY IF EXISTS "Service role full" ON dsa_enrollments;

-- RLS Policies
CREATE POLICY "Students read own enrollments" ON dsa_enrollments
  FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Students insert own enrollments" ON dsa_enrollments
  FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Service role full" ON dsa_enrollments
  FOR ALL USING (true);

-- Index for optimization
CREATE INDEX IF NOT EXISTS idx_dsa_enrollments_student ON dsa_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_dsa_enrollments_sheet ON dsa_enrollments(sheet_id);

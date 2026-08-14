-- Student Todos table
-- Each student can have up to 5 todos per category (daily, weekly, monthly)
-- Todos are scoped to the student and isolated per tenant

CREATE TABLE IF NOT EXISTS student_todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('daily', 'weekly', 'monthly')),
  text TEXT NOT NULL CHECK (char_length(text) <= 30),
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by student + category
CREATE INDEX IF NOT EXISTS idx_student_todos_student_category
  ON student_todos (student_id, category);

-- Enforce max 5 todos per student per category
-- This is enforced at the application level, but add a trigger as safety net
CREATE OR REPLACE FUNCTION enforce_max_todos_per_category()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM student_todos
      WHERE student_id = NEW.student_id AND category = NEW.category) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 todos per category per student';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_max_todos_per_category
  BEFORE INSERT ON student_todos
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_todos_per_category();

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_student_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_todos_updated_at
  BEFORE UPDATE ON student_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_student_todos_updated_at();

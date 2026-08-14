-- Optimize DSA sheets list by computing counts inside PostgreSQL
CREATE OR REPLACE FUNCTION get_student_dsa_sheets_list(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description_md TEXT,
  is_active BOOLEAN,
  is_enrolled BOOLEAN,
  categories_count BIGINT,
  problems_count BIGINT,
  completed_count BIGINT
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.description_md,
    s.is_active,
    EXISTS (
      SELECT 1 FROM dsa_enrollments e
      WHERE e.student_id = p_student_id AND e.sheet_id = s.id
    ) AS is_enrolled,
    (
      SELECT COUNT(*) FROM dsa_categories c
      WHERE c.sheet_id = s.id
    )::BIGINT AS categories_count,
    (
      SELECT COUNT(*) FROM dsa_problems p
      JOIN dsa_categories c ON c.id = p.category_id
      WHERE c.sheet_id = s.id
    )::BIGINT AS problems_count,
    (
      SELECT COUNT(*) FROM dsa_progress pr
      JOIN dsa_problems p ON p.id = pr.problem_id
      JOIN dsa_categories c ON c.id = p.category_id
      WHERE c.sheet_id = s.id AND pr.student_id = p_student_id
    )::BIGINT AS completed_count
  FROM dsa_sheets s
  WHERE s.is_active = true
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

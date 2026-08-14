-- Performance indexes for high-frequency query paths
-- Covers the most common WHERE/ORDER patterns found in the codebase

-- 1. student_video_progress: student_id + course_id lookups (progress tracking, engagement)
CREATE INDEX IF NOT EXISTS idx_student_video_progress_student_course
  ON student_video_progress (student_id, course_id);

-- 2. orders: purchaser_user_id + status for payment tracking
CREATE INDEX IF NOT EXISTS idx_orders_purchaser_status
  ON orders (purchaser_user_id, status);


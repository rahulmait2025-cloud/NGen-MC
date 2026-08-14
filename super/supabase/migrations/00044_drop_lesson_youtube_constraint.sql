-- Relax lesson video URL validation for now.
-- Allows any value in global_course_lessons.youtube_video_url.

alter table if exists public.global_course_lessons
  drop constraint if exists global_course_lessons_youtube_url_chk;

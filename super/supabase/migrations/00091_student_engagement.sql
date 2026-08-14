-- Migration: 00091_student_engagement.sql
-- Description: Adds student notes and bookmarks for lessons.

-- 1. Student Lesson Notes
CREATE TABLE IF NOT EXISTS public.student_lesson_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    master_course_id UUID NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.master_course_items(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, item_id)
);

-- Indices for notes
CREATE INDEX IF NOT EXISTS idx_student_lesson_notes_student_id ON public.student_lesson_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_notes_item_id ON public.student_lesson_notes(item_id);

-- Updated at trigger for notes
CREATE TRIGGER update_student_lesson_notes_updated_at
    BEFORE UPDATE ON public.student_lesson_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Student Lesson Bookmarks
CREATE TABLE IF NOT EXISTS public.student_lesson_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    master_course_id UUID NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.master_course_items(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER, -- Nullable for non-video or generic bookmarks
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for bookmarks
CREATE INDEX IF NOT EXISTS idx_student_lesson_bookmarks_student_id ON public.student_lesson_bookmarks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_bookmarks_item_id ON public.student_lesson_bookmarks(item_id);

-- RLS
ALTER TABLE public.student_lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_bookmarks ENABLE ROW LEVEL SECURITY;

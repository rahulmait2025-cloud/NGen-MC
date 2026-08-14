-- Migration: 00090_lesson_resources.sql
-- Description: Adds support for lesson and course-level resources.

CREATE TABLE IF NOT EXISTS public.lesson_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_course_id UUID NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.master_course_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- e.g., 'document', 'pdf', 'xlsx', 'link', 'note', etc.
    url TEXT,
    file_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_lesson_resources_master_course_id ON public.lesson_resources(master_course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_item_id ON public.lesson_resources(item_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lesson_resources_updated_at
    BEFORE UPDATE ON public.lesson_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Optional, usually handled by service role in this project)
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

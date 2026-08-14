-- Add bio column to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS bio text DEFAULT NULL;

COMMENT ON COLUMN public.students.bio IS 'Short student bio, max ~200 words';

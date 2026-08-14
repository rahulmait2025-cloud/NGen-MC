-- 00016_assessment_engine.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    time_limit_minutes INTEGER, -- NULL means no limit
    passing_score NUMERIC(5,2), -- e.g. 70.00
    max_attempts INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Sections
CREATE TABLE IF NOT EXISTS assessment_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Questions
CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('single_select', 'multi_select', 'short_answer', 'subjective', 'coding_ready')),
    text TEXT NOT NULL,
    points NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Options (for MCQ)
CREATE TABLE IF NOT EXISTS assessment_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Assignments
CREATE TABLE IF NOT EXISTS assessment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE, -- NULL means assigned to all in tenant, or assigned specifically to students
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- If assigning to a specific student
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Check that at least one of cohort or student is provided, or neither if it's tenant-wide
    CONSTRAINT assignment_target_chk CHECK (
        (cohort_id IS NOT NULL AND student_id IS NULL) OR 
        (cohort_id IS NULL AND student_id IS NOT NULL) OR 
        (cohort_id IS NULL AND student_id IS NULL)
    )
);

-- Assessment Attempts
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assessment_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'time_expired', 'auto_submitted')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Responses
CREATE TABLE IF NOT EXISTS assessment_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    selected_option_ids UUID[], -- Array of selected option IDs for MCQ
    text_response TEXT, -- For short/subjective/coding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- Assessment Results
CREATE TABLE IF NOT EXISTS assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE UNIQUE,
    score NUMERIC(5,2),
    is_passing BOOLEAN,
    status TEXT NOT NULL DEFAULT 'pending_manual_eval' CHECK (status IN ('pending_manual_eval', 'evaluated', 'released')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Reviews (Manual evaluation)
CREATE TABLE IF NOT EXISTS assessment_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES assessment_responses(id) ON DELETE CASCADE UNIQUE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    points_awarded NUMERIC(5,2) NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_tenant ON assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sections_assessment ON assessment_sections(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_section ON assessment_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_assessment_options_question ON assessment_options(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assessment ON assessment_assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_cohort ON assessment_assignments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_student ON assessment_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assignment ON assessment_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_student ON assessment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_attempt ON assessment_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_attempt ON assessment_results(attempt_id);

-- RLS Policies

-- Assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage their tenant's assessments" ON assessments;
CREATE POLICY "Admins can manage their tenant's assessments" ON assessments
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM college_memberships m WHERE m.college_id = assessments.tenant_id AND m.role IN ('college_admin', 'faculty_spoc')
    )
  );
DROP POLICY IF EXISTS "Superadmins can manage all assessments" ON assessments;
CREATE POLICY "Superadmins can manage all assessments" ON assessments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')
    );
DROP POLICY IF EXISTS "Students can view assessments assigned to them or their cohort" ON assessments;
CREATE POLICY "Students can view assessments assigned to them or their cohort" ON assessments
    FOR SELECT USING (
        assessments.status = 'published' AND
        EXISTS (
            SELECT 1 FROM assessment_assignments aa
            LEFT JOIN cohort_memberships cm ON cm.cohort_id = aa.cohort_id
            LEFT JOIN students s ON s.id = cm.student_id AND s.user_id = auth.uid()
            WHERE aa.assessment_id = assessments.id 
            AND (
                aa.student_id = auth.uid() OR
                s.id IS NOT NULL OR
                (aa.cohort_id IS NULL AND aa.student_id IS NULL AND aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() LIMIT 1))
            )
        )
    );

-- Sections
ALTER TABLE assessment_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage sections" ON assessment_sections;
CREATE POLICY "Admins can manage sections" ON assessment_sections
    FOR ALL USING (
        EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_sections.assessment_id AND a.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() AND role IN ('college_admin', 'faculty_spoc')))
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')
    );
DROP POLICY IF EXISTS "Students can view sections of published assessments" ON assessment_sections;
CREATE POLICY "Students can view sections of published assessments" ON assessment_sections
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_sections.assessment_id AND a.status = 'published')
    );

-- Questions
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage questions" ON assessment_questions;
CREATE POLICY "Admins can manage questions" ON assessment_questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM assessment_sections s JOIN assessments a ON a.id = s.assessment_id WHERE s.id = assessment_questions.section_id AND (a.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')))
    );
DROP POLICY IF EXISTS "Students can view questions of published assessments" ON assessment_questions;
CREATE POLICY "Students can view questions of published assessments" ON assessment_questions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM assessment_sections s JOIN assessments a ON a.id = s.assessment_id WHERE s.id = assessment_questions.section_id AND a.status = 'published')
    );

-- Options
ALTER TABLE assessment_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage options" ON assessment_options;
CREATE POLICY "Admins can manage options" ON assessment_options
    FOR ALL USING (
        EXISTS (SELECT 1 FROM assessment_questions q JOIN assessment_sections s ON s.id = q.section_id JOIN assessments a ON a.id = s.assessment_id WHERE q.id = assessment_options.question_id AND (a.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')))
    );
DROP POLICY IF EXISTS "Students can view options of published assessments" ON assessment_options;
CREATE POLICY "Students can view options of published assessments" ON assessment_options
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM assessment_questions q JOIN assessment_sections s ON s.id = q.section_id JOIN assessments a ON a.id = s.assessment_id WHERE q.id = assessment_options.question_id AND a.status = 'published')
    );

-- Assignments
ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage assignments" ON assessment_assignments;
CREATE POLICY "Admins can manage assignments" ON assessment_assignments
    FOR ALL USING (
        tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() AND role IN ('college_admin', 'faculty_spoc'))
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')
    );
DROP POLICY IF EXISTS "Students can view their own assignments" ON assessment_assignments;
CREATE POLICY "Students can view their own assignments" ON assessment_assignments
    FOR SELECT USING (
        student_id = auth.uid() OR
        cohort_id IN (SELECT cohort_id FROM students WHERE user_id = auth.uid() AND cohort_id IS NOT NULL) OR
        (cohort_id IS NULL AND student_id IS NULL AND tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid()))
    );

-- Attempts
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view attempts" ON assessment_attempts;
CREATE POLICY "Admins can view attempts" ON assessment_attempts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM assessment_assignments aa WHERE aa.id = assessment_attempts.assignment_id AND (aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')))
    );
DROP POLICY IF EXISTS "Students can manage their own attempts" ON assessment_attempts;
CREATE POLICY "Students can manage their own attempts" ON assessment_attempts
    FOR ALL USING (
        student_id = auth.uid()
    );

-- Responses
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view responses" ON assessment_responses;
CREATE POLICY "Admins can view responses" ON assessment_responses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM assessment_attempts att JOIN assessment_assignments aa ON aa.id = att.assignment_id WHERE att.id = assessment_responses.attempt_id AND (aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')))
    );
DROP POLICY IF EXISTS "Students can manage their own responses" ON assessment_responses;
CREATE POLICY "Students can manage their own responses" ON assessment_responses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM assessment_attempts att WHERE att.id = assessment_responses.attempt_id AND att.student_id = auth.uid())
    );

-- Results
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage results" ON assessment_results;
CREATE POLICY "Admins can manage results" ON assessment_results
    FOR ALL USING (
        EXISTS (SELECT 1 FROM assessment_attempts att JOIN assessment_assignments aa ON aa.id = att.assignment_id WHERE att.id = assessment_results.attempt_id AND (aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')))
    );
DROP POLICY IF EXISTS "Students can view their own released results" ON assessment_results;
CREATE POLICY "Students can view their own released results" ON assessment_results
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM assessment_attempts att WHERE att.id = assessment_results.attempt_id AND att.student_id = auth.uid())
        AND status = 'released'
    );

-- Reviews
ALTER TABLE assessment_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage reviews" ON assessment_reviews;
CREATE POLICY "Admins can manage reviews" ON assessment_reviews
    FOR ALL USING (
        EXISTS (SELECT 1 FROM assessment_responses r JOIN assessment_attempts att ON att.id = r.attempt_id JOIN assessment_assignments aa ON aa.id = att.assignment_id WHERE r.id = assessment_reviews.response_id AND (aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = auth.uid() AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.global_role = 'superadmin')))
    );
DROP POLICY IF EXISTS "Students can view their own reviews if results released" ON assessment_reviews;
CREATE POLICY "Students can view their own reviews if results released" ON assessment_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessment_responses r 
            JOIN assessment_attempts att ON att.id = r.attempt_id 
            JOIN assessment_results res ON res.attempt_id = att.id
            WHERE r.id = assessment_reviews.response_id 
            AND att.student_id = auth.uid()
            AND res.status = 'released'
        )
    );

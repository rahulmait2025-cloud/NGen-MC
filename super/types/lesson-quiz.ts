/**
 * Lesson Quiz types for the SuperAdmin (platform admin) repo.
 * Mirrors the lesson quiz Supabase schema from migration 00300.
 *
 * Keep this file in sync with LMS/types/lesson-quiz.ts
 * and the lesson_quiz_* tables in the database.
 */

// ─── Database Row Types ──────────────────────────────────────────────────────

export interface LessonQuiz {
  id: string;
  master_course_id: string;
  module_id: string;
  title: string;
  description: string | null;
  instructions_md: string | null;
  publish_status: 'draft' | 'published' | 'unpublished' | 'archived';
  passing_percentage: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_after_submit: boolean;
  show_correct_answers: boolean;
  completion_rule: 'submit' | 'pass';
  version: number;
  parent_quiz_id: string | null;
  locked_at: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonQuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  explanation: string | null;
  points: number;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LessonQuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LessonQuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  college_id: string | null;
  master_course_id: string;
  item_id: string;
  status: 'in_progress' | 'submitted' | 'abandoned';
  attempt_no: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  submitted_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LessonQuizAttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids: string[];
  is_correct: boolean;
  points_awarded: number;
  question_snapshot: Record<string, unknown>;
  selected_snapshot: unknown[];
  correct_snapshot: unknown[];
  created_at: string;
}

// ─── Admin Input Types ───────────────────────────────────────────────────────

export interface CreateLessonQuizInput {
  master_course_id: string;
  module_id: string;
  title: string;
  description?: string;
  instructions_md?: string;
  sort_order?: number;
  created_by?: string;
  passing_percentage?: number;
  max_attempts?: number | null;
  time_limit_minutes?: number | null;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_result_after_submit?: boolean;
  show_correct_answers?: boolean;
  completion_rule?: 'submit' | 'pass';
  metadata?: Record<string, unknown>;
}

export interface SaveLessonQuizDraftInput {
  quizId: string;
  title?: string;
  description?: string;
  instructions_md?: string;
  passing_percentage?: number;
  max_attempts?: number | null;
  time_limit_minutes?: number | null;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_result_after_submit?: boolean;
  show_correct_answers?: boolean;
  completion_rule?: 'submit' | 'pass';
  publish_status?: 'draft' | 'published' | 'unpublished' | 'archived';
  questions?: SaveLessonQuizDraftQuestionInput[];
  metadata?: Record<string, unknown>;
}

export interface SaveLessonQuizDraftQuestionInput {
  id?: string; // omit for new questions
  question_text: string;
  question_type: LessonQuizQuestion['question_type'];
  explanation?: string;
  points?: number;
  sort_order?: number;
  options: SaveLessonQuizDraftOptionInput[];
}

export interface SaveLessonQuizDraftOptionInput {
  id?: string; // omit for new options
  option_text: string;
  is_correct: boolean;
  sort_order?: number;
}

export interface ValidateLessonQuizInput {
  quizId: string;
}

export interface CloneLessonQuizVersionInput {
  quizId: string;
  title?: string;
}

export interface PublishLessonQuizInput {
  itemId: string;
}

export interface UnpublishLessonQuizInput {
  itemId: string;
}

// ─── Result Types ────────────────────────────────────────────────────────────

export interface LessonQuizWithQuestions extends LessonQuiz {
  questions: (LessonQuizQuestion & { options: LessonQuizOption[] })[];
}

export interface CreateLessonQuizResult {
  item: { id: string; quiz_id: string | null; item_type: string; sort_order: number };
  quiz: LessonQuiz;
}

export interface ValidateLessonQuizResult {
  valid: boolean;
  errors: string[];
}

export interface CloneLessonQuizVersionResult {
  quiz: LessonQuiz;
  questionCount: number;
  optionCount: number;
}

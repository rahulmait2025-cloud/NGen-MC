/**
 * Lesson Quiz types for the LMS (student-facing) repo.
 * Mirrors the lesson quiz Supabase schema from migration 00300.
 *
 * Keep this file in sync with SuperAdmin/types/lesson-quiz.ts
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

// ─── Input Payload Types ─────────────────────────────────────────────────────

export interface LessonQuizPayload {
  quiz: LessonQuiz;
  questions: LessonQuizQuestionPayload[];
  attempt?: LessonQuizAttempt;
  attempts_used: number;
  attempts_remaining: number | null;
}

/**
 * Question payload returned to the student.
 * Does NOT include `is_correct` on options unless show_correct_answers is allowed.
 */
export interface LessonQuizQuestionPayload {
  id: string;
  question_text: string;
  question_type: LessonQuizQuestion['question_type'];
  explanation: string | null;
  points: number;
  sort_order: number;
  options: LessonQuizOptionPayload[];
}

export interface LessonQuizOptionPayload {
  id: string;
  option_text: string;
  sort_order: number;
  is_correct?: boolean; // only present when show_correct_answers is true
}

// ─── Service Input Types ─────────────────────────────────────────────────────

export interface GetLessonQuizPayloadInput {
  studentId: string;
  collegeId: string | null;
  isGlobal: boolean;
  courseId: string;
  itemId: string;
  variantId?: string;
}

export interface StartLessonQuizAttemptInput {
  studentId: string;
  collegeId: string | null;
  courseId: string;
  itemId: string;
  quizId?: string;
}

export interface SubmitLessonQuizAttemptInput {
  studentId: string;
  collegeId: string | null;
  isGlobal: boolean;
  courseId: string;
  attemptId: string;
  itemId: string;
  answers: SubmitLessonQuizAttemptAnswerInput[];
}

export interface SubmitLessonQuizAttemptAnswerInput {
  questionId: string;
  selectedOptionIds: string[];
}

// ─── Result Types ────────────────────────────────────────────────────────────

export interface LessonQuizAttemptResult {
  attempt: LessonQuizAttempt;
  answers: LessonQuizAttemptAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
}

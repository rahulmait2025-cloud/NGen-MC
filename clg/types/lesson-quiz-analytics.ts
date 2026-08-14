/**
 * Lesson Quiz Analytics types for the CollegeAdmin repo.
 * Mirrors the lesson quiz Supabase schema for CollegeAdmin analytics views.
 */

// ─── Quiz List Types ─────────────────────────────────────────────────────────

export interface CollegeQuizListItem {
  quizId: string;
  quizTitle: string;
  courseTitle: string;
  moduleTitle: string;
  publishStatus: string;
  totalAttempts: number;
  submittedAttempts: number;
  avgPercentage: number | null;
  passRate: number | null;
  latestSubmittedAt: string | null;
}

// ─── Student Score Types ─────────────────────────────────────────────────────

export interface CollegeQuizStudentScore {
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string | null;
  attempts: number;
  bestScore: number | null;
  bestMaxScore: number | null;
  bestPercentage: number | null;
  latestPercentage: number | null;
  latestSubmittedAt: string | null;
  passed: boolean;
}

// ─── Quiz Detail Types ───────────────────────────────────────────────────────

export interface CollegeQuizDetail {
  quizId: string;
  quizTitle: string;
  courseTitle: string;
  moduleTitle: string;
  publishStatus: string;
  passingPercentage: number | null;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  completionRule: string;
  totalAttempts: number;
  submittedAttempts: number;
  avgPercentage: number | null;
  passRate: number | null;
}

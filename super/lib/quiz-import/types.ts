export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false';

export type QuestionTypeAlias =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false';

export type CanonicalColumn =
  | 'question'
  | 'option_a'
  | 'option_b'
  | 'option_c'
  | 'option_d'
  | 'correct_answer'
  | 'explanation'
  | 'points'
  | 'question_type';

export interface QuizImportError {
  row?: number;
  column?: string;
  code: string;
  message: string;
}

export interface QuizImportRow {
  sourceRow: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctRaw: string;
  explanation: string;
  pointsRaw: string;
  questionTypeRaw: string;
}

export interface QuizImportValidatedRow {
  sourceRow: number;
  text: string;
  options: string[];
  correctIndexes: number[];
  explanation: string;
  points: number;
  questionType: QuestionType;
}

export interface ParsedImportFile {
  rows: QuizImportRow[];
  rawRowCount: number;
  rawNonEmptyRowCount: number;
}

export interface QuizImportValidationResult {
  ok: boolean;
  rows: QuizImportValidatedRow[];
  errors: QuizImportError[];
  validRowCount: number;
  invalidRowCount: number;
  optionCount: number;
  totalPoints: number;
}

export type ImportMode = 'append' | 'replace';

export interface ImportLimits {
  maxFileBytes: number;
  maxQuestionRows: number;
}

export const DEFAULT_IMPORT_LIMITS: ImportLimits = {
  maxFileBytes: 5 * 1024 * 1024,
  maxQuestionRows: 1000,
};

export interface ImportParseOptions {
  maxQuestionRows?: number;
}

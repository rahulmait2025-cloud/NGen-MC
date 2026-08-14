import type { QuizImportValidatedRow } from './types';

export interface DraftOptionLike {
  text: string;
  is_correct: boolean;
}

export interface DraftQuestionLike {
  text: string;
  explanation: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  points: number;
  options: DraftOptionLike[];
}

export interface ConvertedImport {
  questions: DraftQuestionLike[];
  totalOptions: number;
  totalPoints: number;
}

export function validatedRowsToDraftQuestions(
  rows: QuizImportValidatedRow[],
): ConvertedImport {
  const questions: DraftQuestionLike[] = [];
  let totalOptions = 0;
  let totalPoints = 0;
  for (const row of rows) {
    const correctSet = new Set(row.correctIndexes);
    const options: DraftOptionLike[] = row.options.map((text, idx) => ({
      text,
      is_correct: correctSet.has(idx),
    }));
    questions.push({
      text: row.text,
      explanation: row.explanation,
      type: row.questionType,
      points: row.points,
      options,
    });
    totalOptions += options.length;
    totalPoints += row.points;
  }
  return { questions, totalOptions, totalPoints };
}

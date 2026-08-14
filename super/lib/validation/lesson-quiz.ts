import { z } from 'zod';

/**
 * Validation schema for the saveQuiz server action input.
 *
 * Manually-entered and spreadsheet-imported questions go through the
 * same server-side validation to keep both flows consistent.
 *
 * Limits are intentionally aligned with the existing lesson_quiz_*
 * CHECK constraints and the existing client-side validation in
 * quiz-editor.tsx.
 */

const uuidLike = z
  .string()
  .trim()
  .min(1)
  .refine(
    (v) =>
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v),
    'Invalid UUID',
  );

const questionTypeSchema = z.enum(['single_choice', 'multiple_choice', 'true_false']);

const optionSchema = z
  .object({
    id: uuidLike.optional(),
    text: z
      .string()
      .trim()
      .min(1, 'Option text is required')
      .max(2000, 'Option text is too long'),
    is_correct: z.boolean(),
  })
  .strict();

const questionSchema = z
  .object({
    id: uuidLike.optional(),
    text: z
      .string()
      .trim()
      .min(1, 'Question text is required')
      .max(5000, 'Question text is too long'),
    type: questionTypeSchema,
    points: z
      .number()
      .finite()
      .positive('Points must be greater than 0')
      .max(10000, 'Points is too large'),
    explanation: z
      .string()
      .trim()
      .min(1, 'Explanation is required')
      .max(5000, 'Explanation is too long'),
    options: z
      .array(optionSchema)
      .min(2, 'Question needs at least 2 options')
      .max(20, 'Question has too many options'),
  })
  .strict()
  .superRefine((q, ctx) => {
    const correctCount = q.options.filter((o) => o.is_correct).length;
    if (q.type === 'true_false') {
      if (q.options.length !== 2) {
        ctx.addIssue({
          code: 'custom',
          message: 'true/false must have exactly 2 options',
          path: ['options'],
        });
      }
      if (correctCount !== 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'true/false must have exactly 1 correct answer',
          path: ['options'],
        });
      }
    } else if (q.type === 'single_choice') {
      if (correctCount !== 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'single_choice must have exactly 1 correct answer',
          path: ['options'],
        });
      }
    } else {
      if (correctCount < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'multiple_choice must have at least 1 correct answer',
          path: ['options'],
        });
      }
    }
  });

export const saveQuizInputSchema = z
  .object({
    itemId: uuidLike,
    masterCourseId: uuidLike,
    title: z
      .string()
      .trim()
      .min(1, 'Quiz title is required')
      .max(500, 'Quiz title is too long'),
    description: z
      .string()
      .trim()
      .max(5000, 'Description is too long')
      .optional(),
    timeLimitMinutes: z
      .union([
        z.literal(null),
        z.number().finite().int().positive('Time limit must be greater than 0').max(10080),
      ])
      .optional(),
    passingScore: z
      .union([
        z.literal(null),
        z.number().finite().min(0, 'Passing score must be >= 0').max(100, 'Passing score must be <= 100'),
      ])
      .optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    showCorrectAnswers: z.boolean().optional(),
    sort_order: z.number().int().min(-1).max(1000000).nullable().optional(),
    status: z.enum(['draft', 'published']).optional(),
    linkedVideoId: z.union([z.literal(null), uuidLike]).optional(),
    questions: z
      .array(questionSchema)
      .min(1, 'At least one question is required')
      .max(1000, 'Quiz has too many questions (limit 1000)'),
  })
  .strict();

export type SaveQuizInput = z.infer<typeof saveQuizInputSchema>;
export type SaveQuizQuestionInput = SaveQuizInput['questions'][number];
export type SaveQuizOptionInput = SaveQuizQuestionInput['options'][number];

export interface SaveQuizValidationError {
  field: string;
  message: string;
}

export function formatSaveQuizErrors(error: z.ZodError): SaveQuizValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'form',
    message: issue.message,
  }));
}

export function summarizeSaveQuizError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Invalid quiz input.';
  const path = first.path.length > 0 ? first.path.join('.') : 'form';
  return `${path}: ${first.message}`;
}

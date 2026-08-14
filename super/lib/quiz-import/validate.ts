import type {
  ParsedImportFile,
  QuestionType,
  QuizImportError,
  QuizImportValidatedRow,
  QuizImportValidationResult,
} from './types';
import { mapHeaders, type HeaderMapResult } from './headers';

type AliasLookup = Map<string, QuestionType>;

const QUESTION_TYPE_ALIASES: AliasLookup = new Map([
  ['singlechoice', 'single_choice'],
  ['single_choice', 'single_choice'],
  ['single', 'single_choice'],
  ['mcq', 'single_choice'],

  ['multiplechoice', 'multiple_choice'],
  ['multiple_choice', 'multiple_choice'],
  ['multichoice', 'multiple_choice'],
  ['multi_choice', 'multiple_choice'],
  ['multiple', 'multiple_choice'],
  ['multiselect', 'multiple_choice'],
  ['multiselectchoice', 'multiple_choice'],
  ['multi_select', 'multiple_choice'],
  ['multi', 'multiple_choice'],

  ['truefalse', 'true_false'],
  ['true_false', 'true_false'],
  ['truelie', 'true_false'],
  ['boolean', 'true_false'],
]);

function normalizeTrueFalse(token: string): string {
  return token.trim().toLowerCase();
}

function resolveQuestionType(raw: string): QuestionType | null {
  const norm = raw.trim().toLowerCase().replace(/[\s_\-]+/g, '_').replace(/_+/g, '_');
  const compact = norm.replace(/^_+|_+$/g, '').replace(/\//g, '_');
  const single = compact.replace(/_/g, '');
  const candidates = [norm, compact, single];
  for (const c of candidates) {
    const hit = QUESTION_TYPE_ALIASES.get(c);
    if (hit) return hit;
  }
  return null;
}

export function listQuestionTypeAliases(): Array<{ canonical: QuestionType; aliases: string[] }> {
  const grouped: Record<QuestionType, Set<string>> = {
    single_choice: new Set(),
    multiple_choice: new Set(),
    true_false: new Set(),
  };
  for (const [alias, canonical] of QUESTION_TYPE_ALIASES.entries()) {
    grouped[canonical].add(alias);
  }
  return (['single_choice', 'multiple_choice', 'true_false'] as QuestionType[]).map(
    (canonical) => ({
      canonical,
      aliases: Array.from(grouped[canonical]).sort(),
    }),
  );
}

function inferQuestionType(
  options: string[],
  correctIndexes: number[],
  trueFalseLooks: boolean,
): QuestionType | null {
  void trueFalseLooks;
  if (correctIndexes.length === 0) return null;
  if (correctIndexes.length > 1) return 'multiple_choice';
  return 'single_choice';
}

function tokensFromCorrect(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function tokenToIndex(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (t === 'a' || t === 'option a' || t === 'choice a' || t === 'answer a') return 0;
  if (t === 'b' || t === 'option b' || t === 'choice b' || t === 'answer b') return 1;
  if (t === 'c' || t === 'option c' || t === 'choice c' || t === 'answer c') return 2;
  if (t === 'd' || t === 'option d' || t === 'choice d' || t === 'answer d') return 3;
  return null;
}

function isTrueFalseOptions(options: string[]): boolean {
  if (options.length !== 2) return false;
  const [a, b] = options.map((s) => normalizeTrueFalse(s));
  return (
    (a === 'true' && b === 'false') || (a === 'false' && b === 'true')
  );
}

export interface ValidateOptions {
  maxQuestionRows?: number;
}

export function validateImport(
  parsed: ParsedImportFile,
  rawHeaders: string[],
  options: ValidateOptions = {},
): QuizImportValidationResult {
  const errors: QuizImportError[] = [];
  const validated: QuizImportValidatedRow[] = [];
  const max = options.maxQuestionRows ?? Infinity;

  const headerResolution: HeaderMapResult = mapHeaders(rawHeaders);

  const required: Array<{ canonical: 'question' | 'option_a' | 'option_b' | 'correct_answer' | 'explanation'; label: string }> = [
    { canonical: 'question', label: 'Question' },
    { canonical: 'option_a', label: 'Option A' },
    { canonical: 'option_b', label: 'Option B' },
    { canonical: 'correct_answer', label: 'Correct Answer' },
    { canonical: 'explanation', label: 'Explanation' },
  ];

  for (const req of required) {
    if (!headerResolution.map[req.canonical]) {
      errors.push({
        code: 'MISSING_REQUIRED_COLUMN',
        column: req.label,
        message: `Missing required column: ${req.label}`,
      });
    }
  }

  for (const dup of headerResolution.duplicates) {
    errors.push({
      code: 'DUPLICATE_COLUMN',
      column: dup.canonical,
      message: `Duplicate column for ${prettyColumn(dup.canonical)}: ${dup.headers.join(', ')}`,
    });
  }

  if (parsed.rows.length > max) {
    errors.push({
      code: 'TOO_MANY_ROWS',
      message: `Too many question rows: ${parsed.rows.length} (limit ${max}).`,
    });
    return {
      ok: false,
      rows: [],
      errors,
      validRowCount: 0,
      invalidRowCount: parsed.rows.length,
      optionCount: 0,
      totalPoints: 0,
    };
  }

  // Bail out on header-level errors so we don't generate noisy row errors on top
  const hasHeaderError = errors.some((e) =>
    ['MISSING_REQUIRED_COLUMN', 'DUPLICATE_COLUMN'].includes(e.code),
  );
  if (hasHeaderError) {
    return {
      ok: false,
      rows: [],
      errors,
      validRowCount: 0,
      invalidRowCount: parsed.rows.length,
      optionCount: 0,
      totalPoints: 0,
    };
  }

  let invalidRowCount = 0;
  let totalPoints = 0;
  let optionCount = 0;

  for (const row of parsed.rows) {
    const rowErrors: QuizImportError[] = [];

    const text = row.text.trim();
    if (!text) {
      rowErrors.push({
        row: row.sourceRow,
        code: 'QUESTION_EMPTY',
        message: `Row ${row.sourceRow}: Question is empty`,
      });
    }

    const rawOptions = [row.optionA, row.optionB, row.optionC, row.optionD];
    const options = rawOptions.map((o) => o.trim());
    const nonEmptyOptions = options.filter((o) => o.length > 0);
    if (nonEmptyOptions.length < 2) {
      rowErrors.push({
        row: row.sourceRow,
        code: 'TOO_FEW_OPTIONS',
        message: `Row ${row.sourceRow}: Question needs at least 2 non-empty options`,
      });
    }

    const correctTokens = tokensFromCorrect(row.correctRaw);
    if (correctTokens.length === 0) {
      rowErrors.push({
        row: row.sourceRow,
        code: 'CORRECT_ANSWER_MISSING',
        message: `Row ${row.sourceRow}, Correct Answer: value is empty`,
      });
    }

    const correctIndexes: number[] = [];
    for (const tk of correctTokens) {
      const idx = tokenToIndex(tk);
      if (idx == null) {
        rowErrors.push({
          row: row.sourceRow,
          column: 'Correct Answer',
          code: 'CORRECT_ANSWER_INVALID',
          message: `Row ${row.sourceRow}, Correct Answer: "${tk}" is invalid`,
        });
        continue;
      }
      const isAvailable = options[idx].length > 0;
      if (!isAvailable) {
        rowErrors.push({
          row: row.sourceRow,
          column: optionColumnLabel(idx),
          code: 'CORRECT_OPTION_EMPTY',
          message: `Row ${row.sourceRow}, ${optionColumnLabel(
            idx,
          )}: ${optionColumnLabel(idx)} is marked correct but is empty`,
        });
        continue;
      }
      if (!correctIndexes.includes(idx)) correctIndexes.push(idx);
    }

    const explanation = row.explanation.trim();
    if (!explanation) {
      rowErrors.push({
        row: row.sourceRow,
        code: 'EXPLANATION_EMPTY',
        message: `Row ${row.sourceRow}: Explanation is required`,
      });
    }

    let points = 1;
    const pointsRaw = row.pointsRaw.trim();
    if (pointsRaw.length > 0) {
      const num = Number(pointsRaw);
      if (!Number.isFinite(num) || num <= 0) {
        rowErrors.push({
          row: row.sourceRow,
          column: 'Points',
          code: 'POINTS_INVALID',
          message: `Row ${row.sourceRow}, Points: Points must be greater than 0`,
        });
      } else {
        points = num;
      }
    }

    const explicitType = row.questionTypeRaw.trim()
      ? resolveQuestionType(row.questionTypeRaw)
      : undefined;
    const typeErrorToken = explicitType === undefined && row.questionTypeRaw.trim().length > 0;

    let questionType: QuestionType | null = null;
    if (typeErrorToken) {
      rowErrors.push({
        row: row.sourceRow,
        column: 'Question Type',
        code: 'QUESTION_TYPE_INVALID',
        message: `Row ${row.sourceRow}, Question Type: "${row.questionTypeRaw.trim()}" is not a supported question type`,
      });
    } else if (explicitType) {
      questionType = explicitType;
    } else {
      const inferred = inferQuestionType(
        options,
        correctIndexes,
        isTrueFalseOptions(nonEmptyOptions),
      );
      if (inferred === null) {
        rowErrors.push({
          row: row.sourceRow,
          code: 'QUESTION_TYPE_UNKNOWN',
          message: `Row ${row.sourceRow}: Could not infer question type. Add a Question Type column.`,
        });
      } else {
        questionType = inferred;
      }
    }

    // Refine true/false auto-inference
    if (
      !row.questionTypeRaw.trim() &&
      questionType &&
      questionType !== 'true_false' &&
      isTrueFalseOptions(nonEmptyOptions) &&
      correctIndexes.length === 1
    ) {
      questionType = 'true_false';
    }

    if (questionType === 'true_false') {
      if (nonEmptyOptions.length !== 2) {
        rowErrors.push({
          row: row.sourceRow,
          column: 'Question Type',
          code: 'TRUE_FALSE_OPTION_COUNT',
          message: `Row ${row.sourceRow}, Question Type: true/false must have exactly two options (True and False)`,
        });
      }
      if (!isTrueFalseOptions(nonEmptyOptions)) {
        rowErrors.push({
          row: row.sourceRow,
          column: 'Question Type',
          code: 'TRUE_FALSE_VALUES',
          message: `Row ${row.sourceRow}, Question Type: true/false options must be "True" and "False"`,
        });
      }
      if (correctIndexes.length !== 1) {
        rowErrors.push({
          row: row.sourceRow,
          column: 'Correct Answer',
          code: 'TRUE_FALSE_CORRECT_COUNT',
          message: `Row ${row.sourceRow}, Correct Answer: true/false must have exactly one correct answer`,
        });
      }
    } else if (questionType === 'single_choice') {
      if (correctIndexes.length !== 1) {
        rowErrors.push({
          row: row.sourceRow,
          column: 'Correct Answer',
          code: 'SINGLE_CHOICE_CORRECT_COUNT',
          message: `Row ${row.sourceRow}, Correct Answer: single choice must have exactly one correct answer`,
        });
      }
    } else if (questionType === 'multiple_choice') {
      if (correctIndexes.length < 1) {
        rowErrors.push({
          row: row.sourceRow,
          column: 'Correct Answer',
          code: 'MULTI_CHOICE_CORRECT_COUNT',
          message: `Row ${row.sourceRow}, Correct Answer: multiple choice must have at least one correct answer`,
        });
      }
    }

    if (rowErrors.length > 0) {
      invalidRowCount++;
      errors.push(...rowErrors);
    } else if (questionType) {
      const finalOptions = finalizeOptions(questionType, options);
      const finalCorrect = finalizeCorrect(questionType, finalOptions, correctIndexes);
      validated.push({
        sourceRow: row.sourceRow,
        text,
        options: finalOptions,
        correctIndexes: finalCorrect,
        explanation,
        points,
        questionType,
      });
      optionCount += finalOptions.length;
      totalPoints += points;
    }
  }

  return {
    ok: errors.length === 0 && validated.length > 0,
    rows: validated,
    errors,
    validRowCount: validated.length,
    invalidRowCount,
    optionCount,
    totalPoints,
  };
}

function optionColumnLabel(idx: number): string {
  return ['Option A', 'Option B', 'Option C', 'Option D'][idx] ?? `Option ${idx + 1}`;
}

function prettyColumn(canonical: string): string {
  switch (canonical) {
    case 'question':
      return 'Question';
    case 'option_a':
      return 'Option A';
    case 'option_b':
      return 'Option B';
    case 'option_c':
      return 'Option C';
    case 'option_d':
      return 'Option D';
    case 'correct_answer':
      return 'Correct Answer';
    case 'explanation':
      return 'Explanation';
    case 'points':
      return 'Points';
    case 'question_type':
      return 'Question Type';
    default:
      return canonical;
  }
}

function finalizeOptions(
  type: QuestionType,
  options: string[],
): string[] {
  if (type === 'true_false') {
    const [a, b] = options;
    if (a && b) {
      return [a, b].map((s) => s.trim());
    }
    return ['True', 'False'];
  }
  return options.filter((o) => o.length > 0);
}

function finalizeCorrect(
  type: QuestionType,
  finalOptions: string[],
  correctIndexes: number[],
): number[] {
  if (type === 'true_false') {
    return correctIndexes.length > 0 ? [correctIndexes[0]] : [];
  }
  const max = finalOptions.length;
  return correctIndexes.filter((i) => i >= 0 && i < max);
}

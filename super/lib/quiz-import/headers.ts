import type { CanonicalColumn } from './types';

const HEADER_ALIASES: Record<string, CanonicalColumn> = {
  question: 'question',
  questions: 'question',
  question_text: 'question',
  questiontext: 'question',
  qustion_text: 'question',
  prompt: 'question',
  q: 'question',
  quretion: 'question',
  quetion: 'question',
  question_text_1: 'question',

  option_a: 'option_a',
  choice_a: 'option_a',
  answer_a: 'option_a',
  choicea: 'option_a',
  answera: 'option_a',
  optiona: 'option_a',
  a: 'option_a',

  option_b: 'option_b',
  choice_b: 'option_b',
  answer_b: 'option_b',
  choiceb: 'option_b',
  answerb: 'option_b',
  optionb: 'option_b',
  b: 'option_b',

  option_c: 'option_c',
  choice_c: 'option_c',
  answer_c: 'option_c',
  choicec: 'option_c',
  answerc: 'option_c',
  optionc: 'option_c',
  c: 'option_c',

  option_d: 'option_d',
  choice_d: 'option_d',
  answer_d: 'option_d',
  choiced: 'option_d',
  answerd: 'option_d',
  optiond: 'option_d',
  d: 'option_d',

  correct_answer: 'correct_answer',
  correctanswer: 'correct_answer',
  correct_option: 'correct_answer',
  correctoption: 'correct_answer',
  correct: 'correct_answer',
  answer_key: 'correct_answer',
  answerkey: 'correct_answer',
  answer: 'correct_answer',
  key: 'correct_answer',
  solution: 'correct_answer',

  explanation: 'explanation',
  answer_explanation: 'explanation',
  answerexplanation: 'explanation',
  rationale: 'explanation',
  reason: 'explanation',
  comment: 'explanation',

  points: 'points',
  point: 'points',
  pts: 'points',
  marks: 'points',
  mark: 'points',
  score: 'points',
  weight: 'points',
  weighting: 'points',

  question_type: 'question_type',
  questiontype: 'question_type',
  qtype: 'question_type',
  type: 'question_type',
};

export function normalizeHeader(raw: string): string {
  if (raw == null) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, '_')
    .replace(/[^a-z0-9]/g, '');
}

export function resolveHeader(raw: string): CanonicalColumn | null {
  const norm = normalizeHeader(raw);
  if (!norm) return null;
  return HEADER_ALIASES[norm] ?? null;
}

export interface HeaderResolution {
  canonical: CanonicalColumn;
  original: string;
}

export interface HeaderAliasEntry {
  canonical: CanonicalColumn;
  aliases: string[];
}

export const HEADER_CANONICALS: readonly CanonicalColumn[] = [
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'explanation',
  'points',
  'question_type',
];

export function listHeaderAliases(): HeaderAliasEntry[] {
  const grouped: Record<CanonicalColumn, Set<string>> = {
    question: new Set(),
    option_a: new Set(),
    option_b: new Set(),
    option_c: new Set(),
    option_d: new Set(),
    correct_answer: new Set(),
    explanation: new Set(),
    points: new Set(),
    question_type: new Set(),
  };
  for (const [alias, canonical] of Object.entries(HEADER_ALIASES)) {
    grouped[canonical].add(alias);
  }
  return HEADER_CANONICALS.map((canonical) => ({
    canonical,
    aliases: Array.from(grouped[canonical]).sort(),
  }));
}

export interface HeaderMapResult {
  map: Partial<Record<CanonicalColumn, string>>;
  duplicates: Array<{ canonical: CanonicalColumn; headers: string[] }>;
  ignored: string[];
  unresolved: string[];
}

export function mapHeaders(rawHeaders: string[]): HeaderMapResult {
  const seen = new Map<CanonicalColumn, string[]>();
  const map: Partial<Record<CanonicalColumn, string>> = {};
  const ignored: string[] = [];
  const unresolved: string[] = [];

  for (const raw of rawHeaders) {
    const canonical = resolveHeader(raw);
    if (!canonical) {
      const trimmed = String(raw ?? '').trim();
      if (trimmed) ignored.push(trimmed);
      else ignored.push('');
      continue;
    }
    if (map[canonical]) {
      const existing = seen.get(canonical) ?? [];
      existing.push(String(raw ?? '').trim());
      seen.set(canonical, existing);
      continue;
    }
    map[canonical] = String(raw ?? '').trim();
    seen.set(canonical, [String(raw ?? '').trim()]);
  }

  const duplicates: Array<{ canonical: CanonicalColumn; headers: string[] }> = [];
  for (const [canonical, headers] of seen.entries()) {
    if (headers.length > 1) {
      duplicates.push({ canonical, headers });
    }
    void unresolved;
  }

  return { map, duplicates, ignored, unresolved };
}

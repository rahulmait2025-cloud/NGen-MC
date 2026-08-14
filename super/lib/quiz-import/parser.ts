import type { ParsedImportFile, QuizImportRow } from './types';
import { mapHeaders } from './headers';

function cellValue(row: Record<string, unknown>, key: string | undefined): string {
  if (key == null) return '';
  const v = row[key];
  if (v == null) return '';
  return String(v);
}

function rowIsBlank(row: QuizImportRow): boolean {
  return (
    !row.text.trim() &&
    !row.optionA.trim() &&
    !row.optionB.trim() &&
    !row.optionC.trim() &&
    !row.optionD.trim() &&
    !row.correctRaw.trim() &&
    !row.explanation.trim() &&
    !row.pointsRaw.trim() &&
    !row.questionTypeRaw.trim()
  );
}

export function parseRawRows(
  rawHeaders: string[],
  rawRows: Array<Record<string, unknown>>,
): ParsedImportFile {
  const { map } = mapHeaders(rawHeaders);
  const rows: QuizImportRow[] = [];
  let rawNonEmptyRowCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i] ?? {};
    const row: QuizImportRow = {
      sourceRow: i + 2,
      text: cellValue(raw, map.question),
      optionA: cellValue(raw, map.option_a),
      optionB: cellValue(raw, map.option_b),
      optionC: cellValue(raw, map.option_c),
      optionD: cellValue(raw, map.option_d),
      correctRaw: cellValue(raw, map.correct_answer),
      explanation: cellValue(raw, map.explanation),
      pointsRaw: cellValue(raw, map.points),
      questionTypeRaw: cellValue(raw, map.question_type),
    };
    if (rowIsBlank(row)) continue;
    rows.push(row);
    rawNonEmptyRowCount++;
  }

  return {
    rows,
    rawRowCount: rawRows.length,
    rawNonEmptyRowCount,
  };
}

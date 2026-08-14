const LEADING_NUMBER_PATTERN = /^\s*\d+(?:\.\d+)?\s*(?:[-.:)]\s*)?/i;
const HASHTAG_PATTERN = /#[\w.]+/g;
const TRAILING_PIPE_PATTERN = /\s*\|\s*$/;
const LEADING_PIPE_PATTERN = /^\s*\|\s*/;
const DOUBLE_PIPE_PATTERN = /\|\s*\|/g;
const MULTI_SPACE_PATTERN = /\s{2,}/g;
const TRAILING_HYPHEN_PATTERN = /\s*-\s*$/;

/** Display-only cleanup for raw YouTube playlist video titles. */
export function formatYoutubeLessonTitle(title: string): string {
  if (!title?.trim()) {
    return 'Untitled lesson';
  }

  let cleaned = title.trim();

  cleaned = cleaned.replace(HASHTAG_PATTERN, '');

  while (LEADING_NUMBER_PATTERN.test(cleaned)) {
    cleaned = cleaned.replace(LEADING_NUMBER_PATTERN, '');
  }

  cleaned = cleaned
    .replace(DOUBLE_PIPE_PATTERN, '|')
    .replace(TRAILING_PIPE_PATTERN, '')
    .replace(LEADING_PIPE_PATTERN, '')
    .replace(MULTI_SPACE_PATTERN, ' ')
    .replace(TRAILING_HYPHEN_PATTERN, '')
    .trim();

  return cleaned || 'Untitled lesson';
}

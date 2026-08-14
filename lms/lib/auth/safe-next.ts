/** Allow only same-origin relative paths; block protocol-relative and absolute URLs. */
export function getSafeNext(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return fallback;
  return trimmed;
}

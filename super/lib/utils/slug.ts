/**
 * Normalize a string into a URL-safe slug.
 * Consistent implementation across LMS, SuperAdmin, and CollegeAdmin.
 *
 * Handles fullwidth characters (｜→|), Unicode separators, commas, dots,
 * and other special characters before slugifying.
 */
export function slugifyText(input: string): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    // Replace fullwidth and special Unicode separators with standard space
    .replace(/[\uFF5C\uFF0F\uFF1A\uFF1B\uFF0C\uFF0E\u3001\u3002]/g, ' ')
    // Collapse any remaining non-alphanumeric sequences into a single hyphen
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a string is a valid UUID (v4).
 */
export function isUuid(input: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

/**
 * Generate a unique slug for a course item within a course.
 * Appends suffix to avoid collisions with existing slugs.
 */
export function generateItemSlug(
  title: string,
  existingSlugs: Set<string>,
): string {
  const base = slugifyText(title);
  let candidate = base;
  let counter = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  return candidate;
}

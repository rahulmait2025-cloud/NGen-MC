/**
 * Normalize a string into a URL-safe slug.
 * Consistent implementation across LMS, SuperAdmin, and CollegeAdmin.
 *
 * Handles fullwidth characters (｜→|), Unicode separators, commas, dots,
 * and other special characters before slugifying.
 */
export function slugify(input: string): string {
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

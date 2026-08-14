/**
 * Normalize a string into a URL-safe slug.
 * Consistent implementation across LMS, SuperAdmin, and CollegeAdmin.
 *
 * Handles fullwidth characters (｜→|), Unicode separators, commas, dots,
 * and other special characters before slugifying.
 */
/**
 * Check if a string is a valid UUID (v4).
 */
export function isUuid(input: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

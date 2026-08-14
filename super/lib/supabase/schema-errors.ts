/**
 * Schema-cache and missing-table error detection for Supabase/PostgREST.
 * Use to degrade safely when migrations are not applied or schema cache is stale.
 *
 * - 42P01: undefined_table (table does not exist)
 * - 42703: undefined_column (column does not exist)
 * - PGRST204: PostgREST "relation not found" / schema cache miss
 * - Message "schema cache": PostgREST could not find table in schema cache
 */

export type SchemaErrorKind = 'missing_table' | 'missing_column' | 'schema_cache_miss';

export interface SchemaErrorInfo {
  kind: SchemaErrorKind;
  code: string | undefined;
  message: string;
  table?: string;
  context: string;
}

const SCHEMA_CACHE_MSG = 'schema cache';
const CODE_UNDEFINED_TABLE = '42P01';
const CODE_UNDEFINED_COLUMN = '42703';
const CODE_PGRST_RELATION = 'PGRST204';

/**
 * Returns true if the error indicates a missing table, missing column, or schema cache miss.
 */
 
function _isSchemaOrCacheError(
  code: string | undefined,
  message: string | undefined,
  options?: { tableHint?: string }
): boolean {
  const msg = (message ?? '').toLowerCase();
  if (code === CODE_UNDEFINED_TABLE || code === CODE_PGRST_RELATION) return true;
  if (code === CODE_UNDEFINED_COLUMN) return true;
  if (msg.includes(SCHEMA_CACHE_MSG)) return true;
  if (options?.tableHint && msg.includes(options.tableHint) && msg.includes('does not exist')) return true;
  return false;
}

/**
 * Build structured info for logging. Call when degrading (e.g. returning empty array).
 * Does not throw; use for logging only.
 */
export function schemaErrorInfo(
  context: string,
  code: string | undefined,
  message: string,
  tableHint?: string
): SchemaErrorInfo {
  const msg = message ?? '';
  let kind: SchemaErrorKind = 'schema_cache_miss';
  if (code === CODE_UNDEFINED_TABLE || (msg.includes(SCHEMA_CACHE_MSG) && !code)) kind = 'missing_table';
  else if (code === CODE_UNDEFINED_COLUMN || (msg.includes('does not exist') && msg.includes(tableHint ?? ''))) kind = 'missing_column';
  return { kind, code, message: msg, table: tableHint, context };
}

/**
 * Log a structured warning when degrading due to schema/cache error.
 * Always logs so production issues are visible; not silent.
 */
export function logSchemaDegradation(info: SchemaErrorInfo): void {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[schema] ${info.context}: ${info.kind} (${info.code ?? 'n/a'}) - ${info.message}`);
  }
}

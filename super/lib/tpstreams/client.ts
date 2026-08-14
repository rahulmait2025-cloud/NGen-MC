import 'server-only';

/**
 * TPStreams HTTP Client - transport layer core.
 *
 * Reads credentials from environment at call-time (never at module load) so
 * that the module is safe to import in any server context without throwing on
 * missing env vars during the build phase.
 *
 * Environment variables:
 *   TP_STREAMS_API_TOKEN  - Preferred API authentication token
 *   TP_STREAMS_URL        - Legacy API authentication token fallback
 *   ORGANISATION_ID       - Default organisation identifier used in path templates
 *
 * All helpers are pure functions; they do NOT store state.
 */

// --- Constants ----------------------------------------------------------------

const TPSTREAMS_BASE_URL = 'https://app.tpstreams.com';
const TPSTREAMS_API_VERSION = 'v1';

/** Max retries for idempotent requests (GET, DELETE). */
const MAX_RETRIES = 3;
/** Base wait before first retry (ms). Each retry doubles this. */
const RETRY_BASE_MS = 300;
/** HTTP status codes that are safe to retry. */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// --- Env helpers (server-only, called at request time) ------------------------

/** Returns the TPStreams auth token from env. Throws if missing. */
export function getTpStreamsToken(): string {
  const token = process.env.TP_STREAMS_API_TOKEN ?? process.env.TP_STREAMS_URL;
  if (!token) {
    throw new TpStreamsConfigError(
      'TP_STREAMS_API_TOKEN is not set. Add it to your .env file. TP_STREAMS_URL is still supported as a legacy fallback.',
    );
  }
  return token;
}

/** Returns the default organisation ID from env. Throws if missing. */
export function getTpStreamsOrgId(): string {
  const orgId = process.env.ORGANISATION_ID;
  if (!orgId) {
    throw new TpStreamsConfigError(
      'ORGANISATION_ID is not set. Add it to your .env file.',
    );
  }
  return orgId;
}

/** Returns the TPStreams username from env. Throws if missing. */
function _getTpStreamsUsername(): string {
  const username = process.env.TP_STREAMS_USERNAME;
  if (!username) {
    throw new TpStreamsConfigError(
      'TP_STREAMS_USERNAME is not set. Add it to your .env file.',
    );
  }
  return username;
}

/** Returns the TPStreams password from env. Throws if missing. */
function _getTpStreamsPassword(): string {
  const password = process.env.TP_STREAMS_PASSWORD;
  if (!password) {
    throw new TpStreamsConfigError(
      'TP_STREAMS_PASSWORD is not set. Add it to your .env file.',
    );
  }
  return password;
}

// --- Header builders ----------------------------------------------------------

/** Returns the Authorization header value. */
function buildAuthHeader(tokenOverride?: string): Record<string, string> {
  return { Authorization: `Token ${tokenOverride ?? getTpStreamsToken()}` };
}

/** Returns headers for JSON requests. */
function buildJsonHeaders(tokenOverride?: string): Record<string, string> {
  return {
    ...buildAuthHeader(tokenOverride),
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
  };
}

/** Returns headers for multipart/form-data (do NOT set Content-Type - let fetch set boundary). */
function buildMultipartHeaders(tokenOverride?: string): Record<string, string> {
  return {
    ...buildAuthHeader(tokenOverride),
    Accept: 'application/json',
  };
}

// --- URL builders -------------------------------------------------------------

/** Constructs an absolute TPStreams API URL. */
function buildUrl(path: string): string {
  // Normalise leading slash
  const normPath = path.startsWith('/') ? path : `/${path}`;
  return `${TPSTREAMS_BASE_URL}/api/${TPSTREAMS_API_VERSION}${normPath}`;
}

/** Builds the org-scoped path prefix. */
export function orgPath(orgId?: string): string {
  const id = orgId ?? getTpStreamsOrgId();
  return `/${id}`;
}

// --- Error classes ------------------------------------------------------------

/** Thrown when an env var required by the TPStreams client is missing. */
class TpStreamsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TpStreamsConfigError';
  }
}

/** Thrown when the TPStreams API returns a non-2xx response. */
export class TpStreamsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
    public readonly endpoint: string,
  ) {
    super(`TPStreams API error ${status} on ${endpoint}: ${statusText}`);
    this.name = 'TpStreamsApiError';
  }
}

class TpStreamsAuthError extends TpStreamsApiError {
  constructor(
    status: number,
    statusText: string,
    body: unknown,
    endpoint: string,
  ) {
    super(status, statusText, body, endpoint);
    this.name = 'TpStreamsAuthError';
  }
}

function isTpStreamsAuthFailure(error: unknown): error is TpStreamsApiError {
  return error instanceof TpStreamsApiError && (error.status === 401 || error.status === 403);
}

function _getTpStreamsUserSafeErrorMessage(
  error: unknown,
  fallback: string = 'TPStreams request failed.',
): string {
  if (error instanceof TpStreamsConfigError) {
    return error.message;
  }

  if (isTpStreamsAuthFailure(error)) {
    return 'TPStreams authentication failed. Verify the configured credentials and token settings.';
  }

  if (error instanceof TpStreamsApiError) {
    return `${fallback} TPStreams returned ${error.status} ${error.statusText}.`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// --- Logging hooks ------------------------------------------------------------

export type TpStreamsLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TpStreamsLogEntry {
  level: TpStreamsLogLevel;
  message: string;
  endpoint: string;
  method: string;
  status?: number;
  durationMs?: number;
  attempt?: number;
  errorType?: string;
  context?: string;
}

const LOG_PREFIX = '[TPStreams]';

export function tpLog(entry: TpStreamsLogEntry): void {
  const parts = [
    `${entry.method.toUpperCase()} ${entry.endpoint}`,
    entry.status !== undefined ? `status=${entry.status}` : null,
    entry.durationMs !== undefined ? `${entry.durationMs}ms` : null,
    entry.attempt !== undefined ? `attempt=${entry.attempt}` : null,
    entry.errorType ? `error=${entry.errorType}` : null,
    entry.context ? `context=${entry.context}` : null,
    entry.message ? `msg="${entry.message}"` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const line = `${LOG_PREFIX} ${parts}`;

  switch (entry.level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'debug':
      if (process.env.TPSTREAMS_DEBUG === '1') console.debug(line);
      break;
    default:
      console.log(line);
  }
}

export function logTpStreamsInternalError(
  context: string,
  error: unknown,
  meta?: {
    endpoint?: string;
    method?: string;
    status?: number;
  },
): void {
  const endpoint =
    meta?.endpoint ??
    (error instanceof TpStreamsApiError ? error.endpoint : '/unknown');
  const status =
    meta?.status ??
    (error instanceof TpStreamsApiError ? error.status : undefined);
  const method = meta?.method ?? 'INTERNAL';

  tpLog({
    level: 'error',
    message: error instanceof Error ? error.message : 'Unknown TPStreams error',
    endpoint,
    method,
    status,
    errorType: error instanceof Error ? error.name : 'UnknownError',
    context,
  });
}

// --- Retry helper -------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Core fetch wrapper -------------------------------------------------------

export interface TpFetchOptions {
  /** Endpoint path relative to base (e.g. "/org/assets/"). */
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  /** JSON-serialisable body (used when sending JSON). */
  body?: unknown;
  /** Raw FormData body (used for multipart endpoints). */
  formData?: FormData;
  /** Override max retries (default: MAX_RETRIES for idempotent, 1 for POST). */
  maxRetries?: number;
  /** Additional query parameters. */
  params?: Record<string, string | number | boolean | undefined>;
}

export interface TpFetchResult<T> {
  data: T;
  status: number;
}

/**
 * Core fetch function with retry, logging, and error handling.
 * Never call this directly from business code - use the typed service methods.
 */
async function tpFetch<T>(options: TpFetchOptions): Promise<TpFetchResult<T>> {
  const { endpoint, method, headers, body, formData, params } = options;

  // Build URL with query params
  const url = new URL(buildUrl(endpoint));
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  // Determine retry budget: POST/PUT/PATCH = 1 attempt, idempotent = MAX_RETRIES
  const isIdempotent = method === 'GET' || method === 'DELETE';
  const maxRetries = options.maxRetries ?? (isIdempotent ? MAX_RETRIES : 1);

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxRetries) {
    attempt++;
    const t0 = Date.now();

    try {
      const fetchOptions: RequestInit & { cache?: RequestCache } = {
        method,
        headers,
        // Disable Next.js edge/server data cache for TPStreams responses
        cache: 'no-store' as RequestCache,
      };

      if (formData) {
        fetchOptions.body = formData;
      } else if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
      }

      tpLog({
        level: 'debug',
        message: 'request',
        endpoint: url.pathname,
        method,
        attempt,
      });

      const response = await fetch(url.toString(), fetchOptions);
      const durationMs = Date.now() - t0;

      // 204 No Content - return empty object
      if (response.status === 204) {
        tpLog({ level: 'info', message: 'ok', endpoint: url.pathname, method, status: 204, durationMs });
        return { data: {} as T, status: 204 };
      }

      // Parse body
      let parsed: unknown;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        parsed = await response.json();
      } else {
        parsed = await response.text();
      }

      if (!response.ok) {
        // Retry on transient errors
        if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
          const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
          tpLog({
            level: 'warn',
            message: `retrying in ${backoff}ms`,
            endpoint: url.pathname,
            method,
            status: response.status,
            durationMs,
            attempt,
          });
          await sleep(backoff);
          continue;
        }

        tpLog({
          level: 'error',
          message: 'api error',
          endpoint: url.pathname,
          method,
          status: response.status,
          durationMs,
          attempt,
          errorType: 'TpStreamsApiError',
        });

        if (response.status === 401 || response.status === 403) {
          throw new TpStreamsAuthError(response.status, response.statusText, parsed, url.pathname);
        }

        throw new TpStreamsApiError(response.status, response.statusText, parsed, url.pathname);
      }

      tpLog({
        level: 'info',
        message: 'ok',
        endpoint: url.pathname,
        method,
        status: response.status,
        durationMs,
        attempt,
      });

      return { data: parsed as T, status: response.status };
    } catch (err) {
      const durationMs = Date.now() - t0;
      lastError = err;

      // Re-throw API errors immediately (already retried above if retryable)
      if (err instanceof TpStreamsApiError || err instanceof TpStreamsConfigError) throw err;

      // Network errors - retry idempotent requests
      if (isIdempotent && attempt < maxRetries) {
        const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        tpLog({
          level: 'warn',
          message: `network error, retrying in ${backoff}ms`,
          endpoint: url.pathname,
          method,
          durationMs,
          attempt,
          errorType: err instanceof Error ? err.name : 'UnknownError',
        });
        await sleep(backoff);
        continue;
      }

      tpLog({
        level: 'error',
        message: err instanceof Error ? err.message : 'unknown error',
        endpoint: url.pathname,
        method,
        durationMs,
        attempt,
        errorType: err instanceof Error ? err.name : 'UnknownError',
      });

      throw err;
    }
  }

  throw lastError;
}

// --- Convenience wrappers -----------------------------------------------------

/** GET with JSON response. */
export async function tpGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const result = await tpFetch<T>({ endpoint, method: 'GET', headers: buildJsonHeaders(), params });
  return result.data;
}

/** POST with JSON body. Single attempt (not idempotent). */
export async function tpPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const result = await tpFetch<T>({ endpoint, method: 'POST', headers: buildJsonHeaders(), body });
  return result.data;
}

/** PUT with JSON body (full replacement). */
export async function tpPut<T>(endpoint: string, body: unknown): Promise<T> {
  const result = await tpFetch<T>({ endpoint, method: 'PUT', headers: buildJsonHeaders(), body });
  return result.data;
}

/** PATCH with JSON body (partial update). */
export async function tpPatch<T>(endpoint: string, body: unknown): Promise<T> {
  const result = await tpFetch<T>({ endpoint, method: 'PATCH', headers: buildJsonHeaders(), body });
  return result.data;
}

/** DELETE - returns 204 empty on success. */
export async function tpDelete(endpoint: string): Promise<void> {
  await tpFetch<unknown>({ endpoint, method: 'DELETE', headers: buildJsonHeaders() });
}

/** POST with multipart/form-data. Use for file upload endpoints. */
export async function tpPostForm<T>(endpoint: string, formData: FormData): Promise<T> {
  const result = await tpFetch<T>({
    endpoint,
    method: 'POST',
    headers: buildMultipartHeaders(),
    formData,
  });
  return result.data;
}

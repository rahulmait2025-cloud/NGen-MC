import { fetchWithDeduplication } from '@/lib/hooks/use-fetch-dedup';

type StudentVideoAnalyticsParams = {
  weekStart?: string;
  month?: string;
  collegeSlug?: string | null;
  courseId?: string;
};

type AuthEventPayload = {
  event?: string;
  event_type?: string;
  slug?: string | null;
  email?: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
};

type PasswordLoginPayload = {
  email: string;
  password: string;
  slug?: string | null;
  next?: string;
};

type PasswordLoginResult<T> = {
  ok: boolean;
  payload: T | null;
};

function appendDefined(params: URLSearchParams, key: string, value: string | null | undefined): void {
  if (value) params.set(key, value);
}

async function postJson<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'same-origin',
    ...init,
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null) as T | null;
  if (!response.ok) {
    const message = json && typeof json === 'object' && 'error' in json
      ? String((json as { error?: unknown }).error ?? 'Request failed')
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return json as T;
}

export async function getStudentVideoAnalytics<T>(params: StudentVideoAnalyticsParams): Promise<T> {
  const query = new URLSearchParams();
  appendDefined(query, 'weekStart', params.weekStart);
  appendDefined(query, 'month', params.month);
  appendDefined(query, 'collegeSlug', params.collegeSlug);
  appendDefined(query, 'courseId', params.courseId);
  return fetchWithDeduplication<T>(`/api/analytics/student/video?${query.toString()}`, { ttl: 30_000 });
}

export async function getExcalidrawScene<T>(excalidrawUrl: string): Promise<T> {
  return fetchWithDeduplication<T>(
    `/api/excalidraw/scene?url=${encodeURIComponent(excalidrawUrl)}`,
    { ttl: 5 * 60_000 },
  );
}

export async function recordStudentStreak(collegeSlug: string): Promise<Response> {
  return fetch('/api/student/streak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collegeSlug }),
    credentials: 'same-origin',
    keepalive: true,
  });
}

export async function recordStudentAuthEvent(payload: AuthEventPayload): Promise<void> {
  await postJson('/api/student/auth-events', payload);
}

export async function passwordLogin<T>(
  payload: PasswordLoginPayload,
  loginAttemptId: string,
): Promise<PasswordLoginResult<T>> {
  const response = await fetch('/api/auth/password-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-login-attempt-id': loginAttemptId,
    },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  return {
    ok: response.ok,
    payload: await response.json().catch(() => null) as T | null,
  };
}

export function postVideoAnalyticsHeartbeat(
  payload: unknown,
  idempotencyKey: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch('/api/video-analytics/heartbeat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(init?.headers ?? {}),
    },
    ...init,
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

export function postVideoAnalyticsSessionStart(
  payload: unknown,
  idempotencyKey: string,
): Promise<Response> {
  return fetch('/api/video-analytics/session/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export function postVideoAnalyticsSessionEnd(
  payload: unknown,
  idempotencyKey: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch('/api/video-analytics/session/end', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(init?.headers ?? {}),
    },
    ...init,
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  /** If true, deny request when rate limiter fails (for security-sensitive endpoints). Default: false (fail open). */
  failClosed?: boolean;
}

/**
 * Consume one rate-limit slot. Uses Supabase rate_limits table + rate_limit_consume()
 * so limits are enforced across serverless invocations (no in-memory store).
 * 
 * SECURITY: Set failClosed: true for security-sensitive endpoints (login, password reset, auth events).
 * This ensures the endpoint denies requests if the rate limiter backend is unavailable.
 */
export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('rate_limit_consume', {
    p_key: options.key,
    p_window_ms: options.windowMs,
  });

  if (error) {
    if (options.failClosed) {
      console.error('[rate-limit] fail-closed triggered for prefix:', options.key.split(':')[0], 'error:', error.message);
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(options.windowMs / 1000),
      };
    }
    return {
      ok: true,
      remaining: options.limit - 1,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const count = row?.new_count ?? 1;
  const windowStart = row?.out_window_start ? new Date(row.out_window_start).getTime() : Date.now();
  const windowMs = row?.out_window_ms ?? options.windowMs;
  const resetAt = windowStart + windowMs;
  const now = Date.now();

  if (count > options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, options.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

function getRateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Date.now() + result.retryAfterSeconds * 1000),
  };
}

function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}



export function rateLimitResponse(
  message: string,
  result: RateLimitResult,
  limit: number,
  status: number = 429
): NextResponse {
  const headers = { ...getSecurityHeaders(), ...getRateLimitHeaders(result, limit) };
  return NextResponse.json(
    { ok: false, error: message, retryAfterSeconds: result.retryAfterSeconds },
    { status, headers }
  );
}



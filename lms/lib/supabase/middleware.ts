import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or ANON KEY is missing.');
  }
  return { url, key };
}

export const AUTH_CONTEXT_HEADERS = [
  'x-auth-source',
  'x-auth-fast-path',
  'x-auth-fallback-used',
  'x-user-id',
  'x-user-email',
  'x-global-role',
  'x-college-role',
  'x-college-id',
  'x-membership-id',
  'x-student-id',
  'x-profile-active',
  'x-session-version',
  'x-device-id',
  'x-session-id',
  'x-user-fullname',
  'x-role',
  'x-tenant-id',
  'x-auth-context-source',
  'x-auth-resolution-source',
  'x-auth-request-id',
  'x-route-college-slug',
  'x-claim-college-slug',
] as const;

export function stripAuthContextHeaders(headers: Headers) {
  for (const name of AUTH_CONTEXT_HEADERS) {
    headers.delete(name);
  }
}

export function createMiddlewareClient(request: NextRequest) {
  const { url, key } = getSupabaseEnv();

  const sanitizedHeaders = new Headers(request.headers);
  stripAuthContextHeaders(sanitizedHeaders);

  let cookieBuffer: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookieBuffer = cookiesToSet;
      },
    },
  });

  function buildResponse() {
    const response = NextResponse.next({
      request: {
        headers: sanitizedHeaders,
      },
    });
    for (const { name, value, options } of cookieBuffer) {
      if (options) {
        response.cookies.set(name, value, options as Record<string, string | number | boolean | undefined>);
      } else {
        response.cookies.set(name, value);
      }
    }
    return response;
  }

  return { supabase, requestHeaders: sanitizedHeaders, buildResponse };
}

export function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith('sb-') || cookie.name.includes('auth-token'),
  );
}


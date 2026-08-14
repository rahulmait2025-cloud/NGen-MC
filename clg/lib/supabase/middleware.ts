import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { PERSISTENT_COOKIE_OPTIONS, resolveSupabaseKey, resolveSupabaseUrl } from './cookie-options';

export const AUTH_CONTEXT_HEADERS = [
  'x-auth-source',
  'x-auth-fast-path',
  'x-auth-fallback-used',
  'x-user-id',
  'x-user-email',
  'x-user-role',
  'x-global-role',
  'x-college-role',
  'x-college-id',
  'x-college-slug',
  'x-membership-id',
  'x-student-id',
  'x-profile-active',
  'x-session-version',
  'x-device-id',
  'x-session-id',
  'x-user-fullname',
  'x-role',
  'x-tenant-id',
  'x-tenant-slug',
] as const;

export function stripAuthContextHeaders(headers: Headers) {
  for (const name of AUTH_CONTEXT_HEADERS) {
    headers.delete(name);
  }
}

export function createMiddlewareClient(request: NextRequest) {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseKey();

  const sanitizedHeaders = new Headers(request.headers);
  stripAuthContextHeaders(sanitizedHeaders);

  // Buffer cookies from supabase client operations (session refresh, etc.)
  // so they can be applied when buildResponse() is called after auth headers are set.
  let cookieBuffer: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const supabase = createServerClient(url, key, {
    cookieOptions: PERSISTENT_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookieBuffer = cookiesToSet;
      },
    },
  });

  /**
   * Build the NextResponse AFTER all auth headers are set on requestHeaders.
   * Next.js snapshots request headers at NextResponse.next() construction time,
   * so we must defer response creation until the proxy has finished setting headers.
   */
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
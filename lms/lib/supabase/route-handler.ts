import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

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

type BufferedCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

/**
 * Supabase client for Route Handlers (OAuth callback, etc.).
 * Reads PKCE/session cookies from the incoming request and buffers Set-Cookie
 * headers to apply on the final redirect response.
 */
export function createRouteHandlerClient(request: NextRequest) {
  const { url, key } = getSupabaseEnv();
  const pendingCookies: BufferedCookie[] = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  return {
    supabase,
    /** Ensure auth state changes from exchangeCodeForSession are flushed to pending cookies. */
    async commitAuthCookies() {
      await supabase.auth.getUser();
    },
    applyCookiesToResponse(response: NextResponse) {
      pendingCookies.forEach(({ name, value, options }) => {
        if (options) {
          response.cookies.set(name, value, options);
        } else {
          response.cookies.set(name, value);
        }
      });
    },
    getPendingCookieCount() {
      return pendingCookies.length;
    },
  };
}

export function hasPkceVerifierCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) =>
      cookie.name.includes('code-verifier') ||
      (cookie.name.startsWith('sb-') && cookie.name.includes('verifier')),
  );
}

export function hasAuthSessionCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) =>
      cookie.name.startsWith('sb-') ||
      cookie.name.includes('auth-token'),
  );
}


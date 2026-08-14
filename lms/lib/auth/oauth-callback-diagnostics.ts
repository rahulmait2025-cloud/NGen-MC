import type { NextRequest } from 'next/server';
import {
  hasAuthSessionCookies,
  hasPkceVerifierCookie,
} from '@/lib/supabase/route-handler';

/** Dev-only OAuth callback diagnostics (no secrets). */
export function logOAuthCallbackDiagnostics(
  label: string,
  request: NextRequest,
  details: {
    codePresent: boolean;
    redirectToHint?: string | null;
  },
): void {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[${label}] diagnostics`, {
    pathname: request.nextUrl.pathname,
    codePresent: details.codePresent,
    authCookiesPresent: hasAuthSessionCookies(request),
    pkceVerifierCookiePresent: hasPkceVerifierCookie(request),
    redirectToHint: details.redirectToHint ?? null,
  });
}

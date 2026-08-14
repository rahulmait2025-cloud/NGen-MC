import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Session type for TypeScript support.
 */
export type Session = Awaited<ReturnType<typeof getSession>>;

/**
 * Server-side auth session reader.
 *
 * Reads the validated user from the middleware-injected headers (x-user-id, x-user-email)
 * to avoid a second supabase.auth.getUser() network call. The middleware has already
 * validated the token with Supabase Auth, so this is safe.
 *
 * Falls back to getUser() when headers are absent (e.g. API routes not going through middleware).
 *
 * Wrapped with React cache() to deduplicate calls within a single request.
 */
export const getSession = cache(async () => {
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  const userEmail = headerStore.get('x-user-email');

  if (userId) {
    return {
      session: {
      user: {
        id: userId,
        email: userEmail,
        app_metadata: {} as Record<string, unknown>,
        user_metadata: {} as Record<string, unknown>,
        aud: '',
        created_at: '',
        role: '',
      } as User,
      },
      error: null,
    };
  }

  // Fallback: verify identity via JWT claims (no Auth server call with asymmetric keys).
  // getUser() contacts the Supabase Auth server and should be avoided on normal page loads.
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return { session: null, error: error ?? new Error('No valid claims') };
  }

  const claims = data.claims;
  const appMeta = claims.app_metadata as Record<string, unknown> | undefined;
  const userMeta = claims.user_metadata as Record<string, unknown> | undefined;

  return {
    session: {
      user: {
        id: claims.sub as string,
        email: claims.email as string | undefined,
        app_metadata: appMeta ?? {},
        user_metadata: userMeta ?? {},
        aud: '',
        created_at: '',
        role: '',
      } as User,
    },
    error: null,
  };
});
import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type Session = Awaited<ReturnType<typeof getSession>>;

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

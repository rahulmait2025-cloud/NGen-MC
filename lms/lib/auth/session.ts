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
    const userRole = headerStore.get('x-user-role');
    const collegeRole = headerStore.get('x-college-role');
    const collegeId = headerStore.get('x-college-id');
    const studentId = headerStore.get('x-student-id');
    const membershipId = headerStore.get('x-membership-id');
    const userFullName = headerStore.get('x-user-fullname');

    return {
      session: {
        user: {
          id: userId,
          email: userEmail,
          app_metadata: {
            global_role: userRole || undefined,
            college_role: collegeRole || undefined,
            college_id: collegeId || undefined,
            student_id: studentId || undefined,
            membership_id: membershipId || undefined,
          } as Record<string, unknown>,
          user_metadata: {
            full_name: userFullName || undefined,
          } as Record<string, unknown>,
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


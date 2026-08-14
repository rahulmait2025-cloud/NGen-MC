import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LoginRouteContext {
  user_id: string;
  profile_is_active: boolean | null;
  profile_email: string | null;
  profile_full_name: string | null;
  profile_global_role: string | null;
  admin_membership_id: string | null;
  admin_college_id: string | null;
  admin_college_slug: string | null;
  admin_membership_status: string | null;
  student_membership_id: string | null;
  student_college_id: string | null;
  student_college_slug: string | null;
  student_membership_status: string | null;
  student_id: string | null;
}

export const resolveLoginRouteContext = cache(async function resolveLoginRouteContext(
  userId: string,
  existingSupabase?: SupabaseClient,
): Promise<LoginRouteContext | null> {
  const supabase = existingSupabase ?? await createClient();
  const { data, error } = await supabase
    .rpc('resolve_login_route_context', {
      p_user_id: userId,
    })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as LoginRouteContext | null;
});

import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

/**
 * Standardized redirect reasons for auth failures.
 * Use these consistently across all auth guards and redirects.
 */
export type RedirectReason =
  | 'unauthenticated'
  | 'wrong_portal'
  | 'no_membership'
  | 'invalid_tenant'
  | 'inactive_account'
  | 'not_authorized'
  | 'forbidden_role';

/**
 * Redirect authenticated admin to their first tenant dashboard.
 * Use on root page or when admin needs to be routed to their college.
 */
export async function redirectToAdminTenant(subPath: string = ''): Promise<never> {
  const { session } = await getSession();
  
  if (!session?.user) {
    redirect('/login?reason=unauthenticated');
  }

  const supabase = await createClient();
  
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_active')
      .eq('id', session.user.id)
      .maybeSingle(),
    supabase
      .from('college_memberships')
      .select('id, college_id, status')
      .eq('user_id', session.user.id)
      .in('role', ['college_admin', 'faculty_spoc', 'mentor'])
      .in('status', ['active', 'invited'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profile?.is_active === false) {
    redirect('/login?reason=inactive_account');
  }

  if (!membership) {
    redirect('/unauthorized?reason=no_membership');
  }

  const { data: college } = await supabase
    .from('colleges')
    .select('slug')
    .eq('id', membership.college_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!college) {
    redirect('/unauthorized?reason=invalid_tenant');
  }

  redirect(`/c/${college.slug}/admin${subPath ? `/${subPath}` : '/dashboard'}`);
}



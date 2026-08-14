import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { after } from 'next/server';

/**
 * Auto-activate an invited membership.
 * Uses after() for non-blocking deferred update.
 */
export function autoActivateMembership(membershipId: string) {
  after(async () => {
    const adminSb = createAdminClient();
    await adminSb
      .from('college_memberships')
      .update({ status: 'active' })
      .eq('id', membershipId)
      .eq('status', 'invited');
  });
}

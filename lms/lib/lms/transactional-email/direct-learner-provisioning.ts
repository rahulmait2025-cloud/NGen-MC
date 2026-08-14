import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getDirectLearnerTenant } from '@/lib/services/direct-learners';

export async function directLearnerStudentExists(userId: string): Promise<boolean> {
  const tenant = await getDirectLearnerTenant();
  const admin = createAdminClient();
  const { data } = await admin
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .eq('college_id', tenant.collegeId)
    .maybeSingle();
  return Boolean(data?.id);
}

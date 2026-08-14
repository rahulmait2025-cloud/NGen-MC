import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

interface SyncProfileUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

const isUuid = (val: string | null | undefined): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/**
 * Upsert a profile row for the given user.
 * Uses onConflict: 'id' so it's safe to call from both tenant and global callbacks.
 * Pass an existing Supabase client to avoid creating a redundant one.
 */
export async function syncProfile(
  user: SyncProfileUser,
  existingSupabase?: SupabaseClient,
): Promise<void> {
  const supabase = existingSupabase ?? await createClient();
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    undefined;

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? undefined,
      full_name: (user.user_metadata?.full_name as string) ?? undefined,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    },
    { onConflict: 'id' }
  );
}

/**
 * Server-controlled app_metadata synchronizer for authenticated student profiles.
 * Preserves unrelated application metadata fields.
 */
export async function syncStudentAppMetadata(
  userId: string,
  data: {
    collegeId: string | null;
    collegeSlug: string | null;
    membershipId: string | null;
    studentId: string | null;
  }
): Promise<boolean> {
  if (!isUuid(userId)) {
    console.warn('[sync-app-metadata] rejected: invalid_user_id');
    return false;
  }
  const admin = createAdminClient();

  if (data.studentId && isUuid(data.studentId)) {
    const { data: stRow } = await admin
      .from('students')
      .select('id, user_id')
      .eq('id', data.studentId)
      .maybeSingle();
    if (!stRow || stRow.user_id !== userId) {
      console.warn('[sync-app-metadata] rejected: student_ownership_mismatch');
      return false;
    }
  }

  const { data: userData, error: getUserErr } = await admin.auth.admin.getUserById(userId);
  if (getUserErr || !userData?.user) {
    console.error('[sync-app-metadata] failed_fetch_user');
    return false;
  }

  const existingAppMeta = userData.user.app_metadata || {};
  const newAppMeta = {
    ...existingAppMeta,
    college_role: 'student',
    college_id: data.collegeId && isUuid(data.collegeId) ? data.collegeId : null,
    college_slug: typeof data.collegeSlug === 'string' ? data.collegeSlug.trim() : null,
    membership_id: data.membershipId && isUuid(data.membershipId) ? data.membershipId : null,
    student_id: data.studentId && isUuid(data.studentId) ? data.studentId : null,
  };

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: newAppMeta,
  });

  if (updateErr) {
    console.error('[sync-app-metadata] failed_update_app_metadata');
    return false;
  }

  console.info('[sync-app-metadata] profile-sync-completed');
  return true;
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createClient();

    // 1. Require Authenticated Supabase User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Resolve Student ID
    const admin = createAdminClient();
    const { data: student, error: studentError } = await admin
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // 3. Mark Connection as Revoked
    const { error: updateError } = await admin
      .from('student_platform_connections')
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', student.id)
      .eq('platform', 'github');

    if (updateError) {
      console.error('[github/disconnect] Failed to revoke connection:', updateError);
      return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 });
    }

    // 4. Purge cached daily activities & sync state for GitHub
    await admin
      .from('student_platform_daily_activities')
      .delete()
      .eq('student_id', student.id)
      .eq('platform', 'github');

    await admin
      .from('student_platform_year_sync_state')
      .delete()
      .eq('student_id', student.id)
      .eq('platform', 'github');

    await admin
      .from('student_platform_metadata')
      .delete()
      .eq('student_id', student.id)
      .eq('platform', 'github');

    // 5. Clear github_url on student record for consistency
    await admin
      .from('students')
      .update({
        github_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id);

    return NextResponse.json({ success: true, message: 'GitHub account disconnected successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : err;
    console.error('[github/disconnect] Error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

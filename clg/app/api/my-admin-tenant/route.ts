import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { getSession } from '@/lib/auth/session';

export async function GET(request: Request) {
  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({
    key: `my-admin-tenant:${ip}`,
    limit: 80,
    windowMs: 60 * 1000,
  });

  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please retry later.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  try {
    const { session } = await getSession();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const supabase = await createClient();

    const { data: membership } = await supabase
      .from('college_memberships')
      .select('college_id')
      .eq('user_id', session.user.id)
      .in('role', ['college_admin', 'faculty_spoc'])
      .in('status', ['active', 'invited'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ ok: false, error: 'No admin tenant found.' }, { status: 403 });
    }

    const { data: college } = await supabase
      .from('colleges')
      .select('slug')
      .eq('id', membership.college_id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!college) {
      return NextResponse.json({ ok: false, error: 'No active tenant found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, slug: college.slug });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

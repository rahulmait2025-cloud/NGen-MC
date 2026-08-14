import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/tenant/get-tenant';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { logAuthEvent } from '@/lib/auth/auth-logger';
import { ensureDirectLearnerStudent, getDirectLearnerTenant } from '@/lib/services/direct-learners';

export async function GET(request: Request) {
  try {
    const headerStore = await headers();
    const xCollegeSlug = headerStore.get('x-route-college-slug');
    if (xCollegeSlug) {
      return NextResponse.json({ ok: true, slug: xCollegeSlug });
    }
  } catch {
    // Ignore and fall through
  }

  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({
    key: `my-student-tenant:${ip}`,
    limit: 80,
    windowMs: 60 * 1000,
  });

  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    logAuthEvent({ type: 'api_unauthenticated', ip, metadata: { endpoint: '/api/my-student-tenant' } });
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.isActive) {
    logAuthEvent({ type: 'api_inactive_user', userId: user.id, metadata: { endpoint: '/api/my-student-tenant' } });
    return NextResponse.json({ ok: false, error: 'Account is inactive' }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from('college_memberships')
    .select('college_id')
    .eq('user_id', user.id)
    .eq('role', 'student')
    .in('status', ['active', 'invited'])
    .order('created_at', { ascending: true })
    .limit(20);

  if (!memberships?.length) {
    try {
      const tenant = await ensureDirectLearnerStudent(user.id);
      logAuthEvent({
        type: 'student_b2c_bootstrap',
        userId: user.id,
        ip,
        metadata: { endpoint: '/api/my-student-tenant', slug: tenant.slug },
      });
      return NextResponse.json({ ok: true, slug: tenant.slug });
  } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logAuthEvent({
        type: 'student_b2c_bootstrap_failed',
        userId: user.id,
        ip,
        metadata: { endpoint: '/api/my-student-tenant', message: msg },
      });
      return NextResponse.json(
        { ok: false, error: msg === 'not_authorized' ? 'Not authorized for student access.' : 'No student membership' },
        { status: 403 }
      );
    }
  }

  const directLearnerTenant = await getDirectLearnerTenant().catch(() => null);
  const preferredMembership =
    (directLearnerTenant
      ? memberships.find((membership) => membership.college_id === directLearnerTenant.collegeId)
      : null) ?? memberships[0];

  const { data: college } = await supabase
    .from('colleges')
    .select('slug')
    .eq('id', preferredMembership.college_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!college?.slug) {
    return NextResponse.json({ ok: false, error: 'No active college' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, slug: college.slug });
}

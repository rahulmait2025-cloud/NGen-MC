import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOptionalStudentRuntime } from '@/lib/student-runtime/runtime';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { logAuthEvent } from '@/lib/auth/auth-logger';

const querySchema = z.object({
  slug: z.string().trim().min(1, 'Slug is required.'),
});

/**
 * Called after sign-in to verify the user has student access for this college.
 * Only credentials created by SuperAdmin (invite student) have this membership.
 */
export async function GET(request: Request) {
  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({
    key: `check-student-access:${ip}`,
    limit: 120,
    windowMs: 60 * 1000,
    failClosed: true,
  });

  if (!limited.ok) {
    return NextResponse.json(
      { allowed: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ slug: searchParams.get('slug') ?? '' });
  if (!parsed.success) {
    return NextResponse.json({ allowed: false, error: 'Invalid slug.' }, { status: 400 });
  }

  const slug = parsed.data.slug;
  const runtime = await getOptionalStudentRuntime(slug, { freshness: 'fresh', fallbackOnIncomplete: true });
  const allowed = runtime != null && runtime.student.studentId !== '';

  if (!allowed) {
    logAuthEvent({ 
      type: 'api_wrong_role', 
      userId: runtime?.identity.userId,
      tenantSlug: slug, 
      role: runtime ? 'student' : 'none',
      metadata: { endpoint: '/api/check-student-access' }
    });
  }

  return NextResponse.json({ allowed });
}

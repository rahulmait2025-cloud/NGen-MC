import { NextResponse } from 'next/server';
import { z } from 'zod';
import { completeStudentInviteAcceptance } from '@/lib/services/complete-student-invite';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { hashStudentInviteToken } from '@/lib/services/student-invite-crypto';

const bodySchema = z.object({
  token: z.string().min(10, 'Invalid token.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 }
    );
  }

  const tokenHashPrefix = hashStudentInviteToken(parsed.data.token.trim()).slice(0, 12);
  const limited = await consumeRateLimit({
    key: `invite-accept:${tokenHashPrefix}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many attempts. Retry in ${limited.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  const result = await completeStudentInviteAcceptance({
    plainToken: parsed.data.token,
    password: parsed.data.password,
  });

  if (!result.ok) {
    const isValidation =
      result.error.startsWith('Password') ||
      result.error.startsWith('Invalid') ||
      result.error.startsWith('This invite') ||
      result.error.startsWith('You already') ||
      result.error.startsWith('An account') ||
      result.error.startsWith('Account relationship');
    return NextResponse.json({ ok: false, error: result.error }, { status: isValidation ? 400 : 500 });
  }

  return NextResponse.json({ ok: true, redirectUrl: result.redirectUrl });
}

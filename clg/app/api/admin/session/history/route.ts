import { NextResponse } from 'next/server';
import { getAdminSessionHistory } from '@/lib/auth/admin-session';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const { session } = await getSession();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const sessions = await getAdminSessionHistory(50);
    return NextResponse.json({ ok: true, sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

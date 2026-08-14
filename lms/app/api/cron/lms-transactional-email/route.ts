import { NextRequest, NextResponse } from 'next/server';
import { processLmsEmailOutboxBatch } from '@/lib/lms/transactional-email/processor';

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const header = request.headers.get('x-cron-secret');
    if (header === cronSecret) return true;
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ') && auth.slice(7).trim() === cronSecret) return true;
  }

  const internal = process.env.NEXTGEN_INTERNAL_SECRET?.trim();
  if (internal && request.headers.get('x-nextgen-internal-secret') === internal) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processLmsEmailOutboxBatch({ limit: 25, lockBy: 'vercel-cron' });

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    sent: result.sent,
    failed: result.failed,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}

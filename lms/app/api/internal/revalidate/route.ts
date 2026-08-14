import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * Cross-app cache invalidation for shared platform settings written from SuperAdmin.
 * Auth: Bearer INTERNAL_API_SECRET
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let tags: string[] = ['platform-settings'];
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body.tags) && body.tags.every((t) => typeof t === 'string')) {
      tags = body.tags as string[];
    }
  } catch {
    // keep defaults
  }

  for (const tag of tags) {
    revalidateTag(tag, 'max');
  }

  return NextResponse.json({ ok: true, tags });
}

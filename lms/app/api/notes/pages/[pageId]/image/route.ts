import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStudentRuntime } from '@/lib/student-runtime/runtime';
import { StudentRuntimeError } from '@/lib/student-runtime/errors';
import { resolveStudentNoteAccessCached } from '@/lib/services/student-note-access';

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

/**
 * Secure note page image delivery.
 *
 * Sequence:
 * 1. Extract trusted college route context
 * 2. Require Student Runtime (claims fast-path, with authoritative DB fallback —
 *    matches the auth used by the notes module page so a stale/incomplete claim
 *    doesn't 401 an otherwise-entitled student)
 * 3. Validate page ID & resolve note page → module → collection from DB row
 * 4. Check cached student access to that collection
 * 5. Resolve storage path server-side and validate against path traversal
 * 6. Stream private resource with response security headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;

  // 1. Extract trusted college route context
  const collegeSlug = request.nextUrl.searchParams.get('collegeSlug');
  if (!collegeSlug) {
    return NextResponse.json({ error: 'Missing collegeSlug parameter' }, { status: 400 });
  }

  // 2. Require Student Runtime (same auth path as the notes module page: claims
  //    fast-path with a cached authoritative DB fallback for incomplete/stale claims)
  let runtime;
  try {
    runtime = await requireStudentRuntime(collegeSlug, { freshness: 'cached' });
  } catch (err) {
    if (err instanceof StudentRuntimeError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createAdminClient();

  // 3. Resolve note page → module → collection from DB
  const { data: page, error: pageError } = await sb
    .from('note_pages')
    .select('id, image_path, image_mime, note_module_id, note_modules(id, note_collection_id)')
    .eq('id', pageId)
    .maybeSingle();

  if (pageError || !page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const noteModules = page.note_modules as
    | { note_collection_id: string }
    | { note_collection_id: string }[]
    | null;
  const noteCollectionId = Array.isArray(noteModules)
    ? noteModules[0]?.note_collection_id
    : noteModules?.note_collection_id;
  if (!noteCollectionId) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  // 4. Check cached note access for student + tenant + collection
  const access = await resolveStudentNoteAccessCached({
    studentId: runtime.student.studentId,
    collegeId: runtime.tenant.collegeId,
    isGlobal: runtime.tenant.isGlobal,
    collectionId: noteCollectionId,
  });

  if (!access.hasAccess) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'private-resource-ownership-denied',
        pageId: safeId(pageId),
      });
    }
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // 5. Server-owned path validation
  const rawPath = page.image_path;
  if (!rawPath || rawPath.includes('..') || rawPath.startsWith('/') || rawPath.includes('\\')) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'private-resource-path-mismatch',
        pageId: safeId(pageId),
      });
    }
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  // 6. Download or stream private object
  const { data: fileData, error: downloadError } = await sb.storage
    .from('note-pages')
    .download(rawPath);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const contentType = page.image_mime || 'image/jpeg';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

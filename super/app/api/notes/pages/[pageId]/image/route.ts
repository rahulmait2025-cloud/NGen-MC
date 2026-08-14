import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Stream note page images from storage.
 * Uses admin client to download from the private 'note-pages' bucket
 * and streams the bytes to the client.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;

  if (!pageId) {
    return NextResponse.json({ error: 'pageId required' }, { status: 400 });
  }

  try {
    const sb = createAdminClient();

    // Look up the page to get the storage path
    const { data: page, error: pageError } = await sb
      .from('note_pages')
      .select('image_path, image_mime')
      .eq('id', pageId)
      .maybeSingle();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const storagePath = page.image_path as string;
    const mimeType = (page.image_mime as string) || 'image/jpeg';

    // Download file bytes from storage
    const { data: fileData, error: downloadError } = await sb.storage
      .from('note-pages')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('[NoteImageAPI] Download failed:', downloadError?.message, 'path:', storagePath);
      return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
    }

    // Convert Blob to ArrayBuffer then to Uint8Array
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[NoteImageAPI] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

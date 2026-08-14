import { NextResponse } from 'next/server';
import { verifyWebhookSecret } from '@/lib/tpstreams/webhooks';
import { createAdminClient } from '@/lib/supabase/admin';
import { upsertLessonItemForVideoAsset } from '@/lib/services/master-course-structure';

export async function POST(req: Request) {
  try {
    const headerToken = req.headers.get('x-streams-token');
    const secretToken = process.env.TPSTREAMS_WEBHOOK_SECRET;

    // 1. Authenticate Request
    if (!secretToken) {
      console.error('[TPStreams Webhook] Missing TPSTREAMS_WEBHOOK_SECRET env var.');
      return new Response('Configuration Error', { status: 500 });
    }

    const isValid = verifyWebhookSecret(headerToken, secretToken);
    if (!isValid) {
      console.warn('[TPStreams Webhook] Unauthorized attempt with key:', headerToken);
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parse Payload
    const payload = await req.json();
    console.log('[TPStreams Webhook] Received event:', JSON.stringify(payload, null, 2));

    // Determine event type from payload structure
    // Video events have payload.video
    // Folder events have payload.folder
    // Generic asset events have payload.asset
    
    const video = payload.video;
    const folder = payload.folder;
    const asset = payload.asset || video || folder;
    
    if (!asset || !asset.id) {
      return NextResponse.json({ success: true, message: 'No actionable data in payload' });
    }

    const sb = createAdminClient();

    // 3. Handle Different Event Types
    
    // ─── Video Events ───────────────────────────────────────────────
    if (video && video.id) {
      return await handleVideoEvent(sb, video);
    }

    // ─── Folder Events (Phase X Part 2) ─────────────────────────────
    // Folder creation events don't require local DB updates since folders
    // are only created via Master Course creation. We log for visibility.
    if (folder && folder.id) {
      console.log(
        '[TPStreams Webhook] Folder event received:',
        folder.id,
        folder.title ?? 'Untitled',
      );
      // No local action needed — folders are created only via Master Course creation
      return NextResponse.json({
        success: true,
        message: 'Folder event logged (no local action required)',
      });
    }

    // ─── Generic Asset Events (Phase X Part 2) ──────────────────────
    // For other asset types (livestreams, etc.), we just log for now.
    // Future: expand to handle more asset types.
    console.log(
      '[TPStreams Webhook] Generic asset event received:',
      asset.id,
      asset.type ?? 'unknown',
    );

    return NextResponse.json({ success: true, message: 'Asset event logged' });
  } catch (error) {
    console.error('[TPStreams Webhook] Global error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle video status update events from TPStreams.
 */
async function handleVideoEvent(
  sb: ReturnType<typeof createAdminClient>,
  video: Record<string, unknown>,
): Promise<Response> {
  const tpAssetId = video.id as string;
  // Map TPStreams status to our VideoAssetProcessingStatus enum
  // TPStreams status values: 'Completed', 'Processing', 'Queued', 'Error'
  const tpStatus = (video.status as string) || 'pending';
  const statusMap: Record<string, string> = {
    'Completed': 'completed',
    'Processing': 'processing',
    'Queued': 'queued',
    'Error': 'error'
  };
  const processingStatus = statusMap[tpStatus] || 'pending';

  // Find the asset in our database by TP Asset ID
  const { data: asset, error: fetchError } = await sb
    .from('video_assets')
    .select('id, master_course_id')
    .eq('tp_asset_id', tpAssetId)
    .maybeSingle();

  if (fetchError) {
    console.error('[TPStreams Webhook] Database fetch error:', fetchError);
    return new Response('Database Error', { status: 500 });
  }

  if (!asset) {
    console.warn('[TPStreams Webhook] Received event for unknown TP Asset ID:', tpAssetId);
    return NextResponse.json({ success: true, message: 'Asset not tracked in our DB' });
  }

  // Update Asset Status and Metadata
  const updatePayload: Record<string, unknown> = {
    processing_status: processingStatus,
    updated_at: new Date().toISOString()
  };

  // If completed, update duration and thumbnail
  if (tpStatus === 'Completed' && video.duration) {
    updatePayload.duration_seconds = Math.round(video.duration as number);
    if (video.thumbnails && Array.isArray(video.thumbnails) && video.thumbnails.length > 0) {
      updatePayload.thumbnail_url = (video.thumbnails as string[])[0];
    }
  }

  const { error: updateError } = await sb
    .from('video_assets')
    .update(updatePayload)
    .eq('id', asset.id);

  if (updateError) {
    console.error('[TPStreams Webhook] Update failed:', updateError);
    return new Response('Update Failed', { status: 500 });
  }

  console.log(
    '[TPStreams Webhook] Updated video asset',
    asset.id,
    'status:',
    processingStatus,
  );

  if (processingStatus === 'completed' && asset.master_course_id) {
    try {
      const { item, created } = await upsertLessonItemForVideoAsset(asset.id);
      if (created && item) {
        console.log('[TPStreams Webhook] Created lesson item', item.id, 'for video asset', asset.id);
      }
    } catch (syncError) {
      console.error('[TPStreams Webhook] Lesson item creation failed:', syncError);
    }
  }

  return NextResponse.json({ success: true });
}

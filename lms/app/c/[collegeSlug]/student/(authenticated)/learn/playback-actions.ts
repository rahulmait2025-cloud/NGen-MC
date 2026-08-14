'use server';

/**
 * Server actions for TPStreams playback.
 * Ensures tokens are generated securely server-side after entitlement checks.
 *
 * This action is now fully delegated to the issueStudentPlaybackGrant orchestration service.
 */

import { issueStudentPlaybackGrant } from '@/lib/tpstreams/student-playback-grant';
import type { PlaybackTokenResult } from '@/types/student-runtime';

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

/**
 * Validates access and generates a standard playback token.
 *
 * @param collegeSlug  The current college slug
 * @param assetId      Internal video_assets.id (UUID)
 * @param options      Optional variantId and courseId overrides
 */
export async function getPlaybackTokenAction(
  collegeSlug: string,
  assetId: string,
  options?: { variantId?: string | null; courseId?: string },
): Promise<{ success: boolean; data?: PlaybackTokenResult; error?: string }> {
  if (isDebug) {
    console.info('[request-audit]', {
      area: 'playback-action',
      action: 'getPlaybackTokenAction',
      assetId: safeId(assetId),
      collegeSlug: safeId(collegeSlug),
    });
  }
  try {
    const grant = await issueStudentPlaybackGrant(collegeSlug, assetId, {
      variantId: options?.variantId,
    });

    return {
      success: true,
      data: grant,
    };
  } catch (error) {
    console.error('[PlaybackAction] error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate playback token.';
    if (message.includes('TP_STREAMS') || message.includes('ORGANISATION_ID')) {
      return {
        success: false,
        error:
          'Video playback is not configured. Please contact your administrator.',
      };
    }
    if (message.includes('TPStreams API error')) {
      return {
        success: false,
        error: 'Video playback service rejected the request. Please try again.',
      };
    }
    return { success: false, error: message || 'Failed to generate playback token. Please try again.' };
  }
}

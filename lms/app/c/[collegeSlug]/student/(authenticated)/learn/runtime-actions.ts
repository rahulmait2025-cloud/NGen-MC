'use server';

/**
 * Combined runtime action for the active lesson.
 *
 * Merges getPlaybackTokenAction + getResumePositionAction into a single
 * server action so the course player makes one call instead of two for the
 * current active lesson. Resolves auth once, then runs token generation
 * and resume position fetch in parallel.
 *
 * SECURITY: Preserves all existing checks — auth, entitlement, variant scope,
 * video asset validation, and TPStreams token security.
 */

import { requireAuth } from '@/lib/auth/require-student-action';
import { resolveAccessibleVideoAssetCached } from '@/lib/services/course-access-manager';
import { assertItemInVariantLearnScope } from '@/lib/services/variant-learn-scope';
import { generatePlaybackAccessToken } from '@/lib/tpstreams/playback';
import { getResumeTimestamp } from '@/lib/services/student-progress';
import { generatePlaybackToken } from '@/lib/security/playback-token';
import type { PlaybackTokenResult } from '@/types/student-runtime';

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

export type LessonRuntimeResult = {
  ok: boolean;
  playback?: PlaybackTokenResult;
  resume?: number;
  error?: string;
};

/**
 * Unified runtime action for the current active lesson.
 *
 * Returns both the TPStreams playback token and the resume position in a
 * single call. Auth is resolved once; entitlement/variant checks are
 * performed once; token generation and resume DB lookup run in parallel.
 *
 * @param collegeSlug  Current college slug
 * @param assetId      Internal video_assets.id (UUID)
 * @param courseId      Current course ID
 * @param itemId       Current lesson/item ID
 * @param variantId    Optional variant ID for variant-scoped access
 */
export async function getLessonRuntimeAction(
  collegeSlug: string,
  assetId: string,
  courseId: string,
  itemId: string,
  variantId?: string | null,
): Promise<LessonRuntimeResult> {
  if (isDebug) {
    console.info('[request-audit]', {
      area: 'lesson-runtime',
      action: 'getLessonRuntimeAction',
      assetId: safeId(assetId),
      courseId: safeId(courseId),
      itemId: safeId(itemId),
      collegeSlug: safeId(collegeSlug),
    });
  }

  try {
    // ── 1. Resolve auth once ──────────────────────────────────────────────
    const auth = await requireAuth(collegeSlug);
    if (!auth) {
      return { ok: false, error: 'Unauthorized' };
    }

    const isGlobal = auth.isGlobal;
    const collegeId = auth.collegeId;
    const studentId = auth.studentId;

    // ── 2. Validate access + resolve video asset (cached 60s) ─────────────
    // This validates course entitlement internally via resolveAccessibleLesson.
    const access = await resolveAccessibleVideoAssetCached(
      studentId,
      assetId,
      { isGlobal, collegeId },
      itemId,
    );
    if (!access) {
      return {
        ok: false,
        error: 'Unauthorized: No active entitlement found for this course.',
      };
    }

    // ── 3. Variant scope check (if applicable) ───────────────────────────
    const scopedVariantId = variantId?.trim() || null;
    if (scopedVariantId) {
      const inScope = await assertItemInVariantLearnScope(
        scopedVariantId,
        courseId,
        access.item.id,
        collegeId,
      );
      if (!inScope) {
        return {
          ok: false,
          error:
            'Unauthorized: This lesson is not included in the selected course variant.',
        };
      }
    }

    // ── 4. Validate video asset has TPStreams ID ──────────────────────────
    if (!access.asset?.tp_asset_id) {
      return {
        ok: false,
        error:
          'Video asset not found or not registered with TPStreams.',
      };
    }

    // ── 5. Run token generation + resume fetch in parallel ────────────────
    // Both use the already-resolved auth context — no duplicate auth calls.
    const context = { isGlobal, collegeId };

    const [token, resumeSeconds] = await Promise.all([
      generatePlaybackAccessToken(access.asset.tp_asset_id, {
        name: auth.user.fullName || 'Student',
        email: auth.user.email || undefined,
      }),
      getResumeTimestamp(studentId, courseId, access.item.id, context),
    ]);

    if (process.env.TPSTREAMS_DEBUG === '1') {
      const redacted = token.embedUrl.replace(
        /([?&])access_token=[^&]*/,
        '$1access_token=<redacted>',
      );
      console.debug('[LessonRuntime] embed URL (TPSTREAMS_DEBUG):', redacted);
    }

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'lesson-runtime',
        action: 'getLessonRuntimeAction:success',
        itemId: safeId(itemId),
        hasToken: true,
        resumeSeconds,
      });
    }

    const validationToken = generatePlaybackToken({
      studentId,
      courseId,
      moduleId: access.item.module_id,
      lessonId: access.item.id,
      videoAssetId: assetId,
      tpAssetId: access.asset.tp_asset_id,
    });

    return {
      ok: true,
      playback: {
        ...token,
        videoAssetId: assetId,
        contentProtectionType: access.asset?.content_protection_type ?? null,
        playbackToken: validationToken,
      },
      resume: resumeSeconds,
    };
  } catch (error) {
    console.error('[LessonRuntime] error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load lesson runtime.';

    if (message.includes('TP_STREAMS') || message.includes('ORGANISATION_ID')) {
      return {
        ok: false,
        error:
          'Video playback is not configured. Please contact your administrator.',
      };
    }
    if (message.includes('TPStreams API error')) {
      return {
        ok: false,
        error:
          'Video playback service rejected the request. Please try again.',
      };
    }
    return {
      ok: false,
      error: 'Failed to load lesson runtime. Please try again.',
    };
  }
}

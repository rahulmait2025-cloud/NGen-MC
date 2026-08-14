'use server';

/**
 * Combined lesson context action — single server round-trip for all lesson data.
 *
 * Auth is resolved ONCE from proxy headers (no DB call).
 * Course entitlement is validated ONCE.
 * Token + resume + engagement + resources run in parallel.
 */

import { requireAuth } from '@/lib/auth/require-student-action';
import { validateStudentCourseAccess } from '@/lib/services/course-access-manager';
import { assertItemInVariantLearnScope } from '@/lib/services/variant-learn-scope';
import { getResumeTimestamp } from '@/lib/services/student-progress';
import { createAdminClient } from '@/lib/supabase/admin';
import { issueStudentPlaybackGrant } from '@/lib/tpstreams/student-playback-grant';
import type { PlaybackTokenResult } from '@/types/student-runtime';
import type { CourseResourceSummary } from '@/types/database';

export type LessonContextResult = {
  ok: true;
  playback: PlaybackTokenResult | null;
  playbackToken?: string;
  resume: number;
  resources: CourseResourceSummary[];
} | {
  ok: false;
  error: string;
};

/**
 * Single server action that returns everything the player needs for a lesson.
 *
 * Auth is resolved ONCE from proxy headers (no DB call).
 * Course entitlement is validated ONCE.
 * Token + resume + engagement + resources run in parallel.
 *
 * @param collegeSlug  Current college slug
 * @param courseId     Course UUID
 * @param itemId       Lesson/item UUID
 * @param videoAssetId Internal video_assets.id (UUID) — null for non-video items
 * @param variantId    Optional variant ID for variant-scoped access
 */
export async function getLessonContextAction(
  collegeSlug: string,
  courseId: string,
  itemId: string,
  videoAssetId: string | null,
  variantId?: string | null,
): Promise<LessonContextResult> {
  try {
    // ── 1. Resolve auth ONCE ───────────────────────────────────────────────
    // In the happy path, this reads from proxy headers — NO DB call.
    const auth = await requireAuth(collegeSlug);
    if (!auth) {
      return { ok: false, error: 'Unauthorized' };
    }

    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(
      auth.tenant.slug.toLowerCase(),
    );
    const collegeId = isGlobal ? null : auth.tenant.id;
    const studentId = auth.studentId;

    const context = { isGlobal, collegeId };

    // ── 2. Validate course access ONCE ─────────────────────────────────────
    // Standard robust entitlement check (B2B, B2C, assignments, bootcamps).
    const courseAccess = await validateStudentCourseAccess(studentId, courseId, context);
    if (!courseAccess) {
      return { ok: false, error: 'Course access denied or expired.' };
    }

    // ── 3. Variant scope check (if applicable) ─────────────────────────────
    const scopedVariantId = variantId?.trim() || null;
    if (scopedVariantId) {
      const inScope = await assertItemInVariantLearnScope(
        scopedVariantId,
        courseId,
        itemId,
        collegeId,
      );
      if (!inScope) {
        return { ok: false, error: 'Lesson not in variant scope.' };
      }
    }

    // ── 4. Run ALL data fetches in parallel ────────────────────────────────
    // - Video: token generation + resume position (only if videoAssetId)
    // - Resources: lesson attachments
    const sb = createAdminClient();

    type VideoResult = { playback: PlaybackTokenResult | null; resume: number };

    const videoPromise: Promise<VideoResult> = videoAssetId
      ? (async () => {
          // Delegate playback grant issuance to the single server-authoritative service
          const grant = await issueStudentPlaybackGrant(collegeSlug, videoAssetId, {
            courseId,
            lessonId: itemId,
            variantId: scopedVariantId,
          });

          const resumeSeconds = await getResumeTimestamp(studentId, courseId, itemId, context);

          return {
            playback: grant,
            resume: resumeSeconds,
          };
        })()
      : Promise.resolve({ playback: null, resume: 0 });

    const resourcesPromise = sb
      .from('course_resources')
      .select('id, resource_type, title, description')
      .eq('master_course_id', courseId)
      .eq('parent_item_id', itemId)
      .eq('resource_scope', 'lesson_attachment')
      .eq('publish_status', 'published')
      .eq('visible_to_students', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) =>
        (data ?? []).map((r) => ({
          id: r.id as string,
          resource_type: r.resource_type as CourseResourceSummary['resource_type'],
          title: r.title as string,
          description: r.description as string | null,
        })),
      );

    // ── 5. Await all in parallel ───────────────────────────────────────────
    const [video, resources] = await Promise.all([
      videoPromise,
      resourcesPromise,
    ]);

    const validationToken = video.playback?.playbackToken;

    return {
      ok: true,
      playback: video.playback,
      playbackToken: validationToken,
      resume: video.resume,
      resources,
    };
  } catch (error) {
    console.error('[LessonContextAction] error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load lesson context.';

    if (message.includes('TP_STREAMS') || message.includes('ORGANISATION_ID')) {
      return {
        ok: false,
        error: 'Video playback is not configured. Please contact your administrator.',
      };
    }
    return { ok: false, error: message || 'Failed to load lesson context. Please try again.' };
  }
}

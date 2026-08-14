'use server';

/**
 * Server actions to safely track video watch progress and end sessions.
 *
 * PERFORMANCE: getResumePositionAction no longer re-validates course entitlement.
 * The server component (lessons/[itemId]/page.tsx) already validates access via
 * validatePlayerCourseAccess before rendering. The resume position is read-only
 * and does not modify state, so re-validating entitlement on every request is
 * unnecessary overhead. Auth check (requireAuth) is sufficient for authorization.
 */

import { requireAuth } from '@/lib/auth/require-student-action';
import { endSession, startSession, getResumeTimestamp, markLessonCompletedManually } from '@/lib/services/student-progress';
import { assertItemInVariantLearnScope } from '@/lib/services/variant-learn-scope';
import { resolveAccessibleLesson } from '@/lib/services/course-access-manager';

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

async function _startSessionAction(
  collegeSlug: string,
  videoAssetId: string,
  itemId?: string,
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { success: false, sessionId: undefined, error: 'Unauthorized' };
    const isGlobal = auth.isGlobal;
    const sessionId = await startSession(
      auth.studentId,
      videoAssetId,
      { isGlobal, collegeId: auth.collegeId },
      itemId,
    );
    return { success: true, sessionId };
  } catch (error) {
    console.error('[ProgressAction] startSession error:', error);
    return { success: false, error: 'Failed to start video session.' };
  }
}

export async function syncProgressAction(
  collegeSlug: string,
  courseId: string,
  itemId: string,
  lastPositionSeconds: number,
  watchedSeconds: number,
  totalSeconds: number,
  entitlementId?: string,
  variantId?: string | null,
): Promise<{ success: boolean; completed?: boolean; error?: string }> {
  if (isDebug) {
    console.info('[request-audit]', {
      area: 'progress-action',
      action: 'syncProgressAction',
      courseId: safeId(courseId),
      itemId: safeId(itemId),
    });
  }
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    const isGlobal = auth.isGlobal;
    const collegeId = auth.collegeId;
    const studentId = auth.studentId;

    const scopedVariantId = variantId?.trim() || null;
    if (scopedVariantId) {
      const inScope = await assertItemInVariantLearnScope(
        scopedVariantId,
        courseId,
        itemId,
        collegeId,
      );
      if (!inScope) {
        return { success: false, error: 'Unauthorized: Lesson not in variant scope.' };
      }
    }

    // Resolve lesson access once (this internally validates course access and checks item/hierarchy visibility)
    const access = await resolveAccessibleLesson(
      studentId,
      courseId,
      itemId,
      { isGlobal, collegeId },
    );
    if (!access) {
      return { success: false, error: 'Course access has expired or is not available.' };
    }

    const result = await markLessonCompletedManually({
      studentId,
      itemId,
      courseId,
      context: { isGlobal, collegeId },
      preResolvedAccess: access,
    });

    return { success: true, completed: result.completed };
  } catch (error) {
    console.error('[ProgressAction] error:', error);
    return { success: false, error: 'Failed to sync progress.' };
  }
}

async function _endSessionAction(
  collegeSlug: string,
  sessionId: string,
  watchedDurationSeconds: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    await endSession(auth.studentId, sessionId, watchedDurationSeconds);
    return { success: true };
  } catch (error) {
    console.error('[ProgressAction] error:', error);
    return { success: false, error: 'Failed to end session.' };
  }
}

/**
 * Get resume position for a lesson.
 *
 * PERFORMANCE: Skips entitlement re-validation. The server component already
 * validated access before rendering. This is a read-only query — auth is
 * sufficient. Saves ~4-8 DB queries per call.
 */
export async function getResumePositionAction(
  collegeSlug: string,
  courseId: string,
  itemId: string,
): Promise<{ success: boolean; positionSeconds?: number; error?: string }> {
  if (isDebug) {
    console.info('[request-audit]', {
      area: 'progress-action',
      action: 'getResumePositionAction',
      courseId: safeId(courseId),
      itemId: safeId(itemId),
    });
  }
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    const isGlobal = auth.isGlobal;

    const positionSeconds = await getResumeTimestamp(
      auth.studentId,
      courseId,
      itemId,
      { isGlobal, collegeId: auth.collegeId },
    );
    return { success: true, positionSeconds };
  } catch (error) {
    console.error('[ProgressAction] error:', error);
    return { success: false, error: 'Failed to get resume position.' };
  }
}

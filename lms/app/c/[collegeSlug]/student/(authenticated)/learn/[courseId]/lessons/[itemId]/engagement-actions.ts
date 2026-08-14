'use server';

/**
 * Server actions for student engagement (Phase 7B).
 * Handles notes and bookmarks.
 * All actions validate entitlement before performing write operations.
 *
 * Phase 1: Removed revalidatePath() calls. The parent client components
 * (LessonNotesCard, LessonBookmarksCard) manage their own local state
 * after successful saves. revalidatePath() was triggering full server-side
 * re-renders of the lesson page (middleware + layout + auth guard + course
 * resolution), adding ~10 DB calls per note/bookmark save.
 */

import { z } from 'zod';
import { requireAuth } from '@/lib/auth/require-student-action';
import { validateStudentCourseAccess } from '@/lib/services/course-access-manager';
import { 
  upsertLessonNote, 
  createLessonBookmark, 
  deleteLessonBookmark,
  getLessonNote,
  listLessonBookmarks
} from '@/lib/services/student-engagement';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const saveNoteSchema = z.object({
  collegeSlug: z.string(),
  courseId: z.uuid(),
  itemId: z.uuid(),
  body: z.string().max(10000, 'Note cannot exceed 10,000 characters'),
});

const createBookmarkSchema = z.object({
  collegeSlug: z.string(),
  courseId: z.uuid(),
  itemId: z.uuid(),
  timestampSeconds: z.number().nullable(),
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
});

const deleteBookmarkSchema = z.object({
  collegeSlug: z.string(),
  bookmarkId: z.uuid(),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function saveLessonNoteAction(formData: z.infer<typeof saveNoteSchema>) {
  try {
    const validated = saveNoteSchema.parse(formData);
    const auth = await requireAuth(validated.collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    const courseAccess = await validateStudentCourseAccess(
      auth.studentId,
      validated.courseId,
      { isGlobal, collegeId },
    );
    if (!courseAccess) {
      return { success: false, error: 'Course access has expired or is not available.' };
    }

    const result = await upsertLessonNote(
      auth.studentId,
      validated.courseId,
      validated.itemId,
      validated.body,
      isGlobal,
      collegeId,
    );

    return result;
  } catch (error) {
    console.error('[EngagementAction] saveLessonNoteAction error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save note' };
  }
}



export async function createBookmarkAction(formData: z.infer<typeof createBookmarkSchema>) {
  try {
    const validated = createBookmarkSchema.parse(formData);
    const auth = await requireAuth(validated.collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    const courseAccess = await validateStudentCourseAccess(
      auth.studentId,
      validated.courseId,
      { isGlobal, collegeId },
    );
    if (!courseAccess) {
      return { success: false, error: 'Course access has expired or is not available.' };
    }

    const result = await createLessonBookmark(
      auth.studentId,
      validated.courseId,
      validated.itemId,
      validated.timestampSeconds,
      validated.label,
      isGlobal,
      collegeId,
    );

    return result;
  } catch (error) {
    console.error('[EngagementAction] createBookmarkAction error:', error);
    return { success: false, error: 'Failed to create bookmark' };
  }
}

export async function deleteBookmarkAction(formData: z.infer<typeof deleteBookmarkSchema>, courseId: string, _itemId: string) {
  try {
    const validated = deleteBookmarkSchema.parse(formData);
    const auth = await requireAuth(validated.collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    const courseAccess = await validateStudentCourseAccess(
      auth.studentId,
      courseId,
      { isGlobal, collegeId },
    );
    if (!courseAccess) {
      return { success: false, error: 'Course access has expired or is not available.' };
    }

    const result = await deleteLessonBookmark(
      auth.studentId,
      validated.bookmarkId,
      isGlobal,
      collegeId,
    );

    return result;
  } catch (error) {
    console.error('[EngagementAction] deleteBookmarkAction error:', error);
    return { success: false, error: 'Failed to delete bookmark' };
  }
}

export async function getLessonEngagementAction(
  collegeSlug: string,
  courseId: string,
  itemId: string,
) {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    const courseAccess = await validateStudentCourseAccess(
      auth.studentId,
      courseId,
      { isGlobal, collegeId },
    );
    if (!courseAccess) {
      return { success: false, error: 'Course access has expired or is not available.' };
    }

    const [note, bookmarks] = await Promise.all([
      getLessonNote(auth.studentId, courseId, itemId, isGlobal, collegeId),
      listLessonBookmarks(auth.studentId, courseId, itemId, isGlobal, collegeId),
    ]);

    return { success: true, note, bookmarks };
  } catch (error) {
    console.error('[EngagementAction] getLessonEngagementAction error:', error);
    return { success: false, error: 'Failed to fetch engagement details' };
  }
}

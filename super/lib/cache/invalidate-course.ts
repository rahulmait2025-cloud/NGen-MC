import { revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

/**
 * Bump master_courses.updated_at so LMS structure caches keyed on that
 * revision miss and re-read curriculum from the shared DB.
 * SuperAdmin and LMS do not call each other over HTTP.
 */
async function touchCourseStructureRevision(courseId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('master_courses')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', courseId);

  if (error && isDebug) {
    console.warn('[revalidateCourseStructure] DB revision bump failed:', courseId, error.message);
  }
}

/**
 * Invalidate the course structure cache when course content changes.
 *
 * 1) Local SuperAdmin tag revalidate
 * 2) DB revision bump (LMS reads updated_at into its cache key)
 */
export async function revalidateCourseStructure(courseId: string): Promise<void> {
  await revalidateCourseStructures([courseId]);
}

/**
 * Invalidate course structure cache for multiple courses.
 * Dedupes IDs, ignores null/undefined.
 */
export async function revalidateCourseStructures(
  courseIds: Array<string | null | undefined>,
): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const uniqueIds = [...new Set(courseIds.filter((id): id is string => !!id?.trim()))];

  if (uniqueIds.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const id of uniqueIds) {
    try {
      revalidateTag(`course:${id}:structure`, 'max');
      succeeded++;
    } catch (err) {
      failed++;
      if (isDebug) {
        console.warn('[revalidateCourseStructure] tag failed:', id, err);
      }
    }
  }

  await Promise.allSettled(uniqueIds.map((id) => touchCourseStructureRevision(id)));

  if (isDebug) {
    console.info('[revalidateCourseStructure] done', {
      attempted: uniqueIds.length,
      succeeded,
      failed,
    });
  }

  return { attempted: uniqueIds.length, succeeded, failed };
}

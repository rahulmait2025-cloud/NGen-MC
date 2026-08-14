'use server';

/**
 * Course Resources Actions (Student-facing)
 *
 * Server actions for students to access course resources.
 * All actions validate entitlement before returning data.
 */

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { COURSE_RESOURCES_BUCKET } from '@/types/database';
import type { CourseResourceSummary } from '@/types/database';
import { validatePlayerCourseAccess } from '@/lib/services/course-access-manager';
import { requireAuth } from '@/lib/auth/require-student-action';

export async function getCachedResourceMetadata(resourceId: string) {
  return unstable_cache(
    async () => {
      const sb = createAdminClient();
      const { data: resource, error: fetchError } = await sb
        .from('course_resources')
        .select('id, storage_path, publish_status, visible_to_students, master_course_id')
        .eq('id', resourceId)
        .single();

      if (fetchError || !resource) {
        throw new Error('Resource not found');
      }

      return resource;
    },
    [`resource-metadata-${resourceId}`],
    {
      revalidate: 604800, // 7 days in seconds
      tags: ['resource-metadata', `resource-metadata-${resourceId}`],
    }
  )();
}

export async function getCachedMarkdownResourceContent(resourceId: string) {
  return unstable_cache(
    async () => {
      const sb = createAdminClient();
      const { data: resource, error: fetchError } = await sb
        .from('course_resources')
        .select('id, content_markdown, title, publish_status, visible_to_students, master_course_id, storage_path, storage_bucket')
        .eq('id', resourceId)
        .single();

      if (fetchError || !resource) {
        throw new Error('Resource not found');
      }

      let content = resource.content_markdown ?? '';
      if (!content.trim() && resource.storage_path) {
        const bucket = (resource.storage_bucket as string | null) ?? COURSE_RESOURCES_BUCKET;
        const { data: fileData, error: downloadError } = await sb.storage
          .from(bucket)
          .download(resource.storage_path);
        if (!downloadError && fileData) {
          content = await fileData.text();
        }
      }

      return {
        content,
        title: resource.title,
        publish_status: resource.publish_status,
        visible_to_students: resource.visible_to_students,
        master_course_id: resource.master_course_id,
      };
    },
    [`markdown-resource-${resourceId}`],
    {
      revalidate: 604800, // 7 days in seconds
      tags: ['markdown-resource', `markdown-resource-${resourceId}`],
    }
  )();
}

export async function getCachedCourseResourceMetadata(courseId: string, itemId: string) {
  return unstable_cache(
    async () => {
      const sb = createAdminClient();
      const { data, error } = await sb
        .from('course_resources')
        .select('id, resource_type, title, description')
        .eq('master_course_id', courseId)
        .eq('parent_item_id', itemId)
        .eq('resource_scope', 'lesson_attachment')
        .eq('publish_status', 'published')
        .eq('visible_to_students', true)
        .order('sort_order', { ascending: true });

      if (error || !data) return [];
      return data;
    },
    [`course-resources-metadata-${courseId}-${itemId}`],
    {
      revalidate: 604800, // 7 days in seconds
      tags: ['course-resources-metadata', `course-resources-metadata-${courseId}-${itemId}`],
    }
  )();
}

interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
}

/**
 * Get a signed URL for a PDF resource.
 * Validates: resource exists, is published, visible_to_students,
 * and student has active entitlement.
 */
export async function getPdfSignedUrlAction(
  collegeSlug: string,
  courseId: string,
  resourceId: string,
): Promise<SignedUrlResult> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;
    const studentId = auth.studentId;

    const access = await validatePlayerCourseAccess(studentId, courseId, {
      isGlobal,
      collegeId,
    }, { collegeSlug });

    if (!access.allowed) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[request-audit]', { action: 'private-resource-ownership-denied', resourceId: resourceId.slice(0, 8) + '...' });
      }
      return { success: false, error: 'Access denied' };
    }

    // 3. Fetch resource and validate
    const resource = await getCachedResourceMetadata(resourceId);

    if (resource.publish_status !== 'published') {
      return { success: false, error: 'Resource not available' };
    }

    if (!resource.visible_to_students) {
      return { success: false, error: 'Resource not visible' };
    }

    if (resource.master_course_id !== courseId) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[request-audit]', { action: 'private-resource-path-mismatch', resourceId: resourceId.slice(0, 8) + '...' });
      }
      return { success: false, error: 'Resource does not belong to this course' };
    }

    const rawPath = resource.storage_path;
    if (!rawPath || rawPath.includes('..') || rawPath.startsWith('/') || rawPath.includes('\\')) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[request-audit]', { action: 'private-resource-path-mismatch', resourceId: resourceId.slice(0, 8) + '...' });
      }
      return { success: false, error: 'Invalid resource file path' };
    }

    // 4. Generate signed URL (short bounded expiry: 15 minutes / 900 seconds)
    const sb = createAdminClient();
    const { data: urlData, error: urlError } = await sb.storage
      .from(COURSE_RESOURCES_BUCKET)
      .createSignedUrl(rawPath, 900);

    if (urlError || !urlData?.signedUrl) {
      return { success: false, error: 'Failed to generate signed URL' };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('[request-audit]', { action: 'private-resource-signed-url-issued', resourceId: resourceId.slice(0, 8) + '...' });
    }

    return { success: true, signedUrl: urlData.signedUrl };
  } catch (err) {
    console.error('[CourseResources] Error generating signed URL:', err);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Get markdown content for a resource.
 * Validates: resource exists, is published, visible_to_students,
 * and student has active entitlement.
 */
export async function getMarkdownContentAction(
  collegeSlug: string,
  courseId: string,
  resourceId: string,
): Promise<{ success: boolean; content?: string; title?: string; error?: string }> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { success: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;
    const studentId = auth.studentId;

    const access = await validatePlayerCourseAccess(studentId, courseId, {
      isGlobal,
      collegeId,
    }, { collegeSlug });

    if (!access.allowed) {
      return { success: false, error: 'Access denied' };
    }

    const resource = await getCachedMarkdownResourceContent(resourceId);

    if (resource.publish_status !== 'published' || !resource.visible_to_students) {
      return { success: false, error: 'Resource not available' };
    }

    if (resource.master_course_id !== courseId) {
      return { success: false, error: 'Resource does not belong to this course' };
    }

    return {
      success: true,
      content: resource.content,
      title: resource.title,
    };
  } catch (err) {
    console.error('[CourseResources] Error fetching markdown:', err);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * List resource metadata for a lesson (video item).
 * Returns only metadata (id, title, resource_type, description) — NOT content.
 * Validates entitlement before returning data.
 */
export async function listCourseResourceMetadata(
  collegeSlug: string,
  courseId: string,
  itemId: string,
): Promise<CourseResourceSummary[]> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return [];

    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    const access = await validatePlayerCourseAccess(auth.studentId, courseId, {
      isGlobal,
      collegeId,
    }, { collegeSlug });

    if (!access.allowed) return [];

    const data = await getCachedCourseResourceMetadata(courseId, itemId);

    return data.map((r) => ({
      id: r.id as string,
      resource_type: r.resource_type as CourseResourceSummary['resource_type'],
      title: r.title as string,
      description: r.description as string | null,
    }));
  } catch {
    return [];
  }
}

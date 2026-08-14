'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  getFreeCourseTpUploadConfigSchema,
  registerFreeCourseDirectTpUploadSchema,
} from '@/lib/validation/free-course';
import {
  ensureFreeCourseTpFolders,
  getFreeCourseModuleUploadConfig,
  registerFreeCourseDirectTpUpload,
  syncFreeCourseTpAssets,
} from '@/lib/free-courses/free-course-tpstreams';
import type { RegisterFreeCourseTpUploadResult } from '@/lib/free-courses/free-course-tpstreams';
import type { TpFolderSyncResult } from '@/lib/services/video-assets';
import { getTpUploaderTokenAction } from '@/app/(app)/master-courses/[courseId]/video-assets/actions';

type ActionResponse<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function revalidateFreeCourseTpPaths(courseId: string) {
  revalidatePath('/free-courses');
  revalidatePath(`/free-courses/${courseId}`);
  revalidatePath(`/free-courses/${courseId}/tpstreams-upload`);
}

export async function getFreeCourseTpUploaderTokenAction(courseId: string): Promise<{
  ok: boolean;
  authToken?: string;
  orgId?: string;
  error?: string;
}> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    await ensureFreeCourseTpFolders(courseId);
    const token = await getTpUploaderTokenAction();
    if (!token.ok) {
      return {
        ok: false,
        error: token.error ? `Uploader token: ${token.error}` : 'Uploader token: request failed',
      };
    }
    if (!token.authToken || !token.orgId) {
      return {
        ok: false,
        error: 'Uploader token: missing auth token or organization ID',
      };
    }
    return token;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to prepare TPStreams upload';
    return {
      ok: false,
      error: message.includes('TPStreams folder')
        ? message
        : `Folder provisioning: ${message}`,
    };
  }
}

export async function getFreeCourseModuleUploadConfigAction(
  courseId: string,
  moduleId: string,
): Promise<{
  ok: boolean;
  folderUuid?: string;
  moduleId?: string;
  courseId?: string;
  error?: string;
}> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  const parsed = getFreeCourseTpUploadConfigSchema.safeParse({ courseId, moduleId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const config = await getFreeCourseModuleUploadConfig(
      parsed.data.courseId,
      parsed.data.moduleId,
    );
    return { ok: true, ...config };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to get upload config',
    };
  }
}

export async function registerFreeCourseDirectTpUploadAction(
  input: unknown,
): Promise<ActionResponse<RegisterFreeCourseTpUploadResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  const parsed = registerFreeCourseDirectTpUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const result = await registerFreeCourseDirectTpUpload(parsed.data, authCheck.user.id);
    revalidateFreeCourseTpPaths(parsed.data.courseId);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to register upload',
    };
  }
}

export async function syncFreeCourseTpAssetsAction(
  courseId: string,
): Promise<ActionResponse<TpFolderSyncResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const result = await syncFreeCourseTpAssets(courseId);
    revalidateFreeCourseTpPaths(courseId);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to sync TPStreams assets',
    };
  }
}

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  createTeamMember,
  deleteTeamMember,
  removeTeamMemberPhoto,
  reorderTeamMembers,
  setTeamMemberPublished,
  updateTeamMember,
  uploadTeamMemberPhoto,
} from '@/lib/superadmin/team-members/mutations';
import { teamMemberFormSchema } from '@/lib/superadmin/team-members/validators';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
};

function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') obj[key] = value;
  }
  for (const [key, value] of formData.entries()) {
    if (value === 'on' && !(key in obj)) obj[key] = 'on';
  }
  return obj;
}

function checkboxValue(formData: FormData, key: string): string {
  return formData.get(key) === 'on' || formData.get(key) === 'true' ? 'true' : 'false';
}

function parseTeamMemberForm(formData: FormData) {
  const raw = formDataToObject(formData);
  raw.is_founder = checkboxValue(formData, 'is_founder');
  raw.is_featured = checkboxValue(formData, 'is_featured');
  raw.is_published = checkboxValue(formData, 'is_published');
  return teamMemberFormSchema.safeParse(raw);
}

function revalidateTeamCaches() {
  revalidatePath('/team');
  revalidateTag('team-members', 'max');
}

export async function createTeamMemberAction(
  formData: FormData,
): Promise<ActionResponse<{ id: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = parseTeamMemberForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    const result = await createTeamMember(parsed.data, authCheck.user.id);
    revalidateTeamCaches();
    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to create team member.',
    };
  }
}

export async function updateTeamMemberAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = parseTeamMemberForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    await updateTeamMember(memberId, parsed.data, authCheck.user.id);
    revalidateTeamCaches();
    revalidatePath(`/team/${memberId}/edit`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update team member.',
    };
  }
}

export async function toggleTeamMemberPublishedAction(
  memberId: string,
  isPublished: boolean,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await setTeamMemberPublished(memberId, isPublished, authCheck.user.id);
    revalidateTeamCaches();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update publication status.',
    };
  }
}

export async function reorderTeamMembersAction(
  orderedIds: string[],
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!orderedIds.length) return { success: false, error: 'No members to reorder.' };

  try {
    await reorderTeamMembers(orderedIds);
    revalidateTeamCaches();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to reorder team members.',
    };
  }
}

export async function moveTeamMemberAction(
  memberId: string,
  direction: 'up' | 'down',
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const { listTeamMembers } = await import('@/lib/superadmin/team-members/queries');
  const { members } = await listTeamMembers();
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return { success: false, error: 'Team member not found.' };

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= members.length) {
    return { success: false, error: 'Cannot move member further in that direction.' };
  }

  const reordered = [...members];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

  return reorderTeamMembersAction(reordered.map((m) => m.id));
}

export async function deleteTeamMemberAction(
  memberId: string,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const result = await deleteTeamMember(memberId);
    revalidateTeamCaches();
    return {
      success: true,
      warning: result.storageWarning,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to delete team member.',
    };
  }
}

export async function uploadTeamMemberPhotoAction(
  memberId: string,
  formData: FormData,
): Promise<ActionResponse<{ photoPath: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const file = formData.get('photo');
  if (!(file instanceof File)) {
    return { success: false, error: 'No file provided.' };
  }

  try {
    const result = await uploadTeamMemberPhoto(memberId, file, authCheck.user.id);
    revalidateTeamCaches();
    revalidatePath(`/team/${memberId}/edit`);
    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to upload photo.',
    };
  }
}

export async function removeTeamMemberPhotoAction(
  memberId: string,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await removeTeamMemberPhoto(memberId, authCheck.user.id);
    revalidateTeamCaches();
    revalidatePath(`/team/${memberId}/edit`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to remove photo.',
    };
  }
}

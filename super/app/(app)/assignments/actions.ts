'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  createAssignment,
  revokeAssignment,
} from '@/lib/services/content-assignments';
import type { ContentAssignmentsRow } from '@/types/database';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateAssignmentInput {
  assignment_type: 'college' | 'student';
  target_id: string;
  assigned_entity_type: 'variant' | 'bundle' | 'master_course';
  assigned_entity_id: string;
  start_date?: string;
  end_date: string;
}

export async function createAssignmentAction(
  input: CreateAssignmentInput,
): Promise<ActionResponse<ContentAssignmentsRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const { assignment } = await createAssignment({
      assignment_type: input.assignment_type,
      target_id: input.target_id,
      assigned_entity_type: input.assigned_entity_type,
      assigned_entity_id: input.assigned_entity_id,
      start_date: input.start_date,
      end_date: input.end_date,
    });

    return { success: true, data: assignment };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function revokeAssignmentAction(
  assignmentId: string,
  collegeId?: string,
): Promise<ActionResponse<{ entitlementsRevoked: number }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const result = await revokeAssignment(assignmentId);

    revalidatePath('/assignments');
    if (collegeId) {
      revalidatePath(`/colleges/${collegeId}`);
    }

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

'use server';

/**
 * Server actions for Platform Announcements.
 * All actions are gated by requireAuth().
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AnnouncementType } from '@/types/database';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateAnnouncementInput {
  type: AnnouncementType;
  title: string;
  message?: string | null;
  html_content?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  coupon_id?: string | null;
  is_active?: boolean;
  starts_at?: string;
  expires_at?: string | null;
}

export interface UpdateAnnouncementInput {
  id: string;
  type?: AnnouncementType;
  title?: string;
  message?: string | null;
  html_content?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  coupon_id?: string | null;
  is_active?: boolean;
  starts_at?: string;
  expires_at?: string | null;
}

/**
 * Deactivate all currently active announcements.
 * Called before activating a new one to enforce single-active constraint.
 */
async function deactivateAll() {
  const admin = createAdminClient();
  await admin
    .from('platform_announcements')
    .update({ is_active: false })
    .eq('is_active', true);
}

/**
 * Create a new announcement.
 */
export async function createAnnouncementAction(
  input: CreateAnnouncementInput,
): Promise<ActionResponse<{ id: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();

    // If this announcement should be active, deactivate all others first
    if (input.is_active) {
      await deactivateAll();
    }

    const { data, error } = await admin
      .from('platform_announcements')
      .insert({
        type: input.type,
        title: input.title,
        message: input.message ?? null,
        html_content: input.html_content ?? null,
        cta_label: input.cta_label ?? 'Learn More',
        cta_url: input.cta_url ?? null,
        coupon_id: input.coupon_id ?? null,
        is_active: input.is_active ?? false,
        starts_at: input.starts_at ?? new Date().toISOString(),
        expires_at: input.expires_at ?? null,
        created_by: authCheck.user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create announcement: ${error?.message ?? 'No data returned'}`);
    }

    return { success: true, data: data as { id: string } };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update an existing announcement.
 */
export async function updateAnnouncementAction(
  input: UpdateAnnouncementInput,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();
    const { id, ...updates } = input;

    // If activating, deactivate all others first
    if (updates.is_active) {
      await deactivateAll();
    }

    const { error } = await admin
      .from('platform_announcements')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update announcement: ${error.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete an announcement.
 */
export async function deleteAnnouncementAction(
  announcementId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from('platform_announcements')
      .delete()
      .eq('id', announcementId);

    if (error) {
      throw new Error(`Failed to delete announcement: ${error.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Toggle announcement active status.
 */
export async function toggleAnnouncementActiveAction(
  announcementId: string,
  isActive: boolean,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();

    // If activating, deactivate all others first
    if (isActive) {
      await deactivateAll();
    }

    const { error } = await admin
      .from('platform_announcements')
      .update({ is_active: isActive })
      .eq('id', announcementId);

    if (error) {
      throw new Error(`Failed to toggle announcement: ${error.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fetch all announcements (SuperAdmin view).
 */
export async function fetchAnnouncementsAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('platform_announcements')
      .select('*, coupons(code, discount_type, discount_value, valid_until)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch announcements: ${error.message}`);
    }

    return { success: true, data: data ?? [] };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

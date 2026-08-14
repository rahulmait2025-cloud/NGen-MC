import 'server-only';

/**
 * Student Content Entitlements Service.
 *
 * Flexible content-level grants for master_course, variant, and bundle
 * without modifying student_entitlements.master_course_id constraint.
 *
 * All methods use the service-role client (bypasses RLS).
 * Callers must validate admin identity before invoking mutations.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type ContentEntityType = 'master_course' | 'variant' | 'bundle';
export type ContentEntitlementSourceType = 'manual_grant' | 'college_assignment';
export type ContentEntitlementStatus = 'active' | 'expired' | 'revoked' | 'suspended';

export interface StudentContentEntitlementsRow {
  id: string;
  student_id: string;
  assigned_entity_type: ContentEntityType;
  assigned_entity_id: string;
  source_type: ContentEntitlementSourceType;
  status: ContentEntitlementStatus;
  valid_from: string;
  valid_until: string | null;
  created_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GrantContentEntitlementInput {
  student_id: string;
  assigned_entity_type: ContentEntityType;
  assigned_entity_id: string;
  source_type?: ContentEntitlementSourceType;
  valid_from?: string;
  valid_until?: string | null;
  created_by?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Grant a student access to a content entity (master_course, variant, or bundle).
 */
export async function grantContentEntitlement(
  input: GrantContentEntitlementInput,
): Promise<StudentContentEntitlementsRow> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('student_content_entitlements')
    .insert({
      student_id: input.student_id,
      assigned_entity_type: input.assigned_entity_type,
      assigned_entity_id: input.assigned_entity_id,
      source_type: input.source_type ?? 'manual_grant',
      status: 'active',
      valid_from: input.valid_from ?? new Date().toISOString(),
      valid_until: input.valid_until ?? null,
      created_by: input.created_by ?? null,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to grant content entitlement: ${error.message}`);
  return data as StudentContentEntitlementsRow;
}

/**
 * Revoke a content entitlement by id.
 */
export async function revokeContentEntitlement(
  entitlementId: string,
  revokedBy: string,
  reason?: string,
): Promise<void> {
  const sb = createAdminClient();

  const { error } = await sb
    .from('student_content_entitlements')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      revoke_reason: reason ?? null,
    })
    .eq('id', entitlementId);

  if (error) throw new Error(`Failed to revoke content entitlement: ${error.message}`);
}

/**
 * Find an active content entitlement for a student + content entity.
 */
export async function findActiveContentEntitlement(
  studentId: string,
  assignedEntityType: ContentEntityType,
  assignedEntityId: string,
): Promise<StudentContentEntitlementsRow | null> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('student_content_entitlements')
    .select('*')
    .eq('student_id', studentId)
    .eq('assigned_entity_type', assignedEntityType)
    .eq('assigned_entity_id', assignedEntityId)
    .eq('status', 'active')
    .eq('source_type', 'manual_grant')
    .maybeSingle();

  if (error) throw new Error(`Failed to find content entitlement: ${error.message}`);
  return data as StudentContentEntitlementsRow | null;
}

/**
 * List active content entitlements for a student.
 */
async function _listStudentContentEntitlements(
  studentId: string,
): Promise<StudentContentEntitlementsRow[]> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from('student_content_entitlements')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  if (error) throw new Error(`Failed to list content entitlements: ${error.message}`);
  return (data ?? []) as StudentContentEntitlementsRow[];
}
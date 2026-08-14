import 'server-only';

/**
 * Student Entitlements Service (Phase 4).
 *
 * Centralized access-control layer that determines which Master Courses
 * a student can access. Supports B2B college, B2C direct, bundle,
 * subscription, and manual grants.
 *
 * All methods use the service-role client (bypasses RLS).
 * Callers must validate admin identity before invoking mutations.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  EntitlementSourceType,
  EntitlementStatus,
  StudentEntitlementsRow,
} from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GrantEntitlementInput {
  student_id: string;
  master_course_id: string;
  source_type: EntitlementSourceType;
  college_id?: string;
  valid_from?: string;
  valid_until?: string | null;
  granted_by?: string;
  metadata?: Record<string, unknown>;
}

export interface EntitlementWithCourse extends StudentEntitlementsRow {
  master_courses?: {
    id: string;
    title: string;
    code: string;
    description: string | null;
    short_description: string | null;
    pillar: string | null;
    publish_status: string;
  };
}

// ─── Grant / Revoke ───────────────────────────────────────────────────────────

/**
 * Grant a student access to a Master Course.
 */
export async function grantEntitlement(
  input: GrantEntitlementInput,
): Promise<StudentEntitlementsRow> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('student_entitlements')
    .insert({
      student_id: input.student_id,
      master_course_id: input.master_course_id,
      source_type: input.source_type,
      college_id: input.college_id ?? null,
      status: 'active' as EntitlementStatus,
      valid_from: input.valid_from ?? new Date().toISOString(),
      valid_until: input.valid_until ?? null,
      granted_by: input.granted_by ?? null,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to grant entitlement: ${error.message}`);
  return data as StudentEntitlementsRow;
}

/**
 * Revoke a student entitlement.
 */
export async function revokeEntitlement(
  entitlementId: string,
  revokedBy: string,
  reason?: string,
): Promise<void> {
  const sb = createAdminClient();

  const { error } = await sb
    .from('student_entitlements')
    .update({
      status: 'revoked' as EntitlementStatus,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      revoke_reason: reason ?? null,
    })
    .eq('id', entitlementId);

  if (error) throw new Error(`Failed to revoke entitlement: ${error.message}`);
}

// ─── Resolution / Validation ──────────────────────────────────────────────────

/**
 * Get all active, non-expired entitlements for a student.
 */
async function resolveStudentEntitlements(
  studentId: string,
): Promise<EntitlementWithCourse[]> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('student_entitlements')
    .select(`
      *,
      master_courses (
        id, title, code, description, short_description, pillar, publish_status
      )
    `)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .or('valid_until.is.null,valid_until.gt.' + new Date().toISOString());

  if (error) throw new Error(`Failed to resolve entitlements: ${error.message}`);
  return (data ?? []) as EntitlementWithCourse[];
}

/**
 * Check if a student has an active entitlement for a specific course.
 * Returns the entitlement row if valid, null otherwise.
 */
async function validateStudentCourseAccess(
  studentId: string,
  courseId: string,
): Promise<StudentEntitlementsRow | null> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('student_entitlements')
    .select('*')
    .eq('student_id', studentId)
    .eq('master_course_id', courseId)
    .eq('status', 'active')
    .or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to validate course access: ${error.message}`);
  return data as StudentEntitlementsRow | null;
}

/**
 * Find an active paid (b2c_direct) entitlement for a student + master course.
 * Used for revoking full master course paid access.
 */
export async function findActivePaidEntitlement(
  studentId: string,
  masterCourseId: string,
): Promise<StudentEntitlementsRow | null> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from('student_entitlements')
    .select('*')
    .eq('student_id', studentId)
    .eq('master_course_id', masterCourseId)
    .eq('source_type', 'b2c_direct')
    .eq('status', 'active')
    .or(`valid_until.is.null,valid_until.gt.${nowIso}`)
    .maybeSingle();

  if (error) throw new Error(`Failed to find paid entitlement: ${error.message}`);
  return data as StudentEntitlementsRow | null;
}

const VARIANT_METADATA_KEYS = ['variant_id', 'course_variant_id', 'assigned_entity_id', 'entity_id', 'original_entity_id'];
const VARIANT_TYPE_KEYS = ['assigned_entity_type', 'entity_type', 'original_entity_type'];
const VARIANT_TYPE_VALUES = ['variant', 'course_variant'];

function matchesVariantMetadata(metadata: Record<string, unknown>, variantId: string): boolean {
  if (VARIANT_METADATA_KEYS.some((key) => metadata[key] === variantId)) {
    const typeValue = VARIANT_TYPE_KEYS.find((key) => metadata[key] !== undefined);
    if (typeValue) {
      const typeVal = metadata[typeValue];
      if (typeof typeVal === 'string' && VARIANT_TYPE_VALUES.includes(typeVal.toLowerCase())) {
        return true;
      }
      if (Array.isArray(typeVal) && typeVal.some((v) => typeof v === 'string' && VARIANT_TYPE_VALUES.includes(v.toLowerCase()))) {
        return true;
      }
    }
    return VARIANT_METADATA_KEYS.some((key) => metadata[key] === variantId);
  }
  return false;
}

/**
 * Find an active paid (b2c_direct) entitlement for a student + variant by metadata.
 * Used for revoking variant-specific paid access without touching parent master course access.
 */
export async function findActivePaidVariantEntitlement(
  studentId: string,
  variantId: string,
): Promise<StudentEntitlementsRow | null> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from('student_entitlements')
    .select('*')
    .eq('student_id', studentId)
    .eq('source_type', 'b2c_direct')
    .eq('status', 'active')
    .or(`valid_until.is.null,valid_until.gt.${nowIso}`);

  if (error) throw new Error(`Failed to find paid variant entitlement: ${error.message}`);

  const matched = (data ?? []).find((entitlement) => {
    const metadata = entitlement.metadata as Record<string, unknown>;
    return matchesVariantMetadata(metadata, variantId);
  });

  return (matched as StudentEntitlementsRow) ?? null;
}

const BUNDLE_METADATA_KEYS = ['bundle_id', 'course_bundle_id', 'assigned_entity_id', 'entity_id', 'original_entity_id'];
const BUNDLE_TYPE_KEYS = ['assigned_entity_type', 'entity_type', 'original_entity_type'];
const BUNDLE_TYPE_VALUES = ['bundle', 'course_bundle'];

function matchesBundleMetadata(metadata: Record<string, unknown>, bundleId: string): boolean {
  if (BUNDLE_METADATA_KEYS.some((key) => metadata[key] === bundleId)) {
    const typeValue = BUNDLE_TYPE_KEYS.find((key) => metadata[key] !== undefined);
    if (typeValue) {
      const typeVal = metadata[typeValue];
      if (typeof typeVal === 'string' && BUNDLE_TYPE_VALUES.includes(typeVal.toLowerCase())) {
        return true;
      }
      if (Array.isArray(typeVal) && typeVal.some((v) => typeof v === 'string' && BUNDLE_TYPE_VALUES.includes(v.toLowerCase()))) {
        return true;
      }
    }
    return BUNDLE_METADATA_KEYS.some((key) => metadata[key] === bundleId);
  }
  return false;
}

/**
 * Find an active paid (b2c_direct) entitlement for a student + bundle by metadata.
 * Used for revoking bundle paid access.
 */
export async function findActivePaidBundleEntitlement(
  studentId: string,
  bundleId: string,
): Promise<StudentEntitlementsRow | null> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from('student_entitlements')
    .select('*')
    .eq('student_id', studentId)
    .eq('source_type', 'b2c_direct')
    .eq('status', 'active')
    .or(`valid_until.is.null,valid_until.gt.${nowIso}`);

  if (error) throw new Error(`Failed to find paid bundle entitlement: ${error.message}`);

  const matched = (data ?? []).find((entitlement) => {
    const metadata = entitlement.metadata as Record<string, unknown>;
    return matchesBundleMetadata(metadata, bundleId);
  });

  return (matched as StudentEntitlementsRow) ?? null;
}

/**
 * Check if a student has access to a specific video asset.
 * Resolves asset → course → entitlement chain.
 */
async function _validateStudentAssetAccess(
  studentId: string,
  assetId: string,
): Promise<boolean> {
  const sb = createAdminClient();

  // Resolve the video asset's parent course
  const { data: asset, error: assetErr } = await sb
    .from('video_assets')
    .select('master_course_id')
    .eq('id', assetId)
    .single();

  if (assetErr || !asset) return false;

  const access = await validateStudentCourseAccess(studentId, asset.master_course_id);
  return !!access;
}

/**
 * Check if a student has access to a specific curriculum item.
 * Resolves item → course → entitlement chain.
 */
async function _validateStudentItemAccess(
  studentId: string,
  itemId: string,
): Promise<boolean> {
  const sb = createAdminClient();

  // Resolve the item's parent course
  const { data: item, error: itemErr } = await sb
    .from('master_course_items')
    .select('master_course_id')
    .eq('id', itemId)
    .single();

  if (itemErr || !item) return false;

  const access = await validateStudentCourseAccess(studentId, item.master_course_id);
  return !!access;
}

/**
 * Get all Master Courses a student currently has access to.
 */
async function _getStudentAccessibleCourses(
  studentId: string,
): Promise<EntitlementWithCourse[]> {
  return resolveStudentEntitlements(studentId);
}

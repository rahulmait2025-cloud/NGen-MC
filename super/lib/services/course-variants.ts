import 'server-only';

import { revalidateCourseStructure, revalidateCourseStructures } from '@/lib/cache/invalidate-course';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  CourseVariantsRow,
  CourseVariantItemsRow,
  MasterCourseItemsRow,
  CatalogVisibilityScope,
} from '@/types/database';

export class DuplicateVariantItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateVariantItemError';
  }
}

async function assertDisplayPillarExists(pillarId: string): Promise<void> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('master_course_pillars')
    .select('id')
    .eq('id', pillarId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate display pillar: ${error.message}`);
  }
  if (!data) {
    throw new Error('Selected Display Pillar no longer exists. Choose another pillar.');
  }
}

export interface CreateVariantInput {
  master_course_id: string;
  pillar_id: string;
  title: string;
  slug: string;
  code: string;
  description?: string;
  selling_price?: number;
  discounted_price?: number;
  internal_cost?: number;
  pricing_model?: 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only';
  visibility_scope?: CatalogVisibilityScope;
  created_for_college_id?: string | null;
  visibility_metadata?: Record<string, unknown>;
  visible_college_ids?: string[];
  created_by?: string;
}

export interface UpdateVariantInput {
  pillar_id?: string | null;
  title?: string;
  slug?: string;
  code?: string;
  description?: string;
  selling_price?: number | null;
  discounted_price?: number | null;
  internal_cost?: number | null;
  pricing_model?: 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only' | null;
  publish_status?: 'draft' | 'published' | 'unpublished';
  visibility_scope?: CatalogVisibilityScope;
  created_for_college_id?: string | null;
  visibility_metadata?: Record<string, unknown>;
  visible_college_ids?: string[];
  show_as_paid_course?: boolean;
}

export interface AddVariantItemInput {
  course_variant_id: string;
  master_course_item_id: string;
  inclusion_type?: 'full_module' | 'selected_item';
  sort_order?: number;
}

export interface VariantWithItems extends CourseVariantsRow {
  master_courses: {
    id: string;
    title: string;
    code: string;
    publish_status: string;
  };
  course_variant_visibility_colleges?: Array<{ college_id: string }>;
  items: (CourseVariantItemsRow & {
    master_course_items: MasterCourseItemsRow;
  })[];
}

// --- CRUD ---------------------------------------------------------------------

/**
 * Create a new Course Variant.
 *
 * Visibility logic:
 * - If visibility_scope === 'selected_colleges', visible_college_ids is required.
 * - If visibility_scope !== 'selected_colleges', visible_college_ids is ignored.
 * - created_for_college_id is optional lineage only.
 */
export async function createVariant(
  input: CreateVariantInput,
): Promise<CourseVariantsRow> {
  const sb = createAdminClient();

  const visibilityScope = input.visibility_scope ?? 'global';

  if (visibilityScope === 'selected_colleges') {
    if (!input.visible_college_ids || input.visible_college_ids.length === 0) {
      throw new Error(
        'At least one college must be selected when visibility_scope is "selected_colleges"',
      );
    }
  }

  const pillarId = input.pillar_id?.trim();
  if (!pillarId) {
    throw new Error('Display Pillar is required.');
  }
  await assertDisplayPillarExists(pillarId);

  const { data, error } = await sb
    .from('course_variants')
    .insert({
      master_course_id: input.master_course_id,
      pillar_id: pillarId,
      title: input.title,
      slug: input.slug,
      code: input.code,
      description: input.description ?? null,
      selling_price: input.selling_price ?? null,
      discounted_price: input.discounted_price ?? null,
      internal_cost: input.internal_cost ?? null,
      pricing_model: input.pricing_model ?? null,
      publish_status: 'draft',
      visibility_scope: visibilityScope,
      created_for_college_id: input.created_for_college_id ?? null,
      visibility_metadata: input.visibility_metadata ?? {},
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create variant: ${error.message}`);

  const variant = data as CourseVariantsRow;

  if (visibilityScope === 'selected_colleges' && input.visible_college_ids) {
    const visibilityRows = input.visible_college_ids.map((collegeId) => ({
      variant_id: variant.id,
      college_id: collegeId,
    }));

    const { error: visError } = await sb
      .from('course_variant_visibility_colleges')
      .insert(visibilityRows);

    if (visError) {
      await sb.from('course_variants').delete().eq('id', variant.id);
      throw new Error(
        `Failed to create visibility mapping: ${visError.message}`,
      );
    }
  }

  await revalidateCourseStructure(input.master_course_id);

  return variant;
}

/**
 * Update an existing Course Variant.
 *
 * Visibility update logic:
 * - visible_college_ids replaces entire mapping when provided.
 * - For global/private: clears all mapping rows.
 * - For selected_colleges: requires at least one college.
 */
export async function updateVariant(
  variantId: string,
  input: UpdateVariantInput,
): Promise<CourseVariantsRow> {
  const sb = createAdminClient();

  const { visible_college_ids, visibility_scope, created_for_college_id, visibility_metadata, ...rest } = input;

  const updateData: Record<string, unknown> = { ...rest };

  if (visibility_scope !== undefined) {
    updateData.visibility_scope = visibility_scope;
  }
  if (created_for_college_id !== undefined) {
    updateData.created_for_college_id = created_for_college_id;
  }
  if (visibility_metadata !== undefined) {
    updateData.visibility_metadata = visibility_metadata;
  }
  if (input.pillar_id !== undefined) {
    const pillarId = input.pillar_id?.trim() || null;
    if (!pillarId) {
      throw new Error('Display Pillar is required.');
    }
    await assertDisplayPillarExists(pillarId);
    updateData.pillar_id = pillarId;
  }

  const { data, error } = await sb
    .from('course_variants')
    .update(updateData)
    .eq('id', variantId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update variant: ${error.message}`);

  if (visible_college_ids !== undefined) {
    await sb.from('course_variant_visibility_colleges').delete().eq('variant_id', variantId);

    if (visible_college_ids.length > 0) {
      const visibilityRows = visible_college_ids.map((collegeId) => ({
        variant_id: variantId,
        college_id: collegeId,
      }));

      const { error: visError } = await sb
        .from('course_variant_visibility_colleges')
        .insert(visibilityRows);

      if (visError) {
        throw new Error(`Failed to update visibility mapping: ${visError.message}`);
      }
    }
  }

  await revalidateCourseStructure((data as CourseVariantsRow).master_course_id);

  return data as CourseVariantsRow;
}

/**
 * Delete a Course Variant and all its items.
 */
export async function deleteVariant(variantId: string): Promise<void> {
  const sb = createAdminClient();

  // Load variant to check publish status
  const { data: variant, error: vErr } = await sb
    .from('course_variants')
    .select('id, publish_status, master_course_id')
    .eq('id', variantId)
    .maybeSingle();

  if (vErr) throw new Error(`Failed to load variant: ${vErr.message}`);
  if (!variant) throw new Error('Variant not found');

  if (variant.publish_status === 'published') {
    throw new Error('Published variants cannot be deleted. You can edit them.');
  }

  // Dependency checks: bundles, assignments, entitlements
  const [{ data: bundleRefs }, { data: assignments }, { count: entitlementCount, error: entitlementErr }] = await Promise.all([
    sb
      .from('bundle_items')
      .select('id')
      .eq('item_type', 'variant')
      .eq('reference_id', variantId),
    sb
      .from('content_assignments')
      .select('id')
      .eq('assigned_entity_type', 'variant')
      .eq('assigned_entity_id', variantId),
    sb
      .from('student_entitlements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('metadata->>assigned_entity_type', 'variant')
      .eq('metadata->>assigned_entity_id', variantId),
  ]);

  if (entitlementErr) {
    throw new Error(`Failed to inspect variant entitlements: ${entitlementErr.message}`);
  }

  if ((bundleRefs ?? []).length > 0 || (assignments ?? []).length > 0 || (entitlementCount ?? 0) > 0) {
    throw new Error('This variant cannot be deleted because it is used by bundles/assignments/entitlements.');
  }

  // Safe to delete: remove variant items then variant row
  const { error: delItemsErr } = await sb
    .from('course_variant_items')
    .delete()
    .eq('course_variant_id', variantId);

  if (delItemsErr) throw new Error(`Failed to delete variant items: ${delItemsErr.message}`);

  const { error: delErr } = await sb
    .from('course_variants')
    .delete()
    .eq('id', variantId);

  if (delErr) throw new Error(`Failed to delete variant: ${delErr.message}`);

  await revalidateCourseStructure(variant.master_course_id);
}

/**
 * Publish a Course Variant.
 */
export async function publishVariant(variantId: string): Promise<CourseVariantsRow> {
  const sb = createAdminClient();

  const { data: existing, error: loadErr } = await sb
    .from('course_variants')
    .select('id, pillar_id, master_course_id')
    .eq('id', variantId)
    .maybeSingle();

  if (loadErr) throw new Error(`Failed to load variant: ${loadErr.message}`);
  if (!existing) throw new Error('Variant not found');

  const pillarId = (existing.pillar_id as string | null)?.trim();
  if (!pillarId) {
    throw new Error('Display Pillar is required before publishing.');
  }
  await assertDisplayPillarExists(pillarId);

  const { data, error } = await sb
    .from('course_variants')
    .update({ publish_status: 'published' })
    .eq('id', variantId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to publish variant: ${error.message}`);

  await revalidateCourseStructure(existing.master_course_id);

  return data as CourseVariantsRow;
}

/**
 * Unpublish a Course Variant.
 */
export async function unpublishVariant(variantId: string): Promise<CourseVariantsRow> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('course_variants')
    .update({ publish_status: 'unpublished' })
    .eq('id', variantId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to unpublish variant: ${error.message}`);

  await revalidateCourseStructure((data as CourseVariantsRow).master_course_id);

  return data as CourseVariantsRow;
}

// --- Item Management ----------------------------------------------------------

/**
 * Add items (modules/lessons) to a variant.
 */
export async function addVariantItems(
  items: AddVariantItemInput[],
): Promise<CourseVariantItemsRow[]> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('course_variant_items')
    .insert(
      items.map((item) => ({
        course_variant_id: item.course_variant_id,
        master_course_item_id: item.master_course_item_id,
        inclusion_type: item.inclusion_type ?? 'selected_item',
        sort_order: item.sort_order ?? 0,
      })),
    )
    .select('*');

  if (error) {
    if (error.code === '23505') {
      throw new DuplicateVariantItemError('This item is already added to the variant.');
    }
    throw new Error(`Failed to add variant items: ${error.message}`);
  }

  const variantIds = [...new Set(items.map((i) => i.course_variant_id))];
  const { data: variants } = await sb
    .from('course_variants')
    .select('master_course_id')
    .in('id', variantIds);
  await revalidateCourseStructures((variants ?? []).map((v) => v.master_course_id));

  return data as CourseVariantItemsRow[];
}

/**
 * Remove an item from a variant.
 */
export async function removeVariantItem(
  courseVariantId: string,
  masterCourseItemId: string,
): Promise<void> {
  const sb = createAdminClient();

  const { error } = await sb
    .from('course_variant_items')
    .delete()
    .eq('course_variant_id', courseVariantId)
    .eq('master_course_item_id', masterCourseItemId);

  if (error) throw new Error(`Failed to remove variant item: ${error.message}`);

  const { data: variant } = await sb
    .from('course_variants')
    .select('master_course_id')
    .eq('id', courseVariantId)
    .maybeSingle();
  if (variant) {
    await revalidateCourseStructure(variant.master_course_id);
  }
}

/**
 * Reorder items within a variant.
 */
async function _reorderVariantItems(
  courseVariantId: string,
  itemIds: string[],
): Promise<void> {
  const sb = createAdminClient();

  const updates = itemIds.map((itemId, index) => ({
    id: itemId,
    sort_order: index,
  }));

  const { error } = await sb
    .from('course_variant_items')
    .upsert(updates, { onConflict: 'id' });

  if (error) throw new Error(`Failed to reorder variant items: ${error.message}`);

  const { data: variant } = await sb
    .from('course_variants')
    .select('master_course_id')
    .eq('id', courseVariantId)
    .maybeSingle();
  if (variant) {
    await revalidateCourseStructure(variant.master_course_id);
  }
}

// --- Queries ------------------------------------------------------------------

/**
 * Get a variant with its parent course and included items.
 */
export async function getVariantWithItems(
  variantId: string,
): Promise<VariantWithItems | null> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('course_variants')
    .select(`
      *,
      master_courses (
        id, title, code, publish_status
      ),
      course_variant_visibility_colleges (
        college_id
      ),
      course_variant_items (
        *,
        master_course_items (*)
      )
    `)
    .eq('id', variantId)
    .single();

  if (error) return null;

  return {
    ...data,
    items: data.course_variant_items ?? [],
    course_variant_visibility_colleges: data.course_variant_visibility_colleges ?? [],
  } as VariantWithItems;
}

/**
 * List all variants with optional filtering.
 */
export async function listVariants(filters?: {
  master_course_id?: string;
  publish_status?: string;
}): Promise<VariantWithItems[]> {
  const sb = createAdminClient();

  let query = sb
    .from('course_variants')
    .select(`
      id, title, code, master_course_id, publish_status, show_as_paid_course, created_at, updated_at,
      master_courses (
        id, title, code, publish_status
      ),
      course_variant_visibility_colleges (
        college_id
      ),
      course_variant_items (
        *,
        master_course_items (
          id, title, item_type, publish_status
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.master_course_id) {
    query = query.eq('master_course_id', filters.master_course_id);
  }
  if (filters?.publish_status) {
    query = query.eq('publish_status', filters.publish_status);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list variants: ${error.message}`);

  return (data ?? []).map((variant) => ({
    ...variant,
    items: variant.course_variant_items ?? [],
  })) as unknown as VariantWithItems[];
}

// --- Validation ---------------------------------------------------------------

/**
 * Validate that all referenced items exist in the parent master course.
 */
 
async function _validateVariantItems(
  courseVariantId: string,
): Promise<{ valid: boolean; invalid_item_ids: string[] }> {
  const sb = createAdminClient();

  // Get variant's parent course
  const { data: variant } = await sb
    .from('course_variants')
    .select('master_course_id')
    .eq('id', courseVariantId)
    .single();

  if (!variant) return { valid: false, invalid_item_ids: [] };

  // Get variant items
  const { data: variantItems } = await sb
    .from('course_variant_items')
    .select('master_course_item_id')
    .eq('course_variant_id', courseVariantId);

  if (!variantItems || variantItems.length === 0) {
    return { valid: true, invalid_item_ids: [] };
  }

  const itemIds = variantItems.map((vi) => vi.master_course_item_id);

  // Check which items belong to the parent course
  const { data: validItems } = await sb
    .from('master_course_items')
    .select('id')
    .eq('master_course_id', variant.master_course_id)
    .in('id', itemIds);

  const validItemIds = new Set((validItems ?? []).map((i) => i.id));
  const invalidItemIds = itemIds.filter((id) => !validItemIds.has(id));

  return {
    valid: invalidItemIds.length === 0,
    invalid_item_ids: invalidItemIds,
  };
}

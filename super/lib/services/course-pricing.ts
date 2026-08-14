import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export interface CoursePricingInput {
  courseId: string;
  pricing_model?: string;
  base_price?: number | null;
  selling_price?: number | null;
  discounted_price?: number | null;
  currency?: string;
  is_free?: boolean;
  is_invite_only?: boolean;
  visible_to_global_students?: boolean;
}

export interface VariantSyncResult {
  success: boolean;
  variantId?: string;
  variantTitle?: string;
  action: 'created' | 'updated' | 'deleted' | 'none';
  message?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateVariantCode(courseId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = courseId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `VAR-${suffix}-${timestamp}`;
}

export async function upsertGlobalVariantForCourse(
  input: CoursePricingInput,
): Promise<VariantSyncResult> {
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('id, title, code')
    .eq('id', input.courseId)
    .single();

  if (courseError || !course) {
    return { success: false, message: 'Course not found', action: 'none' };
  }

  const courseTitle = (course as { title: string }).title;
  const courseCode = (course as { code: string }).code;

  const isFree = input.is_free ?? false;
  const pricingModel = input.pricing_model ?? 'free';
  const sellingPrice = input.selling_price;
  const shouldHaveVariant =
    !isFree && pricingModel !== 'free' && sellingPrice != null && sellingPrice > 0;

  if (!shouldHaveVariant) {
    const { data: existing } = await admin
      .from('course_variants')
      .select('id, title')
      .eq('master_course_id', input.courseId)
      .eq('visibility_scope', 'global')
      .maybeSingle();

    if (existing) {
      await admin
        .from('course_variants')
        .update({ publish_status: 'unpublished' })
        .eq('id', (existing as { id: string }).id);

      return {
        success: true,
        variantId: (existing as { id: string }).id,
        variantTitle: (existing as { title: string }).title,
        action: 'deleted',
        message: 'Global variant unpublished (course is free or no price set)',
      };
    }

    return { success: true, action: 'none', message: 'No global variant needed' };
  }

  const variantTitle = `Direct Purchase — ${courseTitle}`;
  const variantSlug = `direct-purchase-${slugify(courseCode)}`;
  const variantCode = generateVariantCode(input.courseId);
  const currency = input.currency ?? 'INR';

  const { data: existing } = await admin
    .from('course_variants')
    .select('id, title, publish_status')
    .eq('master_course_id', input.courseId)
    .eq('visibility_scope', 'global')
    .maybeSingle();

  if (existing) {
    const existingId = (existing as { id: string }).id;
    await admin
      .from('course_variants')
      .update({
        title: variantTitle,
        selling_price: sellingPrice,
        discounted_price: input.discounted_price ?? null,
        pricing_model: pricingModel,
        currency,
        publish_status: 'published',
      })
      .eq('id', existingId);

    return {
      success: true,
      variantId: existingId,
      variantTitle,
      action: 'updated',
      message: 'Global variant updated with new pricing',
    };
  }

  const { data: newVariant, error: insertError } = await admin
    .from('course_variants')
    .insert({
      master_course_id: input.courseId,
      title: variantTitle,
      slug: variantSlug,
      code: variantCode,
      description: `Direct purchase variant for course: ${courseTitle}`,
      selling_price: sellingPrice,
      discounted_price: input.discounted_price ?? null,
      internal_cost: null,
      pricing_model: pricingModel,
      publish_status: 'published',
      visibility_scope: 'global',
      created_for_college_id: null,
      visibility_metadata: {},
    })
    .select('id, title')
    .single();

  if (insertError || !newVariant) {
    return { success: false, message: `Failed to create variant: ${insertError?.message}`, action: 'none' };
  }

  return {
    success: true,
    variantId: (newVariant as { id: string }).id,
    variantTitle: (newVariant as { title: string }).title,
    action: 'created',
    message: 'Global variant created for B2C purchase',
  };
}

async function _getGlobalVariantForCourse(
  courseId: string,
): Promise<{ id: string; title: string; selling_price: number; discounted_price: number | null; publish_status: string } | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_variants')
    .select('id, title, selling_price, discounted_price, publish_status')
    .eq('master_course_id', courseId)
    .eq('visibility_scope', 'global')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as { id: string; title: string; selling_price: number; discounted_price: number | null; publish_status: string };
}

export async function getCoursePricingStatus(
  courseId: string,
): Promise<{
  hasGlobalVariant: boolean;
  variantId: string | null;
  variantPrice: number | null;
  variantStatus: string | null;
  masterCoursePrice: number | null;
  masterCourseCurrency: string | null;
}> {
  const admin = createAdminClient();

  const [variantData, courseData] = await Promise.all([
    admin
      .from('course_variants')
      .select('id, selling_price, publish_status')
      .eq('master_course_id', courseId)
      .eq('visibility_scope', 'global')
      .maybeSingle(),
    admin
      .from('master_courses')
      .select('selling_price, currency, is_free, pricing_model')
      .eq('id', courseId)
      .single(),
  ]);

  return {
    hasGlobalVariant: !!variantData?.data,
    variantId: (variantData?.data as { id: string } | undefined)?.id ?? null,
    variantPrice: (variantData?.data as { selling_price: number } | undefined)?.selling_price ?? null,
    variantStatus: (variantData?.data as { publish_status: string } | undefined)?.publish_status ?? null,
    masterCoursePrice: (courseData.data as { selling_price: number } | undefined)?.selling_price ?? null,
    masterCourseCurrency: (courseData.data as { currency: string } | undefined)?.currency ?? 'INR',
  };
}
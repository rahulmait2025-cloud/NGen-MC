'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { getVariantWithItems, updateVariant } from '@/lib/services/course-variants';
import {
  ensurePaidCourseLandingMetadataForVariant,
  upsertPaidCourseLandingMetadataForVariant,
  type UpsertPaidCourseLandingInput,
} from '@/lib/services/paid-course-landing-metadata';

export async function updateVariantPaidCourseAction(
  variantId: string,
  showAsPaidCourse: boolean,
) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  try {
    await updateVariant(variantId, { show_as_paid_course: showAsPaidCourse });
    revalidatePath('/variants');
    revalidatePath(`/variants/${variantId}`);
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Update failed',
    };
  }
}

export async function getVariantPaidLandingMetadataAction(variantId: string) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  const variant = await getVariantWithItems(variantId);
  if (!variant) return { ok: false as const, error: 'Variant not found' };

  const metadata = await ensurePaidCourseLandingMetadataForVariant(variant);
  return { ok: true as const, data: metadata };
}

export async function saveVariantPaidLandingMetadataAction(
  variantId: string,
  input: UpsertPaidCourseLandingInput,
) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  const variant = await getVariantWithItems(variantId);
  if (!variant) return { ok: false as const, error: 'Variant not found' };

  const saved = await upsertPaidCourseLandingMetadataForVariant(variant, input);
  revalidatePath('/variants');
  revalidatePath(`/variants/${variantId}`);
  return { ok: true as const, data: saved };
}

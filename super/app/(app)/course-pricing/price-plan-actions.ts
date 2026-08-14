'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  createPricePlan,
  updatePricePlan,
  deactivatePricePlan,
  setDefaultPricePlan,
  deletePricePlan,
  getAllPricePlansForCourse,
  getAllPricePlansForSource,
  getAllPricePlans,
} from '@/lib/services/course-price-plans';

const pricePlanSchema = z.object({
  plan_name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  validity_days: z.number().int().positive('Validity must be positive').nullable().optional(),
  price_minor: z.number().int().min(0, 'Price must be >= 0'),
  currency: z.string().default('INR'),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  badge_label: z.string().nullable().optional(),
});

export interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function getPricePlansForSourceAction(
  sourceType: 'master_course' | 'course_variant' | 'paid_course_builder',
  sourceId: string,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    const plans = await getAllPricePlansForSource(sourceType, sourceId);
    return { ok: true, data: plans };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch price plans';
    return { ok: false, error: message };
  }
}

export async function getPricePlansForCourseAction(
  courseId: string,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    const plans = await getAllPricePlansForCourse(courseId);
    return { ok: true, data: plans };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch price plans';
    return { ok: false, error: message };
  }
}

export async function createPricePlanForSourceAction(
  sourceType: 'master_course' | 'course_variant' | 'paid_course_builder',
  sourceId: string,
  masterCourseId: string,
  input: z.infer<typeof pricePlanSchema>,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  const validated = pricePlanSchema.parse(input);

  try {
    const plan = await createPricePlan({
      master_course_id: masterCourseId,
      source_type: sourceType,
      source_id: sourceId,
      plan_name: validated.plan_name,
      description: validated.description,
      validity_days: validated.validity_days ?? null,
      price_minor: validated.price_minor,
      currency: validated.currency,
      is_active: validated.is_active,
      is_default: validated.is_default,
      sort_order: validated.sort_order,
    });

    revalidatePath('/course-pricing');
    return { ok: true, data: plan };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create price plan';
    return { ok: false, error: message };
  }
}

async function _getPricePlansForCourseAction(
  courseId: string,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    const plans = await getAllPricePlansForCourse(courseId);
    return { ok: true, data: plans };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch price plans';
    return { ok: false, error: message };
  }
}

export async function getAllPricePlansAction(): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    const plans = await getAllPricePlans();
    return { ok: true, data: plans };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch price plans';
    return { ok: false, error: message };
  }
}

export async function createPricePlanAction(
  courseId: string,
  input: z.infer<typeof pricePlanSchema>,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  const validated = pricePlanSchema.parse(input);

  try {
    const plan = await createPricePlan({
      master_course_id: courseId,
      plan_name: validated.plan_name,
      description: validated.description,
      validity_days: validated.validity_days ?? null,
      price_minor: validated.price_minor,
      currency: validated.currency,
      is_active: validated.is_active,
      is_default: validated.is_default,
      sort_order: validated.sort_order,
    });

    revalidatePath('/course-pricing');
    return { ok: true, data: plan };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create price plan';
    return { ok: false, error: message };
  }
}

export async function updatePricePlanAction(
  planId: string,
  input: Partial<z.infer<typeof pricePlanSchema>>,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  const validated = pricePlanSchema.partial().parse(input);

  try {
    const plan = await updatePricePlan(planId, validated);
    revalidatePath('/course-pricing');
    return { ok: true, data: plan };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update price plan';
    return { ok: false, error: message };
  }
}

export async function deactivatePricePlanAction(
  planId: string,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    await deactivatePricePlan(planId);
    revalidatePath('/course-pricing');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate price plan';
    return { ok: false, error: message };
  }
}

export async function setDefaultPricePlanAction(
  planId: string,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    await setDefaultPricePlan(planId);
    revalidatePath('/course-pricing');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set default plan';
    return { ok: false, error: message };
  }
}

export async function deletePricePlanAction(
  planId: string,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    await deletePricePlan(planId);
    revalidatePath('/course-pricing');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete price plan';
    return { ok: false, error: message };
  }
}

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  deactivatePricePlan,
  deletePricePlan,
  setDefaultPricePlan,
  updatePricePlan,
} from '@/lib/services/course-price-plans';
import {
  createJobReadyBootcampPricePlan,
  getJobReadyBootcampPricingOverview,
  upsertJobReadyBootcampProduct,
} from '@/lib/services/job-ready-bootcamp-admin';
import type { ActionResponse } from './price-plan-actions';

const pricePlanSchema = z.object({
  plan_name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  validity_days: z.number().int().positive('Validity must be positive').nullable().optional(),
  price_minor: z.number().int().positive('Price must be greater than 0'),
  currency: z.string().default('INR'),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export async function getJobReadyBootcampPricingOverviewAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const overview = await getJobReadyBootcampPricingOverview();
    return { ok: true, data: overview };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Job Ready Bootcamp pricing';
    return { ok: false, error: message };
  }
}

export async function createJobReadyBootcampProductAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const product = await upsertJobReadyBootcampProduct();
    revalidatePath('/course-pricing');
    return { ok: true, data: product };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Job Ready Bootcamp product';
    return { ok: false, error: message };
  }
}

export async function createJobReadyBootcampPricePlanAction(
  bootcampId: string,
  input: z.infer<typeof pricePlanSchema>,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  const validated = pricePlanSchema.parse(input);

  try {
    const plan = await createJobReadyBootcampPricePlan(bootcampId, {
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

export async function updateJobReadyBootcampPricePlanAction(
  planId: string,
  input: Partial<z.infer<typeof pricePlanSchema>>,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

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

export async function deactivateJobReadyBootcampPricePlanAction(planId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    await deactivatePricePlan(planId);
    revalidatePath('/course-pricing');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate price plan';
    return { ok: false, error: message };
  }
}

export async function setDefaultJobReadyBootcampPricePlanAction(planId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    await setDefaultPricePlan(planId);
    revalidatePath('/course-pricing');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set default plan';
    return { ok: false, error: message };
  }
}

export async function deleteJobReadyBootcampPricePlanAction(planId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    await deletePricePlan(planId);
    revalidatePath('/course-pricing');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete price plan';
    return { ok: false, error: message };
  }
}

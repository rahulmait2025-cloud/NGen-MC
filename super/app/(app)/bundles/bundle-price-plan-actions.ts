'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  createBundlePricePlan,
  updateBundlePricePlan,
  setDefaultBundlePricePlan,
  deleteBundlePricePlan,
  getAllBundlePricePlans,
  listAllBundlePricePlans,
} from '@/lib/services/bundle-price-plans';

const planSchema = z.object({
  plan_name: z.string().min(1),
  description: z.string().optional(),
  validity_days: z.number().int().positive().nullable().optional(),
  price_minor: z.number().int().min(0),
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

export async function getAllBundlePricePlansAction(): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    const plans = await listAllBundlePricePlans();
    return { ok: true, data: plans };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch plans' };
  }
}

export async function getBundlePricePlansAction(bundleId: string): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    const plans = await getAllBundlePricePlans(bundleId);
    return { ok: true, data: plans };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch plans' };
  }
}

export async function createBundlePricePlanAction(
  bundleId: string,
  input: z.infer<typeof planSchema>,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  const validated = planSchema.parse(input);

  try {
    const plan = await createBundlePricePlan({ bundle_id: bundleId, ...validated });
    revalidatePath(`/bundles/${bundleId}`);
    revalidatePath('/course-pricing');
    return { ok: true, data: plan };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to create plan' };
  }
}

export async function updateBundlePricePlanAction(
  planId: string,
  input: Partial<z.infer<typeof planSchema>>,
): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    const plan = await updateBundlePricePlan(planId, input);
    revalidatePath('/course-pricing');
    return { ok: true, data: plan };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to update plan' };
  }
}

export async function setDefaultBundlePricePlanAction(planId: string): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    const plan = await setDefaultBundlePricePlan(planId);
    revalidatePath('/course-pricing');
    return { ok: true, data: plan };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to set default' };
  }
}

export async function deleteBundlePricePlanAction(planId: string): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    await deleteBundlePricePlan(planId);
    revalidatePath('/course-pricing');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to delete plan' };
  }
}

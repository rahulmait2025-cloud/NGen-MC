import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { CoursePricePlansRow } from '@/types/database';
import type { PaidCourseSourceType } from '@/lib/services/paid-course-catalog';

export const MAX_ACTIVE_PRICE_PLANS = 3;
export const MAX_ACTIVE_PRICE_PLANS_ERROR =
  'Only 3 pricing plans are allowed. Delete an existing plan to add a new one.';

export type PaidPricePlanSourceType = PaidCourseSourceType | 'job_ready_bootcamp';

export interface CreatePricePlanInput {
  master_course_id: string | null;
  source_type?: PaidPricePlanSourceType;
  source_id?: string;
  plan_name: string;
  description?: string;
  validity_days?: number | null;
  price_minor: number;
  currency?: string;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
  badge_label?: string | null;
}

export interface UpdatePricePlanInput {
  plan_name?: string;
  description?: string;
  validity_days?: number | null;
  price_minor?: number;
  currency?: string;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
  badge_label?: string | null;
}

async function countActivePricePlansForSource(
  sourceType: string,
  sourceId: string,
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('course_price_plans')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('is_active', true);

  if (error) throw new Error(`Failed to count price plans: ${error.message}`);
  return count ?? 0;
}

async function _getActivePricePlansForCourse(
  courseId: string,
): Promise<CoursePricePlansRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_price_plans')
    .select('*')
    .eq('master_course_id', courseId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('price_minor', { ascending: true });

  if (error) throw new Error(`Failed to fetch price plans: ${error.message}`);
  return (data ?? []) as CoursePricePlansRow[];
}

export async function getAllPricePlansForSource(
  sourceType: PaidPricePlanSourceType,
  sourceId: string,
): Promise<CoursePricePlansRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_price_plans')
    .select('*')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .order('is_active', { ascending: false })
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('price_minor', { ascending: true });

  if (error) throw new Error(`Failed to fetch price plans: ${error.message}`);
  return (data ?? []) as CoursePricePlansRow[];
}

export async function getAllPricePlansForCourse(
  courseId: string,
): Promise<CoursePricePlansRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_price_plans')
    .select('*')
    .eq('master_course_id', courseId)
    .order('is_active', { ascending: false })
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('price_minor', { ascending: true });

  if (error) throw new Error(`Failed to fetch price plans: ${error.message}`);
  return (data ?? []) as CoursePricePlansRow[];
}

export async function getAllPricePlans(): Promise<CoursePricePlansRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_price_plans')
    .select('*')
    .order('master_course_id', { ascending: true })
    .order('is_active', { ascending: false })
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('price_minor', { ascending: true });

  if (error) throw new Error(`Failed to fetch price plans: ${error.message}`);
  return (data ?? []) as CoursePricePlansRow[];
}

export async function createPricePlan(
  input: CreatePricePlanInput,
): Promise<CoursePricePlansRow> {
  const admin = createAdminClient();
  const sourceType = input.source_type ?? 'master_course';
  const sourceId = input.source_id ?? input.master_course_id ?? '';
  const willBeActive = input.is_active ?? true;

  if (willBeActive) {
    const activeCount = await countActivePricePlansForSource(sourceType, sourceId);
    if (activeCount >= MAX_ACTIVE_PRICE_PLANS) {
      throw new Error(MAX_ACTIVE_PRICE_PLANS_ERROR);
    }
  }

  const isFirstPlan = (await countActivePricePlansForSource(sourceType, sourceId)) === 0;
  const isDefault = isFirstPlan ? true : input.is_default ?? false;

  // If setting as default, unset other defaults for this source
  if (isDefault) {
    await admin
      .from('course_price_plans')
      .update({ is_default: false })
      .eq('source_type', sourceType)
      .eq('source_id', sourceId);
  }

  const { data, error } = await admin
    .from('course_price_plans')
    .insert({
      master_course_id: input.master_course_id,
      source_type: sourceType,
      source_id: sourceId,
      plan_name: input.plan_name,
      description: input.description ?? null,
      validity_days: input.validity_days ?? null,
      price_minor: input.price_minor,
      currency: input.currency ?? 'INR',
      is_active: willBeActive,
      is_default: isDefault,
      sort_order: input.sort_order ?? 0,
      badge_label: input.badge_label ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create price plan: ${error.message}`);
  return data as CoursePricePlansRow;
}

export async function updatePricePlan(
  planId: string,
  input: UpdatePricePlanInput,
): Promise<CoursePricePlansRow> {
  const admin = createAdminClient();

  // If setting as default, unset other defaults for this course first
  if (input.is_default) {
    const { data: plan } = await admin
      .from('course_price_plans')
      .select('master_course_id, source_type, source_id')
      .eq('id', planId)
      .single();

    if (plan) {
      const row = plan as { source_type?: string; source_id?: string; master_course_id: string };
      const sourceType = row.source_type ?? 'master_course';
      const sourceId = row.source_id ?? row.master_course_id;
      await admin
        .from('course_price_plans')
        .update({ is_default: false })
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .neq('id', planId);
    }
  }

  const { data, error } = await admin
    .from('course_price_plans')
    .update(input)
    .eq('id', planId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update price plan: ${error.message}`);
  return data as CoursePricePlansRow;
}

async function resolvePlanSource(plan: {
  master_course_id: string;
  source_type?: string | null;
  source_id?: string | null;
}): Promise<{ sourceType: string; sourceId: string }> {
  return {
    sourceType: plan.source_type ?? 'master_course',
    sourceId: plan.source_id ?? plan.master_course_id,
  };
}

export async function deactivatePricePlan(planId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: plan } = await admin
    .from('course_price_plans')
    .select('master_course_id, source_type, source_id, is_default')
    .eq('id', planId)
    .single();

  if (!plan) throw new Error('Price plan not found');

  await admin
    .from('course_price_plans')
    .update({ is_active: false, is_default: false })
    .eq('id', planId);

  if ((plan as { is_default: boolean }).is_default) {
    const { sourceType, sourceId } = await resolvePlanSource(plan as { master_course_id: string; source_type?: string; source_id?: string });
    const { data: otherPlan } = await admin
      .from('course_price_plans')
      .select('id')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (otherPlan) {
      await admin
        .from('course_price_plans')
        .update({ is_default: true })
        .eq('id', (otherPlan as { id: string }).id);
    }
  }
}

export async function setDefaultPricePlan(planId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: plan } = await admin
    .from('course_price_plans')
    .select('master_course_id, source_type, source_id')
    .eq('id', planId)
    .single();

  if (!plan) throw new Error('Price plan not found');

  const { sourceType, sourceId } = await resolvePlanSource(plan as { master_course_id: string; source_type?: string; source_id?: string });

  await Promise.all([
    admin
      .from('course_price_plans')
      .update({ is_default: false })
      .eq('source_type', sourceType)
      .eq('source_id', sourceId),
    admin
      .from('course_price_plans')
      .update({ is_default: true })
      .eq('id', planId),
  ]);
}

export async function deletePricePlan(planId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: plan } = await admin
    .from('course_price_plans')
    .select('master_course_id, source_type, source_id, is_default')
    .eq('id', planId)
    .single();

  if (!plan) throw new Error('Price plan not found');

  await admin.from('course_price_plans').delete().eq('id', planId);

  if ((plan as { is_default: boolean }).is_default) {
    const { sourceType, sourceId } = await resolvePlanSource(plan as { master_course_id: string; source_type?: string; source_id?: string });
    const { data: otherPlan } = await admin
      .from('course_price_plans')
      .select('id')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (otherPlan) {
      await admin
        .from('course_price_plans')
        .update({ is_default: true })
        .eq('id', (otherPlan as { id: string }).id);
    }
  }
}

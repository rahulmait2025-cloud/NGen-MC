import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { PaidCourseSourceType } from '@/lib/services/paid-course-catalog';

export type PricePlanSourceType = PaidCourseSourceType | 'job_ready_bootcamp';

export interface CoursePricePlanInfo {
  id: string;
  plan_name: string;
  description: string | null;
  validity_days: number | null;
  price_minor: number;
  currency: string;
  is_default: boolean;
  sort_order: number;
  badge_label?: string | null;
}

/** Active price plans for any paid course source (master, variant, builder). */
export async function getActivePricePlansForSource(
  sourceType: PricePlanSourceType,
  sourceId: string,
): Promise<CoursePricePlanInfo[]> {
  const sb = createAdminClient();

  const { data, error } = await sb.rpc('get_active_price_plans_for_source', {
    p_source_type: sourceType,
    p_source_id: sourceId,
  });

  if (!error && sourceType !== 'master_course' && sourceType !== 'paid_course_builder') {
    return (data as CoursePricePlanInfo[]) ?? [];
  }

  if (!error) {
    const { data: legacy, error: legacyError } = await sb
      .from('course_price_plans')
      .select('id, plan_name, description, validity_days, price_minor, currency, is_default, sort_order, metadata')
      .eq('master_course_id', sourceId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (legacyError && process.env.NODE_ENV !== 'production') {
      console.warn('[course-price-plans] legacy master_course_id lookup failed:', {
        sourceType,
        sourceId,
        message: legacyError.message,
        code: legacyError.code,
        details: legacyError.details,
      });
    }

    const byId = new Map<string, CoursePricePlanInfo>();
    for (const plan of [...((data as CoursePricePlanInfo[]) ?? []), ...((legacy as CoursePricePlanInfo[]) ?? [])]) {
      byId.set(plan.id, plan);
    }
    return Array.from(byId.values()).sort((a, b) => a.sort_order - b.sort_order);
  }

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[course-price-plans] get_active_price_plans_for_source failed:', {
        sourceType,
        sourceId,
        message: error.message,
        code: error.code,
        details: error.details,
      });
    }

    const sourceQuery = sb
      .from('course_price_plans')
      .select('id, plan_name, description, validity_days, price_minor, currency, is_default, sort_order, metadata')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const legacyQuery = sourceType === 'master_course' || sourceType === 'paid_course_builder'
      ? sb
          .from('course_price_plans')
          .select('id, plan_name, description, validity_days, price_minor, currency, is_default, sort_order, metadata')
          .eq('master_course_id', sourceId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null });

    const [sourceResult, legacyResult] = await Promise.all([sourceQuery, legacyQuery]);

    if (process.env.NODE_ENV !== 'production') {
      if (sourceResult.error) {
        console.warn('[course-price-plans] source fallback failed:', {
          sourceType,
          sourceId,
          message: sourceResult.error.message,
          code: sourceResult.error.code,
          details: sourceResult.error.details,
        });
      }
      if (legacyResult.error) {
        console.warn('[course-price-plans] legacy fallback failed:', {
          sourceType,
          sourceId,
          message: legacyResult.error.message,
          code: legacyResult.error.code,
          details: legacyResult.error.details,
        });
      }
    }

    const byId = new Map<string, CoursePricePlanInfo>();
    for (const plan of [...(sourceResult.data ?? []), ...(legacyResult.data ?? [])] as CoursePricePlanInfo[]) {
      byId.set(plan.id, plan);
    }
    return Array.from(byId.values()).sort((a, b) => a.sort_order - b.sort_order);
  }

  return [];
}

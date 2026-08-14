import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';

export type PlacementStatus = 'not_ready' | 'needs_improvement' | 'interview_ready' | 'placed';

export interface PlacementProfileRow {
  id: string;
  student_id: string;
  college_id: string;
  status: PlacementStatus;
  skills_json: unknown;
  projects_json: unknown;
  linkedin_url: string | null;
  github_url: string | null;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export interface PlacementReadinessFunnelRow {
  college_id: string;
  not_ready_count: number;
  needs_improvement_count: number;
  interview_ready_count: number;
  placed_count: number;
  total_profiles: number;
}

async function getPlacementReadinessFunnelCached(collegeId: string): Promise<PlacementReadinessFunnelRow | null> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag('placement-funnel');
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('v_placement_readiness_funnel')
    .select('college_id, not_ready_count, needs_improvement_count, interview_ready_count, placed_count, total_profiles')
    .eq('college_id', collegeId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PlacementReadinessFunnelRow;
}

/** Get readiness funnel for dashboard. */
export async function getPlacementReadinessFunnel(collegeId: string): Promise<PlacementReadinessFunnelRow | null> {
  return getPlacementReadinessFunnelCached(collegeId);
}

async function getPlacementPendingReviewsCountCached(collegeId: string): Promise<number> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag('placement-reviews');
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('v_placement_pending_reviews')
    .select('pending_resume, pending_linkedin, pending_github')
    .eq('college_id', collegeId);
  let count = 0;
  for (const row of data ?? []) {
    const r = row as { pending_resume?: number; pending_linkedin?: number; pending_github?: number };
    count += (r.pending_resume ?? 0) + (r.pending_linkedin ?? 0) + (r.pending_github ?? 0);
  }
  return count;
}

/** Get pending reviews count (resume, linkedin, github). */
export async function getPlacementPendingReviewsCount(collegeId: string): Promise<number> {
  return getPlacementPendingReviewsCountCached(collegeId);
}

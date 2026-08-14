import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAsset } from '../tpstreams/assets';
import { reconcileTpFolders } from './tpstreams-sync';

export interface TpstreamsForceDeleteImpact {
  assetId: string;
  title: string;
  type: 'pillar_folder' | 'course_folder' | 'module_folder' | 'video_asset' | 'orphan_folder' | 'unknown';
  linkedPillarCount: number;
  linkedCourseCount: number;
  linkedModuleCount: number;
  linkedVideoCount: number;
  activeB2bAssignmentCount: number;
  b2cPaidHistoryCount: number;
  canForceDelete: boolean;
  blockedReason?: string;
}

/**
 * Calculate the impact of force-deleting a TPStreams asset.
 */
export async function getTpstreamsForceDeleteImpact(
  tpAssetId: string
): Promise<TpstreamsForceDeleteImpact> {
  const supabase = createAdminClient();
  
  // 1. Fetch asset details from TPStreams
  let tpAsset;
  try {
    tpAsset = await getAsset(tpAssetId);
  } catch {
    return {
      assetId: tpAssetId,
      title: 'Unknown',
      type: 'unknown',
      linkedPillarCount: 0,
      linkedCourseCount: 0,
      linkedModuleCount: 0,
      linkedVideoCount: 0,
      activeB2bAssignmentCount: 0,
      b2cPaidHistoryCount: 0,
      canForceDelete: false,
      blockedReason: 'Asset not found in TPStreams or API error.',
    };
  }

  // 2. Query DB for linked entities
  const [
    { count: pillarCount },
    { count: courseCount },
    { count: moduleCount },
    { data: linkedVideos },
  ] = await Promise.all([
    supabase.from('master_course_pillars').select('*', { count: 'exact', head: true }).eq('tp_folder_uuid', tpAssetId),
    supabase.from('master_courses').select('*', { count: 'exact', head: true }).eq('tp_folder_uuid', tpAssetId),
    supabase.from('master_course_modules').select('*', { count: 'exact', head: true }).eq('tp_folder_uuid', tpAssetId),
    supabase.from('video_assets').select('id, master_course_module_id').or(`tp_folder_uuid.eq.${tpAssetId},tp_asset_id.eq.${tpAssetId}`),
  ]);

  const linkedVideoCount = linkedVideos?.length || 0;

  // 3. Check for B2B assignments and B2C history if it's a course/pillar
  let activeB2bAssignmentCount = 0;
  let b2cPaidHistoryCount = 0;

  // For B2B assignments, we need to find courses linked to this folder or under a linked pillar
  const courseIds: string[] = [];
  
  if (courseCount && courseCount > 0) {
    const { data: courses } = await supabase.from('master_courses').select('id').eq('tp_folder_uuid', tpAssetId);
    if (courses) courseIds.push(...courses.map(c => c.id));
  }
  
  if (pillarCount && pillarCount > 0) {
    const { data: pillars } = await supabase.from('master_course_pillars').select('id').eq('tp_folder_uuid', tpAssetId);
    if (pillars && pillars.length > 0) {
      const { data: pillarCourses } = await supabase.from('master_courses').select('id').in('pillar_id', pillars.map(p => p.id));
      if (pillarCourses) courseIds.push(...pillarCourses.map(c => c.id));
    }
  }

  if (courseIds.length > 0) {
    const [
      { count: b2bCount },
      { count: b2cCount }
    ] = await Promise.all([
      supabase.from('content_assignments').select('*', { count: 'exact', head: true })
        .eq('assigned_entity_type', 'master_course')
        .in('assigned_entity_id', courseIds)
        .eq('status', 'active'),
      supabase.from('student_payment_history').select('*', { count: 'exact', head: true })
        .eq('entity_type', 'master_course')
        .in('entity_id', courseIds)
    ]);
    activeB2bAssignmentCount = b2bCount || 0;
    b2cPaidHistoryCount = b2cCount || 0;
  }

  // 4. Determine type
  let type: TpstreamsForceDeleteImpact['type'] = 'unknown';
  if (pillarCount && pillarCount > 0) type = 'pillar_folder';
  else if (courseCount && courseCount > 0) type = 'course_folder';
  else if (moduleCount && moduleCount > 0) type = 'module_folder';
  else if (tpAsset.type === 'video') type = 'video_asset';
  else {
    // Check if it's a known orphan folder from sync
    const { folders: allFolders } = await reconcileTpFolders();
    const orphan = allFolders.find(f => f.classification === 'orphan' && f.tp_folder_uuid === tpAssetId);
    if (orphan) type = 'orphan_folder';
  }

  // 5. Apply safety rules
  let canForceDelete = true;
  let blockedReason: string | undefined;

  // Rule: Block root folder (no parent_id)
  if (!tpAsset.parent_id) {
    // Exception: Pillar folders have no parent in TPStreams (they are at root)
    if (type !== 'pillar_folder' && type !== 'orphan_folder') {
      canForceDelete = false;
      blockedReason = 'This folder is at the root level and is not a recognized Pillar or Orphan folder. Force delete is blocked for safety.';
    }
  }

  // Rule: Block if unknown and not orphan
  if (type === 'unknown') {
    canForceDelete = false;
    blockedReason = 'This asset is not managed by Avesh and is not a recognized orphan folder. Force delete is blocked.';
  }

  return {
    assetId: tpAssetId,
    title: tpAsset.title || 'Untitled',
    type,
    linkedPillarCount: pillarCount || 0,
    linkedCourseCount: courseCount || 0,
    linkedModuleCount: moduleCount || 0,
    linkedVideoCount: linkedVideoCount,
    activeB2bAssignmentCount,
    b2cPaidHistoryCount,
    canForceDelete,
    blockedReason,
  };
}

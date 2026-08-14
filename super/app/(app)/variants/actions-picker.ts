'use server';

/**
 * Server actions for variant content picker data fetching.
 * Read-only queries to power the variant item selection UI.
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PickerModule, PickerItem } from '@/lib/types/proposal-picker';
import type { MasterCoursePublishStatus } from '@/types/database';

export async function fetchCourseContentForPicker(
  masterCourseId: string,
): Promise<{ modules: PickerModule[] } | { error: string }> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  try {
    const sb = createAdminClient();

    const [{ data: modules, error: modErr }, { data: items, error: itemErr }] = await Promise.all([
      sb.from('master_course_modules')
        .select('id, title, sort_order, publish_status')
        .eq('master_course_id', masterCourseId)
        .order('sort_order', { ascending: true }),
      sb.from('master_course_items')
        .select('id, title, item_type, sort_order, duration_seconds, publish_status, video_asset_id, module_id')
        .eq('master_course_id', masterCourseId)
        .order('sort_order', { ascending: true }),
    ]);

    if (modErr) return { error: modErr.message };
    if (itemErr) return { error: itemErr.message };

    const videoAssetIds = (items ?? []).reduce<string[]>((acc, i) => {
      if (i.video_asset_id) acc.push(i.video_asset_id);
      return acc;
    }, []);

    const videoMap = new Map<string, { processing_status: string; tp_asset_id: string }>();
    if (videoAssetIds.length > 0) {
      const { data: videos } = await sb
        .from('video_assets')
        .select('id, processing_status, tp_asset_id')
        .in('id', videoAssetIds);

      for (const v of videos ?? []) {
        videoMap.set(v.id, { processing_status: v.processing_status, tp_asset_id: v.tp_asset_id });
      }
    }

    const pickerModules: PickerModule[] = (modules ?? []).map((mod) => ({
      id: mod.id,
      title: mod.title,
      sort_order: mod.sort_order,
      publish_status: mod.publish_status as MasterCoursePublishStatus,
      items: (items ?? []).reduce<PickerItem[]>((acc, i) => {
        if (i.module_id === mod.id) {
          const va = i.video_asset_id ? videoMap.get(i.video_asset_id) : null;
          acc.push({
            id: i.id,
            title: i.title,
            item_type: i.item_type,
            sort_order: i.sort_order,
            duration_seconds: i.duration_seconds,
            publish_status: i.publish_status as MasterCoursePublishStatus,
            video_asset_id: i.video_asset_id,
            video_status: va?.processing_status ?? null,
            tp_asset_id: va?.tp_asset_id ?? null,
          });
        }
        return acc;
      }, []),
    }));

    return { modules: pickerModules };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

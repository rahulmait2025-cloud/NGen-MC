import type { MasterCourseModulesRow, MasterCourseItemsRow } from '@/types/database';

export interface PickerModule extends Pick<MasterCourseModulesRow, 'id' | 'title' | 'sort_order' | 'publish_status'> {
  items: PickerItem[];
}

export interface PickerItem extends Pick<MasterCourseItemsRow, 'id' | 'title' | 'item_type' | 'sort_order' | 'duration_seconds' | 'publish_status'> {
  video_asset_id: string | null;
  video_status: string | null;
  tp_asset_id: string | null;
}

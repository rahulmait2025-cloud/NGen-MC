import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TeamPageSettingsRow } from './types';

const SETTINGS_SELECT =
  'id,hero_title,hero_description,hero_annotation,hero_image_path,hero_image_alt_text,created_at,updated_at,created_by,updated_by';

export async function getTeamPageSettings(): Promise<TeamPageSettingsRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('team_page_settings')
    .select(SETTINGS_SELECT)
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as TeamPageSettingsRow | null) ?? null;
}

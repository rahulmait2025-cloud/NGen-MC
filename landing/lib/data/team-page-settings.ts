import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

const TEAM_PHOTO_BUCKET = 'team-members';

export type PublicTeamPageSettings = {
  heroTitle: string;
  heroDescription: string;
  heroAnnotation: string | null;
  heroImageUrl: string | null;
  heroImageAltText: string | null;
};

export const DEFAULT_TEAM_PAGE_SETTINGS: PublicTeamPageSettings = {
  heroTitle: 'Meet the humans behind the tabs.',
  heroDescription:
    'We build careers, fix bugs, reply to students, and pretend that 47 open tabs is completely normal.',
  heroAnnotation: 'Someone is probably deploying right now.',
  heroImageUrl: null,
  heroImageAltText: 'The NextGen CTO team',
};

type TeamPageSettingsRow = {
  hero_title: string | null;
  hero_description: string | null;
  hero_annotation: string | null;
  hero_image_path: string | null;
  hero_image_alt_text: string | null;
};

const SETTINGS_SELECT =
  'hero_title,hero_description,hero_annotation,hero_image_path,hero_image_alt_text';

function getSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveHeroImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const encodedPath = imagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${supabaseUrl}/storage/v1/object/public/${TEAM_PHOTO_BUCKET}/${encodedPath}`;
}

export const getPublicTeamPageSettings = cache(
  async function getPublicTeamPageSettings(): Promise<PublicTeamPageSettings> {
    try {
      const supabase = getSupabasePublicClient();
      const { data, error } = await supabase
        .from('team_page_settings')
        .select(SETTINGS_SELECT)
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('[team-page-settings] Failed to load settings:', error.message);
        return DEFAULT_TEAM_PAGE_SETTINGS;
      }

      const row = data as TeamPageSettingsRow | null;
      if (!row) return DEFAULT_TEAM_PAGE_SETTINGS;

      return {
        heroTitle: row.hero_title?.trim() || DEFAULT_TEAM_PAGE_SETTINGS.heroTitle,
        heroDescription:
          row.hero_description?.trim() || DEFAULT_TEAM_PAGE_SETTINGS.heroDescription,
        heroAnnotation: row.hero_annotation?.trim() || null,
        heroImageUrl: resolveHeroImageUrl(row.hero_image_path),
        heroImageAltText:
          row.hero_image_alt_text?.trim() || DEFAULT_TEAM_PAGE_SETTINGS.heroImageAltText,
      };
    } catch (e) {
      console.error(
        '[team-page-settings] Unexpected error loading settings:',
        e instanceof Error ? e.message : e,
      );
      return DEFAULT_TEAM_PAGE_SETTINGS;
    }
  },
);

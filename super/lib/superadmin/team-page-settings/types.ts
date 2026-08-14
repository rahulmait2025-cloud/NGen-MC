import 'server-only';

export type TeamPageSettingsRow = {
  id: number;
  hero_title: string;
  hero_description: string;
  hero_annotation: string | null;
  hero_image_path: string | null;
  hero_image_alt_text: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type TeamPageSettingsInput = {
  hero_title: string;
  hero_description: string;
  hero_annotation: string | null;
  hero_image_alt_text: string | null;
};

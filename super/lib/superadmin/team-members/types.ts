import 'server-only';

export type TeamMemberRow = {
  id: string;
  name: string;
  slug: string;
  role: string;
  short_role: string | null;
  short_bio: string | null;
  full_bio: string | null;
  photo_path: string | null;
  photo_alt_text: string | null;
  email: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  personal_website_url: string | null;
  location: string | null;
  is_founder: boolean;
  is_featured: boolean;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type TeamMemberListItem = Pick<
  TeamMemberRow,
  | 'id'
  | 'name'
  | 'slug'
  | 'role'
  | 'short_role'
  | 'photo_path'
  | 'photo_alt_text'
  | 'is_founder'
  | 'is_featured'
  | 'is_published'
  | 'display_order'
  | 'updated_at'
>;

export type TeamMemberInput = {
  name: string;
  role: string;
  short_role: string | null;
  short_bio: string | null;
  full_bio: string | null;
  photo_alt_text: string | null;
  email: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  personal_website_url: string | null;
  location: string | null;
  is_founder: boolean;
  is_featured: boolean;
  is_published: boolean;
  display_order: number;
};

export type TeamMemberSummary = {
  total: number;
  published: number;
  draft: number;
  featured: number;
};

export type TeamListFilters = {
  search?: string;
  published?: 'all' | 'published' | 'draft';
  featured?: 'all' | 'featured' | 'not_featured';
};

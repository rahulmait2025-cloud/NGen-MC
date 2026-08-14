import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

const TEAM_PHOTO_BUCKET = 'team-members';

export type PublicTeamMember = {
  id: string;
  name: string;
  slug: string;
  role: string;
  shortRole: string | null;
  shortBio: string | null;
  fullBio: string | null;
  photoUrl: string | null;
  photoAltText: string | null;
  location: string | null;
  email: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  personalWebsiteUrl: string | null;
  isFounder: boolean;
  isFeatured: boolean;
  displayOrder: number;
};

type TeamMemberRow = {
  id: string;
  name: string;
  slug: string;
  role: string;
  short_role: string | null;
  short_bio: string | null;
  full_bio: string | null;
  photo_path: string | null;
  photo_alt_text: string | null;
  location: string | null;
  email: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  personal_website_url: string | null;
  is_founder: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
};

const PUBLIC_SELECT =
  'id,name,slug,role,short_role,short_bio,full_bio,photo_path,photo_alt_text,location,email,linkedin_url,twitter_url,github_url,instagram_url,youtube_url,personal_website_url,is_founder,is_featured,display_order,created_at';

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

function resolveTeamPhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const encodedPath = photoPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${supabaseUrl}/storage/v1/object/public/${TEAM_PHOTO_BUCKET}/${encodedPath}`;
}

function mapTeamMember(row: TeamMemberRow): PublicTeamMember {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    role: row.role,
    shortRole: row.short_role,
    shortBio: row.short_bio,
    fullBio: row.full_bio,
    photoUrl: resolveTeamPhotoUrl(row.photo_path),
    photoAltText: row.photo_alt_text,
    location: row.location,
    email: row.email,
    linkedinUrl: row.linkedin_url,
    twitterUrl: row.twitter_url,
    githubUrl: row.github_url,
    instagramUrl: row.instagram_url,
    youtubeUrl: row.youtube_url,
    personalWebsiteUrl: row.personal_website_url,
    isFounder: row.is_founder,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
  };
}

export const getPublishedTeamMembers = cache(async function getPublishedTeamMembers(): Promise<PublicTeamMember[]> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('team_members')
    .select(PUBLIC_SELECT)
    .eq('is_published', true)
    .order('is_founder', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[team-members] Failed to load published members:', error.message);
    throw error;
  }

  return (data as TeamMemberRow[] | null)?.map(mapTeamMember) ?? [];
});

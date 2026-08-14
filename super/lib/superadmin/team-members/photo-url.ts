const TEAM_PHOTO_BUCKET = 'team-members';

export function getTeamMemberPhotoPublicUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const encodedPath = photoPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${supabaseUrl}/storage/v1/object/public/${TEAM_PHOTO_BUCKET}/${encodedPath}`;
}

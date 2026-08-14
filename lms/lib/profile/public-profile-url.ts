export function buildPublicProfilePath(username: string): string {
  const normalizedUsername = username.trim().toLowerCase();
  return `/u/${encodeURIComponent(normalizedUsername)}`;
}

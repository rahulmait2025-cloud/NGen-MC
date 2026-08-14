import { redirect } from 'next/navigation';
import { buildActivityAdminBasePath } from '@/lib/college-admin/activity/activity-section-links';

export default async function ActivityLeaderboardRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ collegeSlug }, sp] = await Promise.all([params, searchParams]);
  const base = `${buildActivityAdminBasePath(collegeSlug)}/activity/video`;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  redirect(query ? `${base}?${query}` : base);
}

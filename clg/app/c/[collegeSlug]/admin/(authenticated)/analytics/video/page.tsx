import { redirect } from 'next/navigation';

export default async function LegacyVideoAnalyticsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ collegeSlug }, sp] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') {
      query.set(key, value);
    }
  }
  const qs = query.toString();
  const base = `/c/${encodeURIComponent(collegeSlug)}/admin/activity/video`;
  redirect(qs ? `${base}?${qs}` : base);
}

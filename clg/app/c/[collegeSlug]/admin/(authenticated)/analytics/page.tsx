import { redirect } from 'next/navigation';

export default async function LegacyAnalyticsRedirect({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  redirect(`/c/${encodeURIComponent(collegeSlug)}/admin/activity/performance`);
}

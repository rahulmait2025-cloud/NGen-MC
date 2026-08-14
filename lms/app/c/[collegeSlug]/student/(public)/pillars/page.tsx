import { redirect } from 'next/navigation';

/** Legacy listing URL — pillar tracks open from the sidebar sub-links. */
export default async function PillarsIndexPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  redirect(`/c/${collegeSlug}/student`);
}

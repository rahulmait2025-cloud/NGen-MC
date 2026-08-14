import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getMetadataBaseUrl } from '@/lib/metadata/app-url';
import { getPublishedTeamMembers } from '@/lib/data/team-members';
import {
  DEFAULT_TEAM_PAGE_SETTINGS,
  getPublicTeamPageSettings,
  type PublicTeamPageSettings,
} from '@/lib/data/team-page-settings';
import { TeamPageContent } from '@/components/team/team-page-content';
import { TeamPageErrorState } from '@/components/team/team-page-empty-state';

function buildTeamLinks(collegeSlug: string) {
  const base = `/c/${collegeSlug}/student`;
  return {
    primary: { href: `${base}/courses`, label: 'Explore NextGen CTO' },
    secondary: { href: `${base}/bootcamp`, label: 'See Our Programs' },
    emptyExplore: { href: `${base}/courses`, label: 'Explore NextGen CTO' },
  };
}

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title: 'Meet the Team | NextGen CTO',
  description:
    "Meet the people building NextGen CTO's practical learning, mentorship, and career-readiness platform for students.",
  alternates: {
    canonical: '/our-team',
  },
  openGraph: {
    title: 'Meet the Team | NextGen CTO',
    description:
      "Meet the people building NextGen CTO's practical learning, mentorship, and career-readiness platform for students.",
    url: '/our-team',
    siteName: 'NextGen CTO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meet the Team | NextGen CTO',
    description:
      "Meet the people building NextGen CTO's practical learning, mentorship, and career-readiness platform for students.",
  },
};

function TeamPageFallback() {
  return (
    <div className="px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-12 max-w-3xl rounded bg-muted" />
        <div className="h-24 max-w-2xl rounded bg-muted" />
      </div>
    </div>
  );
}

export default async function OurTeamPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;

  return (
    <Suspense fallback={<TeamPageFallback />}>
      <OurTeamPageBoundary collegeSlug={collegeSlug} />
    </Suspense>
  );
}

async function OurTeamPageBoundary({ collegeSlug }: { collegeSlug: string }) {
  let members: Awaited<ReturnType<typeof getPublishedTeamMembers>> = [];
  let settings: PublicTeamPageSettings = DEFAULT_TEAM_PAGE_SETTINGS;
  let loadError = false;

  try {
    const [membersResult, settingsResult] = await Promise.all([
      getPublishedTeamMembers(),
      getPublicTeamPageSettings(),
    ]);
    members = membersResult;
    settings = settingsResult;
  } catch {
    loadError = true;
  }

  if (loadError) {
    return <TeamPageErrorState />;
  }

  return (
    <TeamPageContent
      members={members}
      settings={settings}
      links={buildTeamLinks(collegeSlug)}
    />
  );
}

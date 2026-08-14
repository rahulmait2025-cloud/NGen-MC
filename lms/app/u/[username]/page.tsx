import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProfileForRender } from '@/lib/services/public-student-coding-profile';
import { buildAbsolutePublicProfileUrl } from '@/lib/profile/public-profile-url.server';
import { getMetadataBaseUrl } from '@/lib/metadata/app-url';
import { PublicCodingProfile } from '@/components/public-coding-profile/public-coding-profile';
import { CodingPlatform } from '@/types/student-stats';

type PublicProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{
    year?: string | string[];
    platform?: string | string[];
  }>;
};

function resolveRequestedYear(
  rawYear: string | string[] | undefined,
): number | undefined {
  const value = Array.isArray(rawYear) ? rawYear[0] : rawYear;

  if (!value || !/^\d{4}$/.test(value)) {
    return undefined;
  }

  const parsedYear = Number(value);

  if (
    !Number.isInteger(parsedYear) ||
    parsedYear < 2000 ||
    parsedYear > 2100
  ) {
    return undefined;
  }

  return parsedYear;
}

function resolveRequestedPlatform(
  rawPlatform: string | string[] | undefined,
): CodingPlatform | 'combined' {
  const value = Array.isArray(rawPlatform) ? rawPlatform[0] : rawPlatform;
  const validPlatforms = ['combined', 'github', 'leetcode', 'codeforces', 'gfg'];
  if (value && validPlatforms.includes(value)) {
    return value as CodingPlatform | 'combined';
  }
  return 'combined';
}

export async function generateMetadata({
  params,
  searchParams,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedYear = resolveRequestedYear(resolvedSearchParams.year);
  const selectedPlatform = resolveRequestedPlatform(resolvedSearchParams.platform);

  const profile = await getPublicProfileForRender(username, selectedYear, selectedPlatform);

  if (!profile) {
    return {
      title: 'Coding Profile Not Found | NextGen CTO Student Portal',
      description: 'The requested coding profile could not be found.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalUrl = buildAbsolutePublicProfileUrl(profile.username);
  const title = `${profile.studentName} (@${profile.username}) | NextGen CTO Student Portal`;
  const description = `View ${profile.studentName}'s coding activity, platform profiles and public coding portfolio on NextGen CTO.`;
  const ogImageUrl = new URL(
    '/og/nextgen-cto-student-portal-v2.png',
    getMetadataBaseUrl(),
  ).toString();

  return {
    metadataBase: new URL(getMetadataBaseUrl()),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: canonicalUrl,
      siteName: 'NextGen CTO',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${profile.studentName}'s coding profile`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

async function PublicProfileContent({
  params,
  searchParams,
}: PublicProfilePageProps) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedYear = resolveRequestedYear(resolvedSearchParams.year);
  const selectedPlatform = resolveRequestedPlatform(resolvedSearchParams.platform);

  const profile = await getPublicProfileForRender(username, selectedYear, selectedPlatform);

  if (!profile) {
    notFound();
  }

  return (
    <PublicCodingProfile
      profile={profile}
    />
  );
}

function PublicProfileSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-44 w-full rounded-3xl bg-card border border-border/80" />
      <div className="h-10 w-64 rounded-2xl bg-card border border-border/80" />
      <div className="h-64 w-full rounded-3xl bg-card border border-border/80" />
    </div>
  );
}

export default function PublicProfilePage({
  params,
  searchParams,
}: PublicProfilePageProps) {
  return (
    <Suspense fallback={<PublicProfileSkeleton />}>
      <PublicProfileContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

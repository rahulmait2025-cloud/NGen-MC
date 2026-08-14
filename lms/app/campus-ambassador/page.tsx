import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getVerifiedIdentity } from '@/lib/student-runtime/identity';
import { resolveLoginRouteContext } from '@/lib/auth/login-route-context';
import { getCampusAmbassadorPageState } from '@/lib/services/campus-ambassador';
import { CampusAmbassadorPage } from '@/components/campus-ambassador/campus-ambassador-page';
import { CampusAmbassadorPageSkeleton } from '@/components/campus-ambassador/campus-ambassador-page-skeleton';
import { ReferralCapture } from '@/components/campus-ambassador/referral-capture';
import { getCampusAmbassadorAppBaseUrl, CAMPUS_AMBASSADOR_OG_IMAGE_PATH } from '@/lib/campus-ambassador/share';

export const metadata: Metadata = {
  metadataBase: new URL(getCampusAmbassadorAppBaseUrl()),
  title: 'Campus Ambassador Program | NextGen CTO',
  description:
    'Become a NextGen CTO Campus Ambassador. Lead your campus, build your brand, help students become placement-ready, and unlock rewards, recognition, goodies, and internship opportunities.',
  openGraph: {
    title: 'Become a Campus Ambassador | NextGen CTO',
    description:
      'Lead your campus. Build your brand. Unlock rewards with NextGen CTO.',
    url: '/campus-ambassador',
    siteName: 'NextGen CTO',
    images: [
      {
        url: CAMPUS_AMBASSADOR_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: 'NextGen CTO Campus Ambassador Program',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Become a Campus Ambassador | NextGen CTO',
    description:
      'Represent NextGen CTO, help your campus become career-ready, and unlock rewards, goodies, recognition, and internship opportunities.',
    images: [CAMPUS_AMBASSADOR_OG_IMAGE_PATH],
  },
};

async function resolveFooterCollegeSlug(userId?: string): Promise<string> {
  if (!userId) return 'direct-learners';
  try {
    const context = await resolveLoginRouteContext(userId);
    return context?.student_college_slug ?? 'direct-learners';
  } catch {
    return 'direct-learners';
  }
}

export default function CampusAmbassadorRoutePage() {
  return (
    <div className="h-[100dvh] overflow-hidden">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <Suspense fallback={<CampusAmbassadorPageSkeleton />}>
        <CampusAmbassadorDataBoundary />
      </Suspense>
    </div>
  );
}

async function CampusAmbassadorDataBoundary() {
  const identity = await getVerifiedIdentity();
  const rawUserId = identity?.userId;
  const userIdForComponent = rawUserId ?? null;

  const [state, collegeSlug] = await Promise.all([
    getCampusAmbassadorPageState(rawUserId),
    resolveFooterCollegeSlug(rawUserId),
  ]);

  if (state.isAmbassador) {
    redirect(`/c/${collegeSlug}/student/dashboard/campus-ambassador`);
  }

  return (
    <CampusAmbassadorPage
      initialState={state}
      userEmail={identity?.email ?? null}
      userId={userIdForComponent}
      userFullName={identity?.fullName ?? null}
      collegeSlug={collegeSlug}
    />
  );
}

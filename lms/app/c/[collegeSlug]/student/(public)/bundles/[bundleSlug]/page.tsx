import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { loadBundleLandingData } from '@/lib/services/student-bundles';
import {
  isCareerReadinessBundle,
  resolveCareerReadinessBundleHref,
  buildBundleLearnHref,
} from '@/lib/utils/bundle-routes';
import { createAdminClient } from '@/lib/supabase/admin';
import { Button } from '@/components/ui/button';
import { PremiumBundleLandingClient } from './_components/premium-bundle-landing-client';
import { BundleCheckoutSection } from './_components/bundle-checkout-section';

async function findBundleIdentity(bundleSlugOrId: string) {
  const sb = createAdminClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(bundleSlugOrId);
  let query = sb
    .from('course_bundles')
    .select('id, slug, title, code, publish_status, lifecycle_status')
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active');
  query = isUuid ? query.eq('id', bundleSlugOrId) : query.eq('slug', bundleSlugOrId);
  const { data } = await query.maybeSingle();
  return data;
}

export default async function BundleLandingPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; bundleSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, bundleSlug } = await params;
  const [ctx, identity] = await Promise.all([
    getOptionalStudentContext(collegeSlug),
    findBundleIdentity(bundleSlug),
  ]);
  if (!identity) {
    notFound();
  }

  if (isCareerReadinessBundle(identity)) {
    redirect(resolveCareerReadinessBundleHref(collegeSlug));
  }

  const studentId = ctx?.studentId ?? null;
  const isGlobal = ctx?.isGlobal ?? ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());
  const collegeId = ctx?.tenant?.id ?? null;

  const data = await loadBundleLandingData(
    collegeSlug,
    bundleSlug,
    studentId,
    isGlobal ? null : collegeId,
  );

  if (!data) {
    notFound();
  }

  if (data.access.entitled || data.access.assigned) {
    redirect(buildBundleLearnHref(collegeSlug, data.bundle.slug));
  }

  const enrollmentSlot = (() => {
    if (data.access.purchasable || data.access.isFree) {
      return (
        <BundleCheckoutSection
          collegeSlug={collegeSlug}
          bundleSlug={data.bundle.slug}
          bundleTitle={data.bundle.title}
          priceMinor={data.bundle.priceMinor ?? 0}
          pricePlanId={data.bundle.pricePlanId}
          currency={data.bundle.currency}
          plans={data.bundle.pricePlans}
          isFree={data.access.isFree}
          showPrice={false}
          accessExpired={data.access.accessExpired}
        />
      );
    }

    return (
      <Button type="button" variant="secondary" className="h-14 w-full rounded-xl font-bold text-lg" disabled>
        Enrollment Unavailable
      </Button>
    );
  })();

  const finalCtaSlot = (() => {
    if ((data.access.purchasable || data.access.isFree)) {
      return (
        <BundleCheckoutSection
          collegeSlug={collegeSlug}
          bundleSlug={data.bundle.slug}
          bundleTitle={data.bundle.title}
          priceMinor={data.bundle.priceMinor ?? 0}
          pricePlanId={data.bundle.pricePlanId}
          currency={data.bundle.currency}
          plans={data.bundle.pricePlans}
          isFree={data.access.isFree}
          showPrice={true}
          accessExpired={data.access.accessExpired}
          buttonLabel={data.access.isFree ? 'Enroll Free' : 'Enroll In Bundle Now'}
          className="w-full max-w-3xl mx-auto"
        />
      );
    }
    return (
      <Button type="button" size="lg" variant="outline" className="h-14 rounded-xl px-12 font-bold text-lg landing-muted border-[color-mix(in_oklab,var(--landing-border)_70%,transparent)]" disabled>
        Enrollment Unavailable
      </Button>
    );
  })();

  return (
    <PremiumBundleLandingClient
      collegeSlug={collegeSlug}
      data={data}
      enrollmentSlot={enrollmentSlot}
      finalCtaSlot={finalCtaSlot}
    />
  );
}

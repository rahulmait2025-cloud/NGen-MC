import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listMasterCourses } from '@/lib/services/master-courses';
import { listVariants } from '@/lib/services/course-variants';
import { buildPricableProducts } from '@/lib/services/pricable-products';
import { getJobReadyBootcampPricingOverview } from '@/lib/services/job-ready-bootcamp-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { PricingPageClient } from './pricing-page-client';
import type { CourseBundlesRow } from '@/types/database';

export default async function CoursePricingPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const [courses, variantsResult, bundlesResult, bootcampPricing] = await Promise.all([
    listMasterCourses(),
    listVariants(),
    createAdminClient()
      .from('course_bundles')
      .select(
        'id, title, slug, code, description, publish_status, lifecycle_status, pricing_model, selling_price, updated_at',
      )
      .order('title', { ascending: true }),
    getJobReadyBootcampPricingOverview(),
  ]);

  const initialBundles = (bundlesResult.data ?? []) as CourseBundlesRow[];
  const pricableProducts = buildPricableProducts(
    courses,
    variantsResult.map((variant) => ({
      id: variant.id,
      title: variant.title,
      code: variant.code,
      master_course_id: variant.master_course_id,
      publish_status: variant.publish_status,
      show_as_paid_course: variant.show_as_paid_course,
    })),
  );

  return (
    <div className="animate-in fade-in duration-300">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-sm text-muted-foreground animate-pulse">Loading pricing data...</div>
        </div>
      }>
        <PricingPageClient
          initialProducts={pricableProducts}
          initialBundles={initialBundles}
          initialBootcampProduct={bootcampPricing.product}
          initialBootcampPlans={bootcampPricing.plans}
        />
      </Suspense>
    </div>
  );
}

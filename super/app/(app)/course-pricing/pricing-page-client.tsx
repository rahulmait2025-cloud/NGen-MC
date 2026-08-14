'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoursePricingClient } from './course-pricing-client';
import { BundlePricingClient } from './bundle-pricing-client';
import { JobReadyBootcampPricingClient } from './job-ready-bootcamp-pricing-client';
import type { CourseBundlesRow, BootcampsRow, CoursePricePlansRow } from '@/types/database';
import type { PricableProductRow } from '@/lib/services/pricable-products';

interface Props {
  initialProducts: PricableProductRow[];
  initialBundles: CourseBundlesRow[];
  initialBootcampProduct?: BootcampsRow | null;
  initialBootcampPlans?: CoursePricePlansRow[];
}

const EMPTY_PLANS: never[] = [];

export function PricingPageClient({
  initialProducts,
  initialBundles,
  initialBootcampProduct = null,
  initialBootcampPlans = EMPTY_PLANS,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Course & Bundle Pricing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage price plans for LMS course checkout, bundle checkout, and Job Ready Bootcamp.
        </p>
      </div>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="bundles">Bundles</TabsTrigger>
          <TabsTrigger value="job-ready-bootcamp">Job Ready Bootcamp</TabsTrigger>
        </TabsList>
        <TabsContent value="courses" className="mt-6">
          <CoursePricingClient initialProducts={initialProducts} />
        </TabsContent>
        <TabsContent value="bundles" className="mt-6">
          <BundlePricingClient initialBundles={initialBundles} />
        </TabsContent>
        <TabsContent value="job-ready-bootcamp" className="mt-6">
          <JobReadyBootcampPricingClient
            initialProduct={initialBootcampProduct}
            initialPlans={initialBootcampPlans}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

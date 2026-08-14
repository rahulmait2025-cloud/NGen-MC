import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { BootcampsRow, CoursePricePlansRow } from '@/types/database';
import {
  createPricePlan,
  getAllPricePlansForSource,
  type CreatePricePlanInput,
} from '@/lib/services/course-price-plans';
import {
  JOB_READY_BOOTCAMP_SLUG,
  JOB_READY_BOOTCAMP_TITLE,
} from '@/lib/constants/job-ready-bootcamp';


export interface JobReadyBootcampPricingOverview {
  product: BootcampsRow | null;
  plans: CoursePricePlansRow[];
}

async function getJobReadyBootcampProductForPricing(): Promise<BootcampsRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bootcamps')
    .select('*')
    .eq('slug', JOB_READY_BOOTCAMP_SLUG)
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch Job Ready Bootcamp product: ${error.message}`);
  }

  return (data as BootcampsRow | null) ?? null;
}

export async function getJobReadyBootcampPricingOverview(): Promise<JobReadyBootcampPricingOverview> {
  const product = await getJobReadyBootcampProductForPricing();
  if (!product) {
    return { product: null, plans: [] };
  }

  const plans = await getAllPricePlansForSource('job_ready_bootcamp', product.id);
  return { product, plans };
}

export async function upsertJobReadyBootcampProduct(): Promise<BootcampsRow> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('bootcamps')
    .select('*')
    .eq('slug', JOB_READY_BOOTCAMP_SLUG)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await admin
      .from('bootcamps')
      .update({
        title: JOB_READY_BOOTCAMP_TITLE,
        publish_status: 'published',
        lifecycle_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as BootcampsRow).id)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update Job Ready Bootcamp product: ${error?.message ?? 'No data'}`);
    }

    return updated as BootcampsRow;
  }

  const { data: created, error } = await admin
    .from('bootcamps')
    .insert({
      code: 'JRB-001',
      slug: JOB_READY_BOOTCAMP_SLUG,
      title: JOB_READY_BOOTCAMP_TITLE,
      description:
        'Complete career-readiness program across pillars configured in Super Admin Master Courses.',
      short_description: 'Six-pillar program to become job ready.',
      publish_status: 'published',
      lifecycle_status: 'active',
      sort_order: 0,
    })
    .select('*')
    .single();

  if (error || !created) {
    throw new Error(`Failed to create Job Ready Bootcamp product: ${error?.message ?? 'No data'}`);
  }

  return created as BootcampsRow;
}

export async function createJobReadyBootcampPricePlan(
  bootcampId: string,
  input: Omit<CreatePricePlanInput, 'master_course_id' | 'source_type' | 'source_id'>,
): Promise<CoursePricePlansRow> {
  return createPricePlan({
    master_course_id: null,
    source_type: 'job_ready_bootcamp',
    source_id: bootcampId,
    ...input,
  });
}

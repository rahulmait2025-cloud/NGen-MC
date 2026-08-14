import 'server-only';

import { cache } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAssignmentActive } from '@/lib/services/access-helpers';
import { listStudentContentEntitlements } from '@/lib/services/course-access-manager';
import { resolveBundleCourseEntries, resolveBundleCourseEntriesBatch } from '@/lib/services/bundle-resolver';
import {
  resolveBundlePricing,
  type BundlePricePlansRow,
  type BundlePricingSummary,
} from '@/lib/services/bundle-price-plans';
import { batchCourseProgress } from '@/lib/services/batch-course-progress';
import { buildBundleHref, buildBundleLearnHref } from '@/lib/utils/bundle-routes';
import { isCareerReadinessBundle } from '@/lib/utils/bundle-routes';
import { normUuid } from '@/lib/utils';
import type { ContentAssignmentsRow, CourseBundlesRow } from '@/types/database';

type BundleAssignmentRow = Pick<
  ContentAssignmentsRow,
  'id' | 'assigned_entity_id' | 'status' | 'start_date' | 'end_date' | 'created_at'
>;

export type PurchasedBundleSourceLabel =
  | 'Purchased Bundle'
  | 'Free Bundle'
  | 'College Assigned Bundle';

export interface PurchasedBundleConnectedCourse {
  courseId: string;
  title: string;
  sequence: number;
}

export interface StudentPurchasedBundle {
  id: string;
  entitlementId: string | null;
  slug: string;
  title: string;
  cardTitle: string;
  description: string;
  badgeLabel: string;
  accessLabel: 'Premium' | 'Free' | 'Assigned';
  sourceLabel: PurchasedBundleSourceLabel;
  sourceType: string;
  validUntil: string | null;
  enrolledAt: string;
  courseCount: number;
  progressPercentage: number;
  continueHref: string;
  detailHref: string;
  connectedCourses: PurchasedBundleConnectedCourse[];
}

const BUNDLE_SELECT =
  'id, title, slug, code, description, publish_status, lifecycle_status, pricing_model, selling_price, landing_card_title, landing_card_description, landing_badge_label';

function resolveBundleSourceLabel(
  sourceType: string,
  metadata: Record<string, unknown>,
  fromAssignment: boolean,
): PurchasedBundleSourceLabel {
  if (fromAssignment) return 'College Assigned Bundle';
  if (
    metadata.enrollment_type === 'free'
    || metadata.source === 'free_bundle_enrollment'
    || sourceType === 'free_enrollment'
  ) {
    return 'Free Bundle';
  }
  return 'Purchased Bundle';
}

function resolveBundleAccessLabel(
  sourceLabel: PurchasedBundleSourceLabel,
  isFree: boolean,
): StudentPurchasedBundle['accessLabel'] {
  if (sourceLabel === 'College Assigned Bundle') return 'Assigned';
  if (isFree) return 'Free';
  return 'Premium';
}

async function loadBundleRow(bundleId: string): Promise<CourseBundlesRow | null> {
  const sb = createAdminClient();
  const { data } = await sb.from('course_bundles').select(BUNDLE_SELECT).eq('id', bundleId).maybeSingle();
  return (data as CourseBundlesRow | null) ?? null;
}

async function _buildPurchasedBundleCard(
  bundleId: string,
  options: {
    entitlementId: string | null;
    sourceType: string;
    metadata: Record<string, unknown>;
    validUntil: string | null;
    enrolledAt: string;
    fromAssignment: boolean;
    collegeSlug: string;
    studentId: string;
  },
): Promise<StudentPurchasedBundle | null> {
  const bundle = await loadBundleRow(bundleId);
  if (!bundle || isCareerReadinessBundle(bundle)) return null;
  if (bundle.publish_status !== 'published' || bundle.lifecycle_status !== 'active') return null;

  const [entries, pricing, sourceLabel] = await Promise.all([
    resolveBundleCourseEntries(bundleId),
    resolveBundlePricing(bundle.id, bundle.pricing_model, bundle.selling_price),
    resolveBundleSourceLabel(options.sourceType, options.metadata, options.fromAssignment),
  ]);

  const courseIds = entries.map((e) => e.courseId);
  let progressPercentage = 0;
  if (courseIds.length > 0) {
    const progressMap = await batchCourseProgress(options.studentId, courseIds);
    let completed = 0;
    let total = 0;
    for (const courseId of courseIds) {
      const p = progressMap.get(courseId);
      if (!p) continue;
      completed += p.completed;
      total += p.total;
    }
    progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  const plainDescription =
    bundle.landing_card_description?.trim()
    || (typeof bundle.description === 'string' && !bundle.description.trim().startsWith('{')
      ? bundle.description
      : 'Your guided learning bundle path.');

  const continueHref = buildBundleLearnHref(options.collegeSlug, bundle.slug);

  return {
    id: bundle.id,
    entitlementId: options.entitlementId,
    slug: bundle.slug,
    title: bundle.title,
    cardTitle: bundle.landing_card_title?.trim() || bundle.title,
    description: plainDescription,
    badgeLabel: bundle.landing_badge_label?.trim() || (pricing.isFree ? 'Free' : 'Premium'),
    accessLabel: resolveBundleAccessLabel(sourceLabel, pricing.isFree),
    sourceLabel,
    sourceType: options.sourceType,
    validUntil: options.validUntil,
    enrolledAt: options.enrolledAt,
    courseCount: entries.length,
    progressPercentage,
    continueHref,
    detailHref: buildBundleHref(options.collegeSlug, bundle.slug),
    connectedCourses: entries.map((e) => ({
      courseId: e.courseId,
      title: e.title,
      sequence: e.sequence,
    })),
  };
}

async function _listStudentPurchasedBundlesInner(
  collegeSlug: string,
  studentId: string,
  collegeId: string | null,
): Promise<StudentPurchasedBundle[]> {
  'use cache';
  cacheLife('weeks');
  cacheTag('entitlements', `student-my-courses-${studentId}`, `student-purchases:${studentId}`);

  const sb = createAdminClient();
  const seenBundleIds = new Set<string>();

  const entitlements = (await listStudentContentEntitlements(studentId)).filter(
    (e) => e.assigned_entity_type === 'bundle',
  );

  const uniqueEntitlements = entitlements.filter((entitlement) => {
    const bundleId = normUuid(entitlement.assigned_entity_id);
    if (seenBundleIds.has(bundleId)) return false;
    seenBundleIds.add(bundleId);
    return true;
  });

  const activeAssignments: BundleAssignmentRow[] = [];
  if (collegeId) {
    const { data: assignments } = await sb
      .from('content_assignments')
      .select('id, assigned_entity_id, status, start_date, end_date, created_at')
      .eq('assignment_type', 'college')
      .eq('target_id', collegeId)
      .eq('assigned_entity_type', 'bundle')
      .eq('status', 'active');

    for (const assignment of assignments ?? []) {
      if (!isAssignmentActive(assignment)) continue;
      const bundleId = normUuid(assignment.assigned_entity_id as string);
      if (seenBundleIds.has(bundleId)) continue;
      seenBundleIds.add(bundleId);
      activeAssignments.push(assignment);
    }
  }

  const allBundleIds = Array.from(seenBundleIds);
  if (allBundleIds.length === 0) return [];

  // Batch fetch bundles
  const { data: bundlesData } = await sb
    .from('course_bundles')
    .select(BUNDLE_SELECT)
    .in('id', allBundleIds);

  const bundlesMap = new Map((bundlesData ?? []).map((b) => [b.id as string, b]));

  // Batch fetch plans
  const { data: plansData } = await sb
    .from('bundle_price_plans')
    .select('id, bundle_id, plan_name, description, validity_days, price_minor, currency, is_default, is_active, sort_order, badge_label, created_at, updated_at')
    .in('bundle_id', allBundleIds)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('price_minor', { ascending: true });

  const plansByBundleId = new Map<string, BundlePricePlansRow[]>();
  for (const plan of (plansData ?? []) as BundlePricePlansRow[]) {
    const bid = plan.bundle_id;
    if (!plansByBundleId.has(bid)) plansByBundleId.set(bid, []);
    plansByBundleId.get(bid)!.push(plan);
  }

  // Batch fetch course entries (eliminates N+1 per-bundle DB calls)
  const bundleEntriesMap = await resolveBundleCourseEntriesBatch(allBundleIds);

  // Fetch course progress in a single batch
  const allCourseIds = Array.from(new Set(allBundleIds.flatMap((bid) => (bundleEntriesMap.get(bid) ?? []).map((e) => e.courseId))));
  const progressMap = allCourseIds.length > 0
    ? await batchCourseProgress(studentId, allCourseIds)
    : new Map();

  const results: StudentPurchasedBundle[] = [];

  const compileCard = async (
    bundleId: string,
    options: {
      entitlementId: string | null;
      sourceType: string;
      metadata: Record<string, unknown>;
      validUntil: string | null;
      enrolledAt: string;
      fromAssignment: boolean;
    }
  ): Promise<StudentPurchasedBundle | null> => {
    const bundle = bundlesMap.get(bundleId);
    if (!bundle || isCareerReadinessBundle(bundle)) return null;
    if (bundle.publish_status !== 'published' || bundle.lifecycle_status !== 'active') return null;

    const entries = bundleEntriesMap.get(bundleId) ?? [];
    const plans = plansByBundleId.get(bundleId) ?? [];

    const defaultPlan = plans.find((p) => p.is_default) ?? plans[0];
    let pricing: BundlePricingSummary;
    if (defaultPlan) {
      const isFree = defaultPlan.price_minor <= 0 || bundle.pricing_model === 'free';
      pricing = {
        priceMinor: defaultPlan.price_minor,
        currency: defaultPlan.currency,
        pricePlanId: defaultPlan.id,
        validityDays: defaultPlan.validity_days,
        isFree,
        isPurchasable: !isFree,
        plans,
      };
    } else {
      const isFree =
        bundle.pricing_model === 'free' || bundle.selling_price === 0 || bundle.selling_price == null;
      pricing = {
        priceMinor: bundle.selling_price,
        currency: 'INR',
        pricePlanId: null,
        validityDays: null,
        isFree,
        isPurchasable: !isFree && !!(bundle.selling_price && bundle.selling_price > 0),
        plans: [],
      };
    }

    const sourceLabel = resolveBundleSourceLabel(options.sourceType, options.metadata, options.fromAssignment);
    const courseIds = entries.map((e) => e.courseId);
    let progressPercentage = 0;
    if (courseIds.length > 0) {
      let completed = 0;
      let total = 0;
      for (const courseId of courseIds) {
        const p = progressMap.get(courseId);
        if (!p) continue;
        completed += p.completed;
        total += p.total;
      }
      progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    const plainDescription =
      bundle.landing_card_description?.trim() ||
      (typeof bundle.description === 'string' && !bundle.description.trim().startsWith('{')
        ? bundle.description
        : 'Your guided learning bundle path.');

    const continueHref = buildBundleLearnHref(collegeSlug, bundle.slug);

    return {
      id: bundle.id,
      entitlementId: options.entitlementId,
      slug: bundle.slug,
      title: bundle.title,
      cardTitle: bundle.landing_card_title?.trim() || bundle.title,
      description: plainDescription,
      badgeLabel: bundle.landing_badge_label?.trim() || (pricing.isFree ? 'Free' : 'Premium'),
      accessLabel: resolveBundleAccessLabel(sourceLabel, pricing.isFree),
      sourceLabel,
      sourceType: options.sourceType,
      validUntil: options.validUntil,
      enrolledAt: options.enrolledAt,
      courseCount: entries.length,
      progressPercentage,
      continueHref,
      detailHref: buildBundleHref(collegeSlug, bundle.slug),
      connectedCourses: entries.map((e) => ({
        courseId: e.courseId,
        title: e.title,
        sequence: e.sequence,
      })),
    };
  };

  // Compile entitlements in parallel
  const entitlementCards = await Promise.all(
    uniqueEntitlements.map(async (entitlement) => {
      const bundleId = normUuid(entitlement.assigned_entity_id);
      return compileCard(bundleId, {
        entitlementId: entitlement.id,
        sourceType: entitlement.source_type,
        metadata: entitlement.metadata ?? {},
        validUntil: entitlement.valid_until,
        enrolledAt: entitlement.valid_from || entitlement.created_at,
        fromAssignment: false,
      });
    })
  );

  for (const card of entitlementCards) {
    if (card) results.push(card);
  }

  // Compile assignments in parallel
  const assignmentCards = await Promise.all(
    activeAssignments.map(async (assignment) => {
      const bundleId = normUuid(assignment.assigned_entity_id);
      return compileCard(bundleId, {
        entitlementId: null,
        sourceType: 'college_assignment',
        metadata: {},
        validUntil: assignment.end_date,
        enrolledAt: assignment.start_date || assignment.created_at,
        fromAssignment: true,
      });
    })
  );

  for (const card of assignmentCards) {
    if (card) results.push(card);
  }

  return results.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}

export const listStudentPurchasedBundles = cache(async function listStudentPurchasedBundles(
  collegeSlug: string,
  studentId: string,
  collegeId: string | null,
): Promise<StudentPurchasedBundle[]> {
  return _listStudentPurchasedBundlesInner(collegeSlug, studentId, collegeId);
});

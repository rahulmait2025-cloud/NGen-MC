import 'server-only';

import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildCampusAmbassadorShare,
  getCampusAmbassadorDiscountLabel,
  type CampusAmbassadorSharePayload,
} from '@/lib/campus-ambassador/share';
import { mapCouponAnalyticsToCanonicalReferralMetrics } from '@/lib/campus-ambassador/canonical-referral-metrics';
import {
  isActiveCampusAmbassador,
  resolveCampusAmbassadorSubmitOutcome,
  type CampusAmbassadorSubmitOutcome,
} from '@/lib/campus-ambassador/reapply';
import { resolvePurchasedContentDisplay } from '@/lib/commerce/purchased-content-display';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CampusAmbassadorApplicationRecord {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp_number: string | null;
  college_id: string | null;
  college_name: string;
  degree: string | null;
  branch: string | null;
  year_of_study: string | null;
  city: string | null;
  state: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  github_url: string | null;
  current_communities: string | null;
  campus_reach: string | null;
  expected_referrals: number | null;
  why_join: string;
  how_will_promote: string | null;
  tshirt_size: string | null;
  consent_given: boolean;
  status: string;
  created_at: string;
}

export interface CampusAmbassadorRecord {
  id: string;
  user_id: string;
  application_id: string;
  coupon_id: string | null;
  status: string;
  joined_at: string;
  access_enabled: boolean;
  total_generated_minor?: number;
  total_paid_minor?: number;
}

export interface CampusAmbassadorCouponRecord {
  id: string;
  code: string;
  status: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  coupon_origin?: string;
  owner_user_id?: string | null;
  ambassador_id?: string | null;
}

export interface CampusAmbassadorAnalytics {
  referralCount: number;
  paidReferralCount: number;
  revenueGeneratedMinor: number;
  totalDiscountGivenMinor: number;
  progressTarget: number;
  progressPercent: number;
  nextMilestoneLabel: string;
}

export type CampusAmbassadorShare = CampusAmbassadorSharePayload;

export interface CampusAmbassadorPageState {
  isAuthenticated: boolean;
  hasApplication: boolean;
  isAmbassador: boolean;
  application: CampusAmbassadorApplicationRecord | null;
  ambassador: CampusAmbassadorRecord | null;
  coupon: CampusAmbassadorCouponRecord | null;
  analytics: CampusAmbassadorAnalytics | null;
  share: CampusAmbassadorShare | null;
}

export interface SubmitCampusAmbassadorApplicationInput {
  fullName: string;
  email: string;
  phone?: string;
  whatsappNumber?: string;
  collegeId?: string | null;
  collegeName: string;
  degree?: string;
  branch?: string;
  yearOfStudy?: string;
  city?: string;
  state?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  githubUrl?: string;
  currentCommunities?: string;
  campusReach?: string;
  expectedReferrals?: number | null;
  whyJoin: string;
  howWillPromote?: string;
  tshirtSize?: string;
  consentGiven: boolean;
}

import {
  MILESTONES,
  getMilestoneFor as getMilestoneForShared,
  getNextMilestone as getNextMilestoneShared,
} from '@/lib/campus-ambassador/milestones';

export { MILESTONES, type MilestoneView, type MilestoneState } from '@/lib/campus-ambassador/milestones';
export const getMilestoneFor = getMilestoneForShared;
export const getNextMilestone = getNextMilestoneShared;

function sanitizeText(value: string | undefined | null, maxLen = 2000): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : null;
}

function computeMilestoneProgress(paidReferrals: number): Pick<
  CampusAmbassadorAnalytics,
  'progressTarget' | 'progressPercent' | 'nextMilestoneLabel'
> {
  const next = MILESTONES.find((m) => paidReferrals < m.target) ?? MILESTONES[MILESTONES.length - 1];
  const prevTarget =
    MILESTONES.filter((m) => m.target < next.target).at(-1)?.target ?? 0;
  const span = Math.max(next.target - prevTarget, 1);
  const progressInSpan = Math.max(paidReferrals - prevTarget, 0);
  const progressPercent = Math.min(100, Math.round((progressInSpan / span) * 100));

  return {
    progressTarget: next.target,
    progressPercent,
    nextMilestoneLabel: next.label,
  };
}

export async function getCurrentUserCampusAmbassadorAnalytics(
  userId: string,
  couponId?: string | null,
): Promise<Omit<CampusAmbassadorAnalytics, 'progressTarget' | 'progressPercent' | 'nextMilestoneLabel'> & {
  progressTarget: number;
  progressPercent: number;
  nextMilestoneLabel: string;
}> {
  const admin = createAdminClient();

  if (!couponId) {
    const milestone = computeMilestoneProgress(0);
    return {
      referralCount: 0,
      paidReferralCount: 0,
      revenueGeneratedMinor: 0,
      totalDiscountGivenMinor: 0,
      ...milestone,
    };
  }

  const { data: stats, error } = await admin
    .from('campus_ambassador_coupon_analytics')
    .select('total_uses, paid_uses, net_revenue_minor, total_discount_minor, gross_revenue_minor')
    .eq('coupon_id', couponId)
    .maybeSingle();

  if (error) {
    console.error('[campus-ambassador] analytics fetch failed:', error);
    const milestone = computeMilestoneProgress(0);
    return {
      referralCount: 0,
      paidReferralCount: 0,
      revenueGeneratedMinor: 0,
      totalDiscountGivenMinor: 0,
      ...milestone,
    };
  }

  const canonical = mapCouponAnalyticsToCanonicalReferralMetrics(stats);
  const referralCount = canonical.totalReferrals;
  const paidReferralCount = canonical.paidReferrals;
  const revenueGeneratedMinor = canonical.netRevenueMinor;
  const totalDiscountGivenMinor = canonical.totalDiscountMinor;

  const milestone = computeMilestoneProgress(paidReferralCount);

  return {
    referralCount,
    paidReferralCount,
    revenueGeneratedMinor,
    totalDiscountGivenMinor,
    ...milestone,
  };
}

function buildShare(
  couponCode: string,
  ambassadorName?: string | null,
  discountLabel?: string | null,
): CampusAmbassadorShare {
  return buildCampusAmbassadorShare({
    couponCode,
    ambassadorName,
    discountLabel,
  });
}

type AdminClient = ReturnType<typeof createAdminClient>;

function assertDbOk(
  error: { message: string; code?: string; details?: string } | null,
  step: string,
): void {
  if (!error) return;
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Campus Ambassador] ${step}`, {
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }
  throw new Error(`${step}: ${error.message}`);
}

async function fetchCouponById(
  admin: AdminClient,
  couponId: string,
): Promise<CampusAmbassadorCouponRecord | null> {
  const { data, error } = await admin
    .from('coupons')
    .select('id, code, status, discount_type, discount_value, coupon_origin, owner_user_id, ambassador_id')
    .eq('id', couponId)
    .maybeSingle();
  assertDbOk(error, 'load coupon');
  return (data as CampusAmbassadorCouponRecord | null) ?? null;
}

async function fetchLatestApplicationForUser(
  admin: AdminClient,
  userId: string,
): Promise<CampusAmbassadorApplicationRecord | null> {
  const { data, error } = await admin
    .from('campus_ambassador_applications')
    .select('id, user_id, full_name, email, phone, whatsapp_number, college_id, college_name, degree, branch, year_of_study, city, state, linkedin_url, instagram_url, github_url, current_communities, campus_reach, expected_referrals, why_join, how_will_promote, tshirt_size, consent_given, status, reviewed_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  assertDbOk(error, 'load application');
  return (data as CampusAmbassadorApplicationRecord | null) ?? null;
}

async function fetchAmbassadorRowForUser(
  admin: AdminClient,
  userId: string,
): Promise<CampusAmbassadorRecord | null> {
  // Prefer an active/paused row. Multiple historical removed rows are allowed
  // (partial unique index on active only), so never use bare maybeSingle().
  const { data: activeRows, error: activeError } = await admin
    .from('campus_ambassadors')
    .select('id, user_id, application_id, coupon_id, status, joined_at, access_enabled')
    .eq('user_id', userId)
    .in('status', ['active', 'paused'])
    .order('joined_at', { ascending: false })
    .limit(1);
  assertDbOk(activeError, 'load active ambassador');
  if (activeRows?.[0]) {
    return activeRows[0] as CampusAmbassadorRecord;
  }

  const { data: latestRows, error: latestError } = await admin
    .from('campus_ambassadors')
    .select('id, user_id, application_id, coupon_id, status, joined_at, access_enabled')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);
  assertDbOk(latestError, 'load ambassador');
  return (latestRows?.[0] as CampusAmbassadorRecord | undefined) ?? null;
}

function buildPageStateFromRecords(
  application: CampusAmbassadorApplicationRecord | null,
  ambassador: CampusAmbassadorRecord | null,
  coupon: CampusAmbassadorCouponRecord | null,
  analytics: CampusAmbassadorAnalytics | null,
): CampusAmbassadorPageState {
  const isAmbassador = isActiveCampusAmbassador({
    status: ambassador?.status,
    accessEnabled: ambassador?.access_enabled,
  });

  return {
    isAuthenticated: true,
    hasApplication: !!application,
    isAmbassador,
    application,
    ambassador,
    coupon,
    analytics,
    share:
      coupon?.code && isAmbassador
        ? buildShare(
            coupon.code,
            application?.full_name,
            getCampusAmbassadorDiscountLabel(coupon),
          )
        : null,
  };
}

export async function getCampusAmbassadorPageStateForUser(
  userId: string,
): Promise<CampusAmbassadorPageState> {
  const admin = createAdminClient();

  const ambassador = await fetchAmbassadorRowForUser(admin, userId);
  const activeAmbassador = isActiveCampusAmbassador({
    status: ambassador?.status,
    accessEnabled: ambassador?.access_enabled,
  })
    ? ambassador
    : null;

  // For removed ambassadors, prefer the latest application row so a fresh
  // reapplication (submitted) is not shadowed by the old linked approved app.
  const [application, coupon] = await Promise.all([
    activeAmbassador?.application_id
      ? (
          (
            await admin
              .from('campus_ambassador_applications')
              .select('id, user_id, full_name, email, phone, whatsapp_number, college_id, college_name, degree, branch, year_of_study, city, state, linkedin_url, instagram_url, github_url, current_communities, campus_reach, expected_referrals, why_join, how_will_promote, tshirt_size, consent_given, status, reviewed_at, created_at')
              .eq('id', activeAmbassador.application_id)
              .maybeSingle()
          )
        ).data as CampusAmbassadorApplicationRecord | null
      : fetchLatestApplicationForUser(admin, userId),
    activeAmbassador?.coupon_id
      ? fetchCouponById(admin, activeAmbassador.coupon_id)
      : null,
  ]);

  const analytics =
    activeAmbassador && coupon
      ? await getCurrentUserCampusAmbassadorAnalytics(userId, coupon.id)
      : null;

  return buildPageStateFromRecords(application, activeAmbassador, coupon, analytics);
}

export async function getCampusAmbassadorPageState(
  userId?: string,
): Promise<CampusAmbassadorPageState> {
  if (!userId) {
    return {
      isAuthenticated: false,
      hasApplication: false,
      isAmbassador: false,
      application: null,
      ambassador: null,
      coupon: null,
      analytics: null,
      share: null,
    };
  }

  return getCampusAmbassadorPageStateForUser(userId);
}

export type SubmitCampusAmbassadorApplicationResult = {
  state: CampusAmbassadorPageState;
  outcome: CampusAmbassadorSubmitOutcome;
};

/**
 * Submit a Campus Ambassador application for Super Admin review.
 * Does NOT auto-approve, create ambassador rows, or issue coupons.
 *
 * After Super Admin removal, the linked application often remains `approved`.
 * Reapplication resets that inactive row to a fresh `submitted` application.
 */
export async function submitCampusAmbassadorApplicationForUser(
  userId: string,
  input: SubmitCampusAmbassadorApplicationInput,
): Promise<SubmitCampusAmbassadorApplicationResult> {
  const admin = createAdminClient();

  const fullName = sanitizeText(input.fullName, 120);
  const email = sanitizeText(input.email, 200);
  const collegeName = sanitizeText(input.collegeName, 200);
  const whyJoin = sanitizeText(input.whyJoin, 2000);
  const phone = sanitizeText(input.phone, 30);
  const whatsapp = sanitizeText(input.whatsappNumber, 30);

  if (!fullName || !email || !collegeName || !whyJoin) {
    throw new Error('Please complete all required fields.');
  }
  if (!phone && !whatsapp) {
    throw new Error('Please provide a phone or WhatsApp number.');
  }
  if (!input.consentGiven) {
    throw new Error('You must agree to the program terms to join.');
  }

  const existingAmbassador = await fetchAmbassadorRowForUser(admin, userId);
  const existingApplication = await fetchLatestApplicationForUser(admin, userId);
  const outcome = resolveCampusAmbassadorSubmitOutcome({
    ambassadorStatus: existingAmbassador?.status,
    accessEnabled: existingAmbassador?.access_enabled,
    applicationStatus: existingApplication?.status,
  });

  if (outcome === 'already_ambassador') {
    return {
      state: await getCampusAmbassadorPageStateForUser(userId),
      outcome,
    };
  }

  if (outcome === 'already_pending') {
    return {
      state: await getCampusAmbassadorPageStateForUser(userId),
      outcome,
    };
  }

  const nowIso = new Date().toISOString();
  const payload = {
    user_id: userId,
    full_name: fullName,
    email,
    phone,
    whatsapp_number: whatsapp,
    college_id: input.collegeId ?? null,
    college_name: collegeName,
    degree: sanitizeText(input.degree, 120),
    branch: sanitizeText(input.branch, 120),
    year_of_study: sanitizeText(input.yearOfStudy, 60),
    city: sanitizeText(input.city, 120),
    state: sanitizeText(input.state, 120),
    linkedin_url: sanitizeText(input.linkedinUrl, 500),
    instagram_url: sanitizeText(input.instagramUrl, 500),
    github_url: sanitizeText(input.githubUrl, 500),
    current_communities: sanitizeText(input.currentCommunities, 1000),
    campus_reach: sanitizeText(input.campusReach, 1000),
    expected_referrals:
      typeof input.expectedReferrals === 'number' && input.expectedReferrals >= 0
        ? input.expectedReferrals
        : null,
    why_join: whyJoin,
    how_will_promote: sanitizeText(input.howWillPromote, 2000),
    tshirt_size: sanitizeText(input.tshirtSize, 20),
    consent_given: true,
    status: 'submitted',
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    // Fresh submission timestamp for Super Admin pending ordering.
    created_at: nowIso,
  };

  if (outcome === 'reapply' && existingApplication) {
    const { error } = await admin
      .from('campus_ambassador_applications')
      .update(payload)
      .eq('id', existingApplication.id);
    assertDbOk(error, 'resubmit application');
  } else {
    const { error } = await admin.from('campus_ambassador_applications').insert(payload);
    if (error?.code === '23505') {
      throw new Error(
        'Could not create a new Campus Ambassador application because an existing record conflicts. Please try again or contact support.',
      );
    }
    assertDbOk(error, 'create application');
  }

  return {
    state: await getCampusAmbassadorPageStateForUser(userId),
    outcome,
  };
}

/** @deprecated Use submitCampusAmbassadorApplicationForUser */
export async function submitCampusAmbassadorApplication(
  userId: string,
  input: SubmitCampusAmbassadorApplicationInput,
): Promise<CampusAmbassadorPageState> {
  const result = await submitCampusAmbassadorApplicationForUser(userId, input);
  return result.state;
}

// ─── Referral Details ───────────────────────────────────────────────────────

export interface CampusAmbassadorReferralDetail {
  usageId: string;
  purchaserName: string | null;
  purchaserEmail: string;
  entityTitle: string;
  planLabel: string | null;
  baseAmountMinor: number;
  discountAmountMinor: number;
  totalAmountMinor: number;
  orderStatus: string;
  paymentDate: string | null;
  createdAt: string;
}

async function batchResolveLiveEntityTitles(
  admin: AdminClient,
  rows: Array<{ entityType: string; entityId: string }>,
): Promise<Map<string, string>> {
  const byType = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.entityType || !row.entityId) continue;
    const set = byType.get(row.entityType) ?? new Set<string>();
    set.add(row.entityId);
    byType.set(row.entityType, set);
  }

  const titles = new Map<string, string>();
  const key = (type: string, id: string) => `${type}:${id}`;

  await Promise.all(
    [...byType.entries()].map(async ([entityType, ids]) => {
      const idList = [...ids];
      if (idList.length === 0) return;

      if (entityType === 'master_course') {
        const { data } = await admin.from('master_courses').select('id, title').in('id', idList);
        for (const row of data ?? []) {
          if (row.title) titles.set(key(entityType, row.id as string), row.title as string);
        }
        return;
      }
      if (entityType === 'course_variant') {
        const { data } = await admin.from('course_variants').select('id, title').in('id', idList);
        for (const row of data ?? []) {
          if (row.title) titles.set(key(entityType, row.id as string), row.title as string);
        }
        return;
      }
      if (entityType === 'course_bundle') {
        const { data } = await admin.from('course_bundles').select('id, title').in('id', idList);
        for (const row of data ?? []) {
          if (row.title) titles.set(key(entityType, row.id as string), row.title as string);
        }
        return;
      }
      if (entityType === 'job_ready_bootcamp') {
        const { data } = await admin.from('bootcamps').select('id, title').in('id', idList);
        for (const row of data ?? []) {
          if (row.title) titles.set(key(entityType, row.id as string), row.title as string);
        }
      }
    }),
  );

  return titles;
}

export async function getCampusAmbassadorReferralDetails(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<CampusAmbassadorReferralDetail[]> {
  const admin = createAdminClient();

  const ambassador = await fetchAmbassadorRowForUser(admin, userId);
  if (!ambassador?.coupon_id || !isActiveCampusAmbassador({
    status: ambassador.status,
    accessEnabled: ambassador.access_enabled,
  })) {
    return [];
  }

  const { data, error } = await admin.rpc('campus_ambassador_coupon_usage_details', {
    p_coupon_id: ambassador.coupon_id,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('[campus-ambassador] referral details fetch failed:', error);
    return [];
  }

  const rawRows = (data ?? []) as Array<Record<string, unknown>>;
  const orderIds = rawRows
    .map((row) => row.order_id as string | null)
    .filter((id): id is string => Boolean(id));

  const metadataByOrderId = new Map<string, Record<string, unknown>>();
  if (orderIds.length > 0) {
    const { data: orders } = await admin
      .from('orders')
      .select('id, metadata')
      .in('id', orderIds);
    for (const order of orders ?? []) {
      metadataByOrderId.set(
        order.id as string,
        ((order.metadata as Record<string, unknown> | null) ?? {}),
      );
    }
  }

  const liveTitleInputs = rawRows.map((row) => ({
    entityType: String(row.entity_type ?? ''),
    entityId: String(row.entity_id ?? ''),
  }));
  const liveTitles = await batchResolveLiveEntityTitles(admin, liveTitleInputs);

  return rawRows.map((row) => {
    const entityType = String(row.entity_type ?? '');
    const entityId = String(row.entity_id ?? '');
    const orderId = row.order_id as string | null;
    const metadata = orderId ? metadataByOrderId.get(orderId) ?? null : null;
    const display = resolvePurchasedContentDisplay({
      entityType,
      metadata,
      liveEntityTitle: liveTitles.get(`${entityType}:${entityId}`) ?? null,
    });

    return {
      usageId: row.usage_id as string,
      purchaserName: row.purchaser_name as string | null,
      purchaserEmail: row.purchaser_email as string,
      entityTitle: display.primaryTitle,
      planLabel: display.secondaryLabel,
      baseAmountMinor: row.base_amount_minor as number,
      discountAmountMinor: row.discount_amount_minor as number,
      totalAmountMinor: row.total_amount_minor as number,
      orderStatus: row.order_status as string,
      paymentDate: row.payment_date as string | null,
      createdAt: row.created_at as string,
    };
  });
}

/**
 * Cached check: is the user an active campus ambassador with access enabled?
 * Returns false for non-ambassadors. Cached for 5 minutes per user.
 * Use in layouts to avoid running this query on every page load.
 */
export async function isCampusAmbassadorCached(userId: string): Promise<boolean> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`ambassador-status-${userId}`);

  const admin = createAdminClient();
  const { data } = await admin
    .from('campus_ambassadors')
    .select('access_enabled')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return !!data && (data as { access_enabled: boolean }).access_enabled;
}

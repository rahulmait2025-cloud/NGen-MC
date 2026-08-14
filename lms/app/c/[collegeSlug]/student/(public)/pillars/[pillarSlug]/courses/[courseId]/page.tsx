import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { resolveStudentPortalBranding } from '@/lib/tenant/get-tenant-branding-server';
import { resolveCollegeAssignedCourseIds } from '@/lib/services/course-access-manager';
import { listCourseVariantsForStudentLanding } from '@/lib/services/resolved-course-scope';
import { CourseVariantExplorer } from '@/components/courses/course-variant-explorer';
import type { MasterCoursePillarsRow } from '@/types/database';
import { CoursePlanSelector } from '@/components/courses/course-plan-selector';
import {
  VariantCheckoutSection,
  VariantCheckoutUnavailable,
} from '@/components/courses/variant-checkout-section';
import { getVariantPurchaseInfo } from '@/lib/services/variant-purchase';
import { buildPillarCourseDetailHref, resolveVariantIdFromSearchParams } from '@/lib/utils/variant-learn-url';
import { resolveCourseLaunchTarget } from '@/lib/student/learning/resolve-course-launch-target';
import { normUuid } from '@/lib/utils';
import { isUuid } from '@/lib/utils/slug';
import { resolveCourseByKeyWithPaidContext, resolvePillarByKey } from '@/lib/resolvers';
import { applyMasterCourseKeyFilter } from '@/lib/utils/master-course-key';
import { getCachedCourseLandingStatic } from '@/lib/services/cached-course-landing';
import { PremiumCourseLandingClient } from './_components/premium-course-landing-client';
import { FreeEnrollmentButton } from './_components/free-enrollment-button';

const VIRTUAL_BOOTCAMP_SLUG = 'bootcamp';
const VIRTUAL_FREE_COURSES_SLUG = 'free-courses';

const VIRTUAL_BOOTCAMP_PILLAR = {
  id: '__bootcamp__',
  code: 'BOOTCAMP',
  title: 'Paid Courses',
  description: null,
  short_description: null,
  slug: 'bootcamp',
  publish_status: 'published',
  visible_to_college_students: true,
  visible_to_global_students: true,
  visible_to_college_admins: true,
  sort_order: 0,
  tp_folder_status: 'pending' as const,
  tp_folder_uuid: null,
  tp_folder_title: null,
  tp_last_synced_at: null,
  tp_last_error: null,
  metadata: {},
  created_by: null,
  created_at: '',
  updated_at: '',
} as unknown as MasterCoursePillarsRow;

const VIRTUAL_FREE_COURSES_PILLAR = {
  ...VIRTUAL_BOOTCAMP_PILLAR,
  id: '__free_courses__',
  code: 'FREE_COURSES',
  title: 'Free Courses',
  slug: VIRTUAL_FREE_COURSES_SLUG,
} as unknown as MasterCoursePillarsRow;

async function validatePillarSlugMatch(
  pillarSlug: string,
  courseId: string,
  options: { isGlobal: boolean; collegeId: string | null }
): Promise<MasterCoursePillarsRow | null> {
  if (pillarSlug === VIRTUAL_BOOTCAMP_SLUG) {
    const sb = createAdminClient();
    const { data: course } = await applyMasterCourseKeyFilter(
      sb
        .from('master_courses')
        .select('id')
        .eq('publish_status', 'published')
        .or('bootcamp_id.not.is.null,catalog_type.eq.bootcamp'),
      courseId,
    ).maybeSingle();
    return course ? VIRTUAL_BOOTCAMP_PILLAR : null;
  }

  if (pillarSlug === VIRTUAL_FREE_COURSES_SLUG) {
    const sb = createAdminClient();
    const { data: course } = await applyMasterCourseKeyFilter(
      sb
        .from('master_courses')
        .select('id')
        .eq('publish_status', 'published')
        .eq('course_kind', 'free_course'),
      courseId,
    ).maybeSingle();
    return course ? VIRTUAL_FREE_COURSES_PILLAR : null;
  }

  const sb = createAdminClient();

  const pillarQuery = sb
    .from('master_course_pillars')
    .select('id, title, description, short_description, slug, publish_status, visible_to_college_students, visible_to_global_students, sort_order, metadata, created_at, updated_at')
    .eq('slug', pillarSlug)
    .eq('publish_status', 'published');

  const { data: pillar, error: pillarError } = await pillarQuery.maybeSingle();

  if (pillarError || !pillar) {
    return null;
  }

  if (!options.isGlobal && !pillar.visible_to_college_students) {
    if (!options.collegeId) return null;
    const assignedCourseIds = await resolveCollegeAssignedCourseIds(options.collegeId);
    const resolvedCourseId = normUuid(courseId);
    const { data: resolvedRow } = await applyMasterCourseKeyFilter(
      sb.from('master_courses').select('id'),
      courseId,
    ).maybeSingle();
    const want = normUuid(resolvedRow?.id ?? resolvedCourseId);
    if (!assignedCourseIds.some((id) => normUuid(id) === want)) {
      return null;
    }
  }

  const { data: course } = await applyMasterCourseKeyFilter(
    sb
      .from('master_courses')
      .select('id')
      .eq('pillar_id', pillar.id)
      .eq('publish_status', 'published'),
    courseId,
  ).maybeSingle();

  if (!course) {
    return null;
  }

  return pillar as unknown as MasterCoursePillarsRow;
}

export default async function PillarCourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string; pillarSlug: string; courseId: string }>;
  searchParams?: Promise<{ variantId?: string; variant?: string }>;
}): Promise<ReactNode> {
  const [{ collegeSlug, pillarSlug, courseId }, sp] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({}),
  ]);
  const courseKey = courseId;
  const pillarKey = pillarSlug;
  const explicitVariantId = resolveVariantIdFromSearchParams(sp);

  // Resolve pillar, course, and optional student context in parallel
  const [ctx, resolvedPillar, resolvedCourse] = await Promise.all([
    getOptionalStudentContext(collegeSlug),
    resolvePillarByKey(pillarKey),
    resolveCourseByKeyWithPaidContext(courseKey, { explicitVariantId }),
  ]);

  let isGlobal = false;
  let studentId: string | null = null;
  let collegeId: string | null = null;

  if (ctx) {
    isGlobal = ctx.isGlobal;
    studentId = ctx.studentId;
    collegeId = ctx.isGlobal ? null : ctx.tenant.id;
  } else {
    isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());
    if (!isGlobal) {
      const brandingResult = await resolveStudentPortalBranding(collegeSlug);
      collegeId = brandingResult.branding.id;
    }
  }

  // Canonical redirect: pillar UUID → slug
  if (isUuid(pillarKey) && resolvedPillar?.slug) {
    const targetCourseSlug = resolvedCourse?.slug || courseKey;
    redirect(buildPillarCourseDetailHref(collegeSlug, resolvedPillar.slug, targetCourseSlug, explicitVariantId));
  }

  // Canonical redirect: course UUID or paid landing slug → master course slug
  if (
    resolvedCourse?.slug
    && courseKey !== resolvedCourse.slug
    && (isUuid(courseKey) || explicitVariantId)
  ) {
    const targetPillarSlug = resolvedPillar?.slug || pillarKey;
    redirect(buildPillarCourseDetailHref(collegeSlug, targetPillarSlug, resolvedCourse.slug, explicitVariantId));
  }

  if (!resolvedCourse) {
    notFound();
  }

  const effectiveCourseId = resolvedCourse.id;

  // Fetch static landing data from cache (7-day TTL) and pillar validation in parallel
  const [pillar, staticLanding] = await Promise.all([
    validatePillarSlugMatch(pillarSlug, effectiveCourseId, { isGlobal, collegeId }),
    getCachedCourseLandingStatic({
      collegeSlug,
      pillarSlug,
      courseId: effectiveCourseId,
      isGlobal,
      collegeId,
      explicitVariantId,
    }),
  ]);

  if (!pillar) {
    notFound();
  }

  if (!staticLanding) {
    notFound();
  }

  const masterCourseId = staticLanding.masterCourseId;

  // 1. Base Access CTA status lookup promise (shared by multiple components)
  const ctaPromise = (async () => {
    const isPaidVariantProduct = explicitVariantId
      ? await (async () => {
          const sb = createAdminClient();
          const { data: variant } = await sb
            .from('course_variants')
            .select('id, show_as_paid_course')
            .eq('master_course_id', masterCourseId)
            .eq('publish_status', 'published')
            .eq('id', explicitVariantId)
            .maybeSingle();
          return !!variant?.show_as_paid_course;
        })()
      : false;

    const effectiveSourceType = isPaidVariantProduct ? 'course_variant' : staticLanding.sourceType;
    const effectiveSourceId = isPaidVariantProduct ? explicitVariantId! : staticLanding.sourceId;

    let ctaResolution: {
      hasLearningAccess: boolean;
      isProductEnrolled: boolean;
      inclusionMessage?: string;
    } = {
      hasLearningAccess: false,
      isProductEnrolled: false,
    };

    if (studentId) {
      const [
        { getPaidProductCtaState },
      ] = await Promise.all([
        import('@/lib/services/paid-product-enrollment'),
      ]);
      ctaResolution = await getPaidProductCtaState({
        userId: studentId,
        sourceType: effectiveSourceType,
        sourceId: effectiveSourceId,
        masterCourseId,
        context: { isGlobal, collegeId },
      });
    }

    return {
      ctaResolution,
      isPaidVariantProduct,
      effectiveSourceType,
      effectiveSourceId,
    };
  })();

  // 2. Hero Section CTA Button Promise (Resolves to CTA access state)
  const heroCtaPromise = (async () => {
    const { ctaResolution, isPaidVariantProduct: _isPaidVariantProduct, effectiveSourceType, effectiveSourceId } = await ctaPromise;
    
    let progressPercentage: number | null = null;
    let learnHref = buildPillarCourseDetailHref(
      collegeSlug,
      pillarSlug,
      resolvedCourse.slug || masterCourseId,
      effectiveSourceType === 'course_variant' ? effectiveSourceId : explicitVariantId,
    );

    if (studentId && ctaResolution.hasLearningAccess) {
      const [
        { batchCourseProgress },
      ] = await Promise.all([
        import('@/lib/services/batch-course-progress'),
      ]);
      const progressMap = await batchCourseProgress(studentId, [masterCourseId]);
      progressPercentage = progressMap.get(masterCourseId)?.percentage ?? 0;

      const checkoutVariantId = effectiveSourceType === 'course_variant' ? effectiveSourceId : explicitVariantId;
      const launchTarget = await resolveCourseLaunchTarget({
        collegeSlug,
        courseKey: masterCourseId,
        studentId,
        isGlobal,
        collegeId,
        variantId: checkoutVariantId,
        usePaidContext: true,
      });

      if (launchTarget.status === 'ready' || launchTarget.status === 'no_lessons') {
        learnHref = launchTarget.href;
      }
    }

    return {
      hasLearningAccess: ctaResolution.hasLearningAccess,
      learnHref,
      progressPercentage,
    };
  })();

  // 3. Right Sticky Enrollment Card Promise (Resolves to React node layout)
  const enrollmentPromise = (async () => {
    const { ctaResolution, isPaidVariantProduct, effectiveSourceType, effectiveSourceId } = await ctaPromise;
    const checkoutVariantId = effectiveSourceType === 'course_variant' ? effectiveSourceId : explicitVariantId;

    const { learnHref } = await heroCtaPromise;

    if (ctaResolution.isProductEnrolled) {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-3">
            <CheckCircle2 className="size-5" />
            <span className="font-bold">You are enrolled</span>
          </div>
          <StudentCtaButton href={learnHref} className="w-full" size="lg" showArrow={false}>
            Continue
          </StudentCtaButton>
        </div>
      );
    }

    if (ctaResolution.inclusionMessage) {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center gap-3">
            <CheckCircle2 className="size-5" />
            <span className="font-bold">{ctaResolution.inclusionMessage}</span>
          </div>
          {ctaResolution.hasLearningAccess ? (
            <StudentCtaButton href={learnHref} className="w-full" size="lg" showArrow={false}>
              Continue
            </StudentCtaButton>
          ) : null}
        </div>
      );
    }

    const [
      { getCoursePricePlans },
    ] = await Promise.all([
      import('@/lib/services/global-courses'),
    ]);

    const initialPricePlans = await getCoursePricePlans(masterCourseId).catch(() => []);

    // Fetch variant-specific or source-specific price plans
    let pricePlans = initialPricePlans;
    if (isPaidVariantProduct && explicitVariantId) {
      const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
      const variantPlans = await getActivePricePlansForSource('course_variant', explicitVariantId);
      if (variantPlans.length > 0) {
        pricePlans = variantPlans.map((p) => ({
          id: p.id,
          plan_name: p.plan_name,
          description: p.description,
          validity_days: p.validity_days,
          price_minor: p.price_minor,
          currency: p.currency,
          is_default: p.is_default,
          badge_label: p.badge_label ?? null,
        }));
      }
    } else if (effectiveSourceType === 'paid_course_builder') {
      const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
      const builderPlans = await getActivePricePlansForSource('paid_course_builder', masterCourseId);
      if (builderPlans.length > 0) {
        pricePlans = builderPlans.map((p) => ({
          id: p.id,
          plan_name: p.plan_name,
          description: p.description,
          validity_days: p.validity_days,
          price_minor: p.price_minor,
          currency: p.currency,
          is_default: p.is_default,
          badge_label: p.badge_label ?? null,
        }));
      }
    } else if (effectiveSourceType === 'master_course' && staticLanding.sourceType === 'master_course') {
      const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
      const masterPlans = await getActivePricePlansForSource('master_course', masterCourseId);
      if (masterPlans.length > 0) {
        pricePlans = masterPlans.map((p) => ({
          id: p.id,
          plan_name: p.plan_name,
          description: p.description,
          validity_days: p.validity_days,
          price_minor: p.price_minor,
          currency: p.currency,
          is_default: p.is_default,
          badge_label: p.badge_label ?? null,
        }));
      }
    }

    const [variantPurchaseInfo, accessExpired] = await Promise.all([
      checkoutVariantId
        ? getVariantPurchaseInfo(
            checkoutVariantId,
            masterCourseId,
            collegeId,
          )
        : null,
      studentId
        ? (async () => {
            const { hasExpiredPaidProductEnrollment } = await import('@/lib/services/paid-product-enrollment');
            return hasExpiredPaidProductEnrollment({
              userId: studentId,
              sourceType: effectiveSourceType,
              sourceId: effectiveSourceId,
              masterCourseId,
              context: { isGlobal, collegeId },
            }).catch(() => false);
          })()
        : Promise.resolve(false),
    ]);

    const planSelectorProps = {
      collegeSlug,
      pillarSlug,
      courseId: masterCourseId,
      isGlobal,
      plans: pricePlans,
      fallbackPriceMinor: staticLanding.fallbackPriceMinor,
      fallbackCurrency: staticLanding.fallbackCurrency,
      variantId: checkoutVariantId,
      hasActiveAccess: false,
      accessExpired: accessExpired ?? false,
      continueLearningHref: learnHref,
    };

    const buildCoursePlanSelector = (showSectionHeader: boolean, compact: boolean) => (
      <CoursePlanSelector
        {...planSelectorProps}
        showSectionHeader={showSectionHeader}
        compact={compact}
      />
    );

    return (
      <>
        {staticLanding.isFree ? (
          <FreeEnrollmentButton
            collegeSlug={collegeSlug}
            pillarSlug={pillarSlug}
            courseId={masterCourseId}
          />
        ) : checkoutVariantId && pricePlans.length > 0 ? (
          <div className="space-y-4">
            {buildCoursePlanSelector(false, true)}
          </div>
        ) : checkoutVariantId && variantPurchaseInfo ? (
          <VariantCheckoutSection
            collegeSlug={collegeSlug}
            pillarSlug={pillarSlug}
            courseId={masterCourseId}
            variantId={variantPurchaseInfo.variantId}
            variantTitle={variantPurchaseInfo.title}
            priceMinor={variantPurchaseInfo.priceMinor}
            currency={variantPurchaseInfo.currency}
            pricingSource={variantPurchaseInfo.pricingSource}
          />
        ) : pricePlans.length > 0 || staticLanding.fallbackPriceMinor ? (
          <div className="space-y-6">
            {pricePlans.length === 0 && (
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
                  <Sparkles className="size-3 text-primary" />
                  <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Lifetime Access</span>
                </div>
                <div className="text-4xl font-bold tracking-tighter flex items-center justify-center gap-1 text-foreground">
                  <span className="text-lg font-bold text-primary self-start mt-1">
                    {staticLanding.fallbackCurrency === 'INR' ? '₹' : '$'}
                  </span>
                  <span>
                    {staticLanding.fallbackPriceMinor
                      ? (staticLanding.fallbackPriceMinor / 100).toLocaleString()
                      : '---'}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {buildCoursePlanSelector(false, true)}
            </div>
          </div>
        ) : (
          <VariantCheckoutUnavailable reason="No price plan or variant price found." />
        )}
      </>
    );
  })();

  // 4. Final Bottom Pricing Section Promise (Resolves to React node layout)
  const finalPricingPromise = (async () => {
    const { ctaResolution, isPaidVariantProduct, effectiveSourceType, effectiveSourceId } = await ctaPromise;
    const { learnHref } = await heroCtaPromise;

    if (ctaResolution.hasLearningAccess) {
      return (
        <StudentCtaButton href={learnHref} size="lg">
          Continue
        </StudentCtaButton>
      );
    }

    if (staticLanding.isFree || ctaResolution.inclusionMessage) {
      return null;
    }

    const [
      { getCoursePricePlans },
    ] = await Promise.all([
      import('@/lib/services/global-courses'),
    ]);

    const initialPricePlans = await getCoursePricePlans(masterCourseId).catch(() => []);

    // Fetch variant-specific or source-specific price plans
    let pricePlans = initialPricePlans;
    if (isPaidVariantProduct && explicitVariantId) {
      const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
      const variantPlans = await getActivePricePlansForSource('course_variant', explicitVariantId);
      if (variantPlans.length > 0) {
        pricePlans = variantPlans.map((p) => ({
          id: p.id,
          plan_name: p.plan_name,
          description: p.description,
          validity_days: p.validity_days,
          price_minor: p.price_minor,
          currency: p.currency,
          is_default: p.is_default,
          badge_label: p.badge_label ?? null,
        }));
      }
    } else if (effectiveSourceType === 'paid_course_builder') {
      const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
      const builderPlans = await getActivePricePlansForSource('paid_course_builder', masterCourseId);
      if (builderPlans.length > 0) {
        pricePlans = builderPlans.map((p) => ({
          id: p.id,
          plan_name: p.plan_name,
          description: p.description,
          validity_days: p.validity_days,
          price_minor: p.price_minor,
          currency: p.currency,
          is_default: p.is_default,
          badge_label: p.badge_label ?? null,
        }));
      }
    } else if (effectiveSourceType === 'master_course' && staticLanding.sourceType === 'master_course') {
      const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
      const masterPlans = await getActivePricePlansForSource('master_course', masterCourseId);
      if (masterPlans.length > 0) {
        pricePlans = masterPlans.map((p) => ({
          id: p.id,
          plan_name: p.plan_name,
          description: p.description,
          validity_days: p.validity_days,
          price_minor: p.price_minor,
          currency: p.currency,
          is_default: p.is_default,
          badge_label: p.badge_label ?? null,
        }));
      }
    }

    const checkoutVariantId = effectiveSourceType === 'course_variant' ? effectiveSourceId : explicitVariantId;

    const accessExpired = studentId
      ? await (async () => {
          const { hasExpiredPaidProductEnrollment } = await import('@/lib/services/paid-product-enrollment');
          return hasExpiredPaidProductEnrollment({
            userId: studentId,
            sourceType: effectiveSourceType,
            sourceId: effectiveSourceId,
            masterCourseId,
            context: { isGlobal, collegeId },
          }).catch(() => false);
        })()
      : false;

    const planSelectorProps = {
      collegeSlug,
      pillarSlug,
      courseId: masterCourseId,
      isGlobal,
      plans: pricePlans,
      fallbackPriceMinor: staticLanding.fallbackPriceMinor,
      fallbackCurrency: staticLanding.fallbackCurrency,
      variantId: checkoutVariantId,
      hasActiveAccess: false,
      accessExpired: accessExpired ?? false,
      continueLearningHref: learnHref,
    };

    const buildCoursePlanSelector = (showSectionHeader: boolean, compact: boolean) => (
      <CoursePlanSelector
        {...planSelectorProps}
        showSectionHeader={showSectionHeader}
        compact={compact}
      />
    );

    if (checkoutVariantId && pricePlans.length > 0) {
      return buildCoursePlanSelector(true, false);
    } else if (pricePlans.length > 0) {
      return buildCoursePlanSelector(true, false);
    }

    return null;
  })();

  // 5. Variant Explorer Promise (Resolves to Explorer component markup)
  const variantExplorerPromise = (async () => {
    const { effectiveSourceType, effectiveSourceId } = await ctaPromise;
    const checkoutVariantId = effectiveSourceType === 'course_variant' ? effectiveSourceId : explicitVariantId;

    const courseVariants = await listCourseVariantsForStudentLanding(
      studentId,
      masterCourseId,
      { isGlobal, collegeId },
    );

    return (
      <CourseVariantExplorer
        masterCourseTitle={staticLanding.title}
        variants={courseVariants}
        activeVariantId={checkoutVariantId ?? null}
        collegeSlug={collegeSlug}
        pillarSlug={pillarSlug}
        courseId={masterCourseId}
      />
    );
  })();

  const checkoutVariantIdFallback =
    staticLanding.sourceType === 'course_variant'
      ? staticLanding.sourceId
      : explicitVariantId;

  // Build landing detail using static data and default/fallback fields
  const landingDetail = {
    course: {
      title: staticLanding.title,
      short_description: staticLanding.shortDescription || 'Master the core concepts and advanced patterns of this domain with our industry-leading curriculum.',
      learning_points: staticLanding.whatYouWillLearn.length > 0 ? staticLanding.whatYouWillLearn : undefined,
      is_free: staticLanding.isFree,
      thumbnail_url: staticLanding.thumbnailUrl ?? undefined,
      preview_video_url: staticLanding.previewVideoUrl ?? undefined,
      level: staticLanding.level,
      faqs: staticLanding.faqs,
    },
    entitled: false,
    has_learning_access: false,
    is_product_enrolled: false,
    inclusion_message: undefined,
    progress_percentage: null,
    module_count: staticLanding.moduleCount,
    video_count: staticLanding.videoCount,
    modules: staticLanding.modules,
  };

  const learnHrefFallback = buildPillarCourseDetailHref(
    collegeSlug,
    pillarSlug,
    resolvedCourse.slug || masterCourseId,
    checkoutVariantIdFallback,
  );

  return (
    <PremiumCourseLandingClient
      collegeSlug={collegeSlug}
      pillarSlug={pillarSlug}
      courseId={masterCourseId}
      detail={landingDetail}
      learnHref={learnHrefFallback}
      heroCtaPromise={heroCtaPromise}
      enrollmentPromise={enrollmentPromise}
      finalPricingPromise={finalPricingPromise}
      variantExplorerPromise={variantExplorerPromise}
    />
  );
}

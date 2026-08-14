import { requireStudent } from '@/lib/auth/require-student';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateStudentCourseAccess, listStudentContentEntitlements } from '@/lib/services/course-access-manager';
// imports merged
import { buildBundleHref } from '@/lib/utils/bundle-routes';
import { normUuid } from '@/lib/utils';
import { isStudentEnrolledInJobReadyBootcamp } from '@/lib/services/job-ready-bootcamp';
import { getOrderById } from '@/lib/services/orders';
import { provisionAccessAfterPurchase } from '@/lib/services/payment-entitlements';
import { buildEnrolledBootcampHubHref } from '@/lib/student/bootcamp-routes';
import {
  parsePaidProductFromSearchParams,
  resolvePaidProduct,
} from '@/lib/services/paid-product-resolver';
import { loadEntitledVariantIdsForStudent } from '@/lib/services/student-discoverable-catalog';
import { PaymentSuccessClient } from './payment-success-client';

async function confirmBundlePurchase(
  userId: string,
  studentId: string,
  bundleSlug: string,
): Promise<{ confirmed: boolean; id: string; title: string; slug: string } | null> {
  const sb = createAdminClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(bundleSlug);
  let query = sb.from('course_bundles').select('id, slug, title');
  query = isUuid ? query.eq('id', bundleSlug) : query.eq('slug', bundleSlug);
  const { data: bundle } = await query.maybeSingle();

  if (!bundle) return null;

  const entitlements = await listStudentContentEntitlements(studentId);
  const entitled = entitlements.some(
    (e) =>
      e.assigned_entity_type === 'bundle' &&
      normUuid(e.assigned_entity_id) === normUuid(bundle.id) &&
      e.status === 'active',
  );

  if (entitled) {
    return { confirmed: true, id: bundle.id, title: bundle.title as string, slug: bundle.slug as string };
  }

  const { data: paidOrder } = await sb
    .from('orders')
    .select('id, status, paid_at')
    .eq('entity_type', 'course_bundle')
    .eq('entity_id', bundle.id)
    .eq('purchaser_user_id', userId)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paidOrder) {
    return { confirmed: true, id: bundle.id, title: bundle.title as string, slug: bundle.slug as string };
  }

  return { confirmed: false, id: bundle.id, title: bundle.title as string, slug: bundle.slug as string };
}

async function confirmBootcampPurchase(
  ctx: Awaited<ReturnType<typeof requireStudent>>,
): Promise<boolean> {
  const collegeId = ctx.isGlobal ? null : ctx.tenant.id;

  if (await isStudentEnrolledInJobReadyBootcamp(ctx.studentId, collegeId)) {
    return true;
  }

  const sb = createAdminClient();
  const { data: paidOrder } = await sb
    .from('orders')
    .select('id, status, paid_at, gateway_payment_id, purchaser_email')
    .eq('entity_type', 'job_ready_bootcamp')
    .eq('purchaser_user_id', ctx.user.id)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!paidOrder) return false;

  const order = await getOrderById(paidOrder.id);
  if (!order) return false;

  const repairResult = await provisionAccessAfterPurchase({
    order,
    studentUserId: ctx.studentId,
    studentEmail: ctx.user.email ?? (paidOrder.purchaser_email as string),
    collegeId,
    metadata: {
      source: 'payment_success_repair',
      paymentId: order.gateway_payment_id ?? undefined,
      purchased_at: order.paid_at ?? new Date().toISOString(),
      verified_at: new Date().toISOString(),
    },
  });

  const repaired = repairResult.results.some((r) => r.success);
  if (repaired) {
    console.info('[bootcamp/payment] enrollment repaired on success page', {
      orderId: order.id,
      studentId: ctx.studentId,
    });
    return true;
  }

  console.warn('[bootcamp/payment] enrollment repair failed on success page', {
    orderId: order.id,
    studentId: ctx.studentId,
    failures: repairResult.results.reduce((acc, r) => {
      if (!r.success) acc.push(r.message);
      return acc;
    }, [] as string[]),
  });

  return await isStudentEnrolledInJobReadyBootcamp(ctx.studentId, collegeId);
}

async function confirmPaidProductPurchase(
  ctx: Awaited<ReturnType<typeof requireStudent>>,
  identity: { sourceType: 'master_course' | 'course_variant' | 'paid_course_builder'; sourceId: string },
  product: Awaited<ReturnType<typeof resolvePaidProduct>>,
): Promise<boolean> {
  const collegeId = ctx.isGlobal ? null : ctx.tenant.id;

  if (identity.sourceType === 'course_variant') {
    const entitledVariants = await loadEntitledVariantIdsForStudent(ctx.studentId);
    if (entitledVariants.has(identity.sourceId)) return true;

    if (product?.parentMasterCourseId) {
      const parentAccess = await validateStudentCourseAccess(
        ctx.studentId,
        product.parentMasterCourseId,
        { isGlobal: ctx.isGlobal, collegeId },
      );
      if (parentAccess) return true;
    }
  } else {
    const access = await validateStudentCourseAccess(
      ctx.studentId,
      product?.parentMasterCourseId ?? identity.sourceId,
      { isGlobal: ctx.isGlobal, collegeId },
    );
    if (access) return true;
  }

  const repaired = await repairPaidCoursePurchase(ctx, identity, product);
  if (repaired) return true;

  const finalCourseId = product?.parentMasterCourseId ?? identity.sourceId;
  const finalAccess = await validateStudentCourseAccess(
    ctx.studentId,
    finalCourseId,
    { isGlobal: ctx.isGlobal, collegeId },
  );
  return !!finalAccess;
}

async function repairPaidCoursePurchase(
  ctx: Awaited<ReturnType<typeof requireStudent>>,
  identity: { sourceType: 'master_course' | 'course_variant' | 'paid_course_builder'; sourceId: string },
  product: Awaited<ReturnType<typeof resolvePaidProduct>>,
): Promise<boolean> {
  const sb = createAdminClient();
  const entityType = identity.sourceType === 'course_variant' ? 'course_variant' : 'master_course';
  const entityId = identity.sourceType === 'course_variant'
    ? identity.sourceId
    : product?.parentMasterCourseId ?? identity.sourceId;

  const { data: paidOrder } = await sb
    .from('orders')
    .select('id, status, paid_at, gateway_payment_id, purchaser_email')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('purchaser_user_id', ctx.user.id)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!paidOrder) return false;

  const order = await getOrderById(paidOrder.id);
  if (!order) return false;

  const orderMetadata = (order.metadata as Record<string, unknown>) ?? {};
  const repairResult = await provisionAccessAfterPurchase({
    order,
    studentUserId: ctx.studentId,
    studentEmail: ctx.user.email ?? (paidOrder.purchaser_email as string),
    collegeId: ctx.isGlobal ? null : ctx.tenant.id,
    metadata: {
      source: 'payment_success_repair',
      paymentId: order.gateway_payment_id ?? paidOrder.gateway_payment_id ?? undefined,
      purchased_at: order.paid_at ?? paidOrder.paid_at ?? new Date().toISOString(),
      verified_at: new Date().toISOString(),
      pillar_id: typeof orderMetadata.pillar_id === 'string' ? orderMetadata.pillar_id : undefined,
      pillar_slug: product?.pillarSlug
        ?? (typeof orderMetadata.pillar_slug === 'string' ? orderMetadata.pillar_slug : undefined),
      course_id: product?.parentMasterCourseId
        ?? (typeof orderMetadata.course_id === 'string' ? orderMetadata.course_id : undefined),
      variant_id: identity.sourceType === 'course_variant'
        ? identity.sourceId
        : (typeof orderMetadata.variant_id === 'string' ? orderMetadata.variant_id : undefined),
      razorpay_order_id: order.gateway_order_id ?? undefined,
    },
  });

  const repaired = repairResult.results.some((r) => r.success);
  if (repaired) {
    console.info('[payment-success] course access repaired from paid order', {
      orderId: order.id,
      studentId: ctx.studentId,
      sourceType: identity.sourceType,
      sourceId: identity.sourceId,
    });
    return true;
  }

  console.warn('[payment-success] course access repair failed from paid order', {
    orderId: order.id,
    studentId: ctx.studentId,
    sourceType: identity.sourceType,
    sourceId: identity.sourceId,
    failures: repairResult.results.reduce((acc, r) => {
      if (!r.success) acc.push(r.message);
      return acc;
    }, [] as string[]),
  });

  return false;
}

async function getEntitlementValidityText(
  studentId: string,
  purchaseType: 'course' | 'bundle' | 'bootcamp',
  entityId: string | null,
  sourceType?: 'course_variant' | 'master_course' | 'paid_course_builder',
): Promise<string> {
  if (!entityId) return 'Forever Access';
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  let validUntil: string | null = null;

  if (purchaseType === 'course' && sourceType) {
    if (sourceType === 'course_variant') {
      const { data } = await sb
        .from('student_content_entitlements')
        .select('valid_until')
        .eq('student_id', studentId)
        .eq('assigned_entity_type', 'variant')
        .eq('assigned_entity_id', entityId)
        .eq('status', 'active')
        .lte('valid_from', nowIso)
        .or('valid_until.is.null,valid_until.gt.' + nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) validUntil = data.valid_until;
    } else {
      const { data: se } = await sb
        .from('student_entitlements')
        .select('valid_until')
        .eq('student_id', studentId)
        .eq('master_course_id', entityId)
        .eq('status', 'active')
        .lte('valid_from', nowIso)
        .or('valid_until.is.null,valid_until.gt.' + nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (se) {
        validUntil = se.valid_until;
      } else {
        const { data: sce } = await sb
          .from('student_content_entitlements')
          .select('valid_until')
          .eq('student_id', studentId)
          .eq('assigned_entity_type', 'master_course')
          .eq('assigned_entity_id', entityId)
          .eq('status', 'active')
          .lte('valid_from', nowIso)
          .or('valid_until.is.null,valid_until.gt.' + nowIso)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sce) validUntil = sce.valid_until;
      }
    }
  } else if (purchaseType === 'bundle') {
    const { data } = await sb
      .from('student_content_entitlements')
      .select('valid_until')
      .eq('student_id', studentId)
      .eq('assigned_entity_type', 'bundle')
      .eq('assigned_entity_id', entityId)
      .eq('status', 'active')
      .lte('valid_from', nowIso)
      .or('valid_until.is.null,valid_until.gt.' + nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) validUntil = data.valid_until;
  } else if (purchaseType === 'bootcamp') {
    const { data } = await sb
      .from('student_content_entitlements')
      .select('valid_until')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .lte('valid_from', nowIso)
      .or('valid_until.is.null,valid_until.gt.' + nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) validUntil = data.valid_until;
  }

  if (!validUntil) return 'Forever Access';

  const start = new Date();
  const end = new Date(validUntil);
  if (isNaN(end.getTime())) return 'Forever Access';
  
  const diffTime = end.getTime() - start.getTime();
  if (diffTime <= 0) return 'Expired Access';
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const approxMonths = Math.round(diffDays / 30);
  
  if (approxMonths >= 12) {
    const years = Math.round(approxMonths / 12);
    return `${years} Year${years > 1 ? 's' : ''} Access`;
  } else if (approxMonths >= 1) {
    return `${approxMonths} Month${approxMonths > 1 ? 's' : ''} Access`;
  } else {
    return `${diffDays} Day${diffDays > 1 ? 's' : ''} Access`;
  }
}

async function confirmFreeCourseEnrollment(
  _ctx: Awaited<ReturnType<typeof requireStudent>>,
  courseId: string,
  collegeSlug: string,
): Promise<{ confirmed: true; title: string; learnHref: string } | null> {
  const sb = createAdminClient();
  const { data: course } = await sb
    .from('master_courses')
    .select('id, title, slug, course_kind, is_free, pricing_model')
    .eq('id', courseId)
    .maybeSingle();

  if (!course) return null;

  const isFree =
    course.course_kind === 'free_course' ||
    course.is_free === true ||
    course.pricing_model === 'free';

  if (!isFree) return null;

  // Free courses often sit outside paid hierarchy visibility. Enrollment already
  // succeeded on the client before redirect — always show the success celebration.
  const slugOrId = (course.slug as string | null)?.trim() || course.id;
  return {
    confirmed: true,
    title: (course.title as string) || 'Free Course',
    learnHref: `/c/${encodeURIComponent(collegeSlug)}/student/learn/${encodeURIComponent(slugOrId)}`,
  };
}

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<{
    courseId?: string;
    variantId?: string;
    sourceType?: string;
    sourceId?: string;
    bundleSlug?: string;
    bootcamp?: string;
    enrollment?: string;
  }>;
}) {
  const { collegeSlug } = await params;
  const [sp, ctx] = await Promise.all([
    searchParams,
    requireStudent(collegeSlug),
  ]);

  // Free enrollment confirmation — never use the paid-order path (shows Pending/failed UI).
  const freeCourseId = sp.courseId?.trim();
  if (freeCourseId && (sp.enrollment === 'free' || sp.enrollment === '1')) {
    const freeResult = await confirmFreeCourseEnrollment(ctx, freeCourseId, collegeSlug);
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20" aria-label="Enrollment success">
        <PaymentSuccessClient
          collegeSlug={collegeSlug}
          purchaseType="course"
          courseId={freeCourseId}
          courseTitle={freeResult?.title ?? 'Free Course'}
          learnHref={freeResult?.learnHref ?? `/c/${encodeURIComponent(collegeSlug)}/student/my-courses`}
          isConfirmed={true}
          courseValidity="Forever Access"
        />
      </main>
    );
  }

  // Also detect free courses when redirected with only ?courseId= (legacy free enroll links).
  if (freeCourseId && !sp.bundleSlug && !sp.bootcamp && !sp.sourceType && !sp.variantId) {
    const freeResult = await confirmFreeCourseEnrollment(ctx, freeCourseId, collegeSlug);
    if (freeResult) {
      return (
        <main className="flex flex-1 items-center justify-center px-6 py-20" aria-label="Enrollment success">
          <PaymentSuccessClient
            collegeSlug={collegeSlug}
            purchaseType="course"
            courseId={freeCourseId}
            courseTitle={freeResult.title}
            learnHref={freeResult.learnHref}
            isConfirmed={true}
            courseValidity="Forever Access"
          />
        </main>
      );
    }
  }

  if (sp.bootcamp === '1' || sp.bootcamp === 'true') {
    const [enrolled, validityIfEnrolled] = await Promise.all([
      confirmBootcampPurchase(ctx),
      getEntitlementValidityText(ctx.studentId, 'bootcamp', 'bootcamp'),
    ]);
    const validity = enrolled ? validityIfEnrolled : 'Forever Access';

    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20" aria-label="Payment success">
        <PaymentSuccessClient
          collegeSlug={collegeSlug}
          purchaseType="bootcamp"
          courseId={null}
          courseTitle="Job Ready Bootcamp"
          learnHref={buildEnrolledBootcampHubHref(collegeSlug)}
          isConfirmed={enrolled}
          courseValidity={validity}
        />
      </main>
    );
  }

  if (sp.bundleSlug) {
    const bundleResult = await confirmBundlePurchase(ctx.user.id, ctx.studentId, sp.bundleSlug);
    const validity = bundleResult?.confirmed
      ? await getEntitlementValidityText(ctx.studentId, 'bundle', bundleResult.id)
      : 'Forever Access';

    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20" aria-label="Payment success">
        <PaymentSuccessClient
          collegeSlug={collegeSlug}
          purchaseType="bundle"
          courseId={null}
          courseTitle={bundleResult?.title ?? 'Bundle'}
          learnHref={bundleResult ? buildBundleHref(collegeSlug, bundleResult.slug) : `/c/${collegeSlug}/student/my-courses`}
          bundleSlug={bundleResult?.slug ?? sp.bundleSlug}
          isConfirmed={bundleResult?.confirmed ?? false}
          courseValidity={validity}
        />
      </main>
    );
  }

  const identity = parsePaidProductFromSearchParams(sp);
  if (!identity) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20" aria-label="Payment success">
        <PaymentSuccessClient
          collegeSlug={collegeSlug}
          purchaseType="course"
          courseId={null}
          courseTitle=""
          learnHref={`/c/${collegeSlug}/student/my-courses`}
          isConfirmed={false}
          courseValidity="Forever Access"
        />
      </main>
    );
  }

  const product = await resolvePaidProduct({
    sourceType: identity.sourceType,
    sourceId: identity.sourceId,
    collegeSlug,
    collegeId: ctx.isGlobal ? null : ctx.tenant.id,
    includePrice: false,
  });

  const [isConfirmed, validity] = await Promise.all([
    confirmPaidProductPurchase(ctx, identity, product),
    getEntitlementValidityText(ctx.studentId, 'course', identity.sourceId, identity.sourceType),
  ]);

  const displayTitle = product?.title ?? 'Course';
  const learnHref = product?.continueUrl ?? `/c/${collegeSlug}/student/my-courses`;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20" aria-label="Payment success">
      <PaymentSuccessClient
        collegeSlug={collegeSlug}
        purchaseType="course"
        courseId={product?.parentMasterCourseId ?? sp.courseId ?? null}
        courseTitle={displayTitle}
        learnHref={learnHref}
        isConfirmed={isConfirmed}
        courseValidity={isConfirmed ? validity : 'Forever Access'}
      />
    </main>
  );
}

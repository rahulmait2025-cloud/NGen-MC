'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { queueCampusAmbassadorApprovalEmail } from '@/lib/lms-email/campus-ambassador-approval';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

// ─── Approve Application ─────────────────────────────────────────────────────

export async function approveApplication(
  applicationId: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const admin = createAdminClient();

  const { data: application, error: appError } = await admin
    .from('campus_ambassador_applications')
    .select('id, user_id, full_name, email, college_id, status')
    .eq('id', applicationId)
    .maybeSingle();

  if (appError || !application) {
    return { ok: false, error: appError?.message ?? 'Application not found' };
  }

  if (application.status === 'approved') {
    return { ok: false, error: 'Application already approved' };
  }

  const { data, error } = await admin.rpc('approve_campus_ambassador_application', {
    p_application_id: applicationId,
    p_reviewer_id: authCheck.user.id,
  });

  if (error) {
    console.error('[CA] approve failed:', error);
    return { ok: false, error: error.message };
  }

  const rpcData = asRecord(data);
  const couponCode =
    typeof rpcData?.coupon_code === 'string' ? rpcData.coupon_code : null;

  let collegeSlug: string | null = null;
  if (application.college_id) {
    const { data: college } = await admin
      .from('colleges')
      .select('slug')
      .eq('id', application.college_id)
      .maybeSingle();
    collegeSlug = college?.slug ?? null;
  }

  // Lifecycle key must be the approval-transition timestamp (reviewed_at), which
  // the approve RPC sets to now() and reapply clears to null. Do NOT use
  // updated_at — unrelated edits bump it via trigger and would mint a new key.
  const { data: reviewedApplication } = await admin
    .from('campus_ambassador_applications')
    .select('reviewed_at, status')
    .eq('id', applicationId)
    .maybeSingle();

  const approvalLifecycleId =
    typeof reviewedApplication?.reviewed_at === 'string' && reviewedApplication.reviewed_at
      ? reviewedApplication.reviewed_at
      : null;

  if (!approvalLifecycleId) {
    console.error('[CA] approval email skipped — reviewed_at missing after approve RPC', {
      applicationId,
      status: reviewedApplication?.status ?? null,
    });
  } else {
    const emailResult = await queueCampusAmbassadorApprovalEmail({
      applicationId: application.id,
      userId: application.user_id,
      fullName: application.full_name,
      email: application.email,
      collegeSlug,
      couponCode,
      approvalLifecycleId,
    });

    if (!emailResult.ok) {
      console.error('[CA] approval succeeded but email queue failed', emailResult.error);
    }
  }

  revalidatePath('/commerce/campus-ambassadors');
  revalidateTag(`ambassador-status-${application.user_id}`, 'max');

  return { ok: true, data: rpcData ?? undefined };
}

// ─── Reject Application ──────────────────────────────────────────────────────

export async function rejectApplication(
  applicationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const admin = createAdminClient();

  const { data: application } = await admin
    .from('campus_ambassador_applications')
    .select('id, user_id, status')
    .eq('id', applicationId)
    .maybeSingle();

  const { error } = await admin.rpc('reject_campus_ambassador_application', {
    p_application_id: applicationId,
    p_reviewer_id: authCheck.user.id,
  });

  if (error) {
    console.error('[CA] reject failed:', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/commerce/campus-ambassadors');
  if (application?.user_id) {
    revalidateTag(`ambassador-status-${application.user_id}`, 'max');
  }

  return { ok: true };
}

// ─── Remove Ambassador ───────────────────────────────────────────────────────

export async function removeAmbassador(
  ambassadorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const admin = createAdminClient();

  const { data: ambassador } = await admin
    .from('campus_ambassadors')
    .select('user_id')
    .eq('id', ambassadorId)
    .maybeSingle();

  const { error } = await admin.rpc('remove_campus_ambassador', {
    p_ambassador_id: ambassadorId,
  });

  if (error) {
    console.error('[CA] remove failed:', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/commerce/campus-ambassadors');
  if (ambassador?.user_id) {
    revalidateTag(`ambassador-status-${ambassador.user_id}`, 'max');
  }

  return { ok: true };
}

// ─── Toggle Coupon ───────────────────────────────────────────────────────────

export async function toggleCoupon(
  ambassadorId: string,
  enable: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const admin = createAdminClient();
  const { error } = await admin.rpc('toggle_campus_ambassador_coupon', {
    p_ambassador_id: ambassadorId,
    p_enable: enable,
  });

  if (error) {
    console.error('[CA] toggle failed:', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/commerce/campus-ambassadors');
  return { ok: true };
}

// ─── Grant Payout ────────────────────────────────────────────────────────────

export async function grantPayout(
  ambassadorId: string,
  amountMinor: number,
  paidVia: string | null,
  referenceText: string | null,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('grant_payout_to_ambassador', {
    p_ambassador_id: ambassadorId,
    p_amount_minor: amountMinor,
    p_paid_via: paidVia,
    p_reference_text: referenceText,
    p_granter_id: authCheck.user.id,
  });

  if (error) {
    console.error('[CA] payout failed:', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/commerce/campus-ambassadors');
  return { ok: true, data: data as Record<string, unknown> };
}

// ─── Update Global Discount ──────────────────────────────────────────────────

export async function updateGlobalDiscount(
  newValue: number,
  applyToAll: boolean,
): Promise<{ ok: boolean; updated?: number; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const admin = createAdminClient();

  const { error: settingsError } = await admin
    .from('campus_ambassador_settings')
    .update({ discount_value: newValue, updated_by: authCheck.user.id })
    .eq('id', 'default');

  if (settingsError) {
    console.error('[CA] update settings failed:', settingsError);
    return { ok: false, error: settingsError.message };
  }

  let updated = 0;
  if (applyToAll) {
    const { data, error: bulkError } = await admin.rpc('bulk_update_ambassador_discount', {
      p_new_discount_value: newValue,
    });

    if (bulkError) {
      console.error('[CA] bulk update failed:', bulkError);
      return { ok: false, error: bulkError.message };
    }
    updated = data as number;
  }

  revalidatePath('/commerce/campus-ambassadors');
  return { ok: true, updated };
}

// ─── Update Ambassador Discount (per-ambassador override) ────────────────────

export async function updateAmbassadorDiscount(
  ambassadorId: string,
  newValue: number,
): Promise<{ ok: boolean; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const admin = createAdminClient();

  const { data: ambassador, error: fetchError } = await admin
    .from('campus_ambassadors')
    .select('coupon_id')
    .eq('id', ambassadorId)
    .maybeSingle();

  if (fetchError || !ambassador?.coupon_id) {
    return { ok: false, error: 'Ambassador coupon not found' };
  }

  const { error } = await admin
    .from('coupons')
    .update({ discount_value: newValue })
    .eq('id', ambassador.coupon_id);

  if (error) {
    console.error('[CA] per-ambassador update failed:', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/commerce/campus-ambassadors');
  return { ok: true };
}

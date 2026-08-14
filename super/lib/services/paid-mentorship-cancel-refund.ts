import 'server-only';

import type { PaidMentorshipBooking } from '@/lib/services/paid-mentorship';

type OrderRefundRow = {
  id: string;
  gateway_payment_id: string | null;
  gateway_order_id: string | null;
  status: string;
  amount_minor: number | null;
  currency: string | null;
};

type RazorpayRefundItem = {
  id: string;
  amount: number;
  /** Razorpay refund status: pending | processed | failed */
  status: string;
  receipt?: string | null;
  payment_id?: string | null;
  notes?: Record<string, unknown> | null;
};

/**
 * Map a Razorpay refund status to a stable local ledger status.
 * - processed → processed (fully settled)
 * - pending   → pending   (in-flight; do not yet mark order refunded)
 * - failed    → failed    (provider rejected)
 * - anything else is treated as pending to avoid premature order completion.
 */
type LedgerStatus = 'initiated' | 'pending' | 'processed' | 'completed' | 'failed';

function toLedgerStatus(providerStatus: string): LedgerStatus {
  switch (providerStatus) {
    case 'processed':
    case 'completed':
      return 'processed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * Returns true only when a provider refund is in a terminal success state that
 * allows the order to be marked refunded and the booking to be cancelled.
 */
function isRefundSettled(providerStatus: string): boolean {
  return providerStatus === 'processed' || providerStatus === 'completed';
}

/**
 * Razorpay refund idempotency contract:
 * - Header: X-Refund-Idempotency
 * - Key: letters, numbers, hyphens, underscores only (no colon)
 * - Same stable value used as refund `receipt` for dual idempotency
 */
export function mentorshipRefundIdempotencyKey(bookingId: string): string {
  return `mentorship-refund-${bookingId}`;
}

function razorpayAuthHeader(): string {
  return `Basic ${Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString('base64')}`;
}

function notesBookingId(notes: Record<string, unknown> | null | undefined): string | null {
  if (!notes) return null;
  const value = notes.booking_id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Match an existing provider refund for this booking without creating a second one.
 *
 * Match priority:
 * 1. Known gateway refund ID (exact)
 * 2. Receipt (exact)
 * 3. Payment ID + amount + booking notes
 *
 * Includes ALL statuses (processed, pending, failed) — callers decide what to
 * do based on the matched refund's status.  Excluding failed here would prevent
 * us from recording a failed provider attempt in the local ledger.
 */
function matchExistingProviderRefund(params: {
  refunds: RazorpayRefundItem[];
  paymentId: string;
  amountMinor: number;
  bookingId: string;
  receipt: string;
  knownGatewayRefundId?: string | null;
}): RazorpayRefundItem | undefined {
  const { refunds, paymentId, amountMinor, bookingId, receipt, knownGatewayRefundId } = params;

  if (knownGatewayRefundId) {
    const byId = refunds.find((r) => r.id === knownGatewayRefundId);
    if (byId) return byId;
  }

  const byReceipt = refunds.find((r) => r.receipt === receipt);
  if (byReceipt) return byReceipt;

  return refunds.find(
    (r) =>
      r.amount === amountMinor &&
      (!r.payment_id || r.payment_id === paymentId) &&
      notesBookingId(r.notes) === bookingId,
  );
}

/**
 * Fetch all refunds for a payment using explicit pagination.
 * Razorpay default page size is 10; we request 100 and paginate if the
 * response indicates more items exist.
 */
async function listRazorpayRefundsForPayment(paymentId: string): Promise<RazorpayRefundItem[]> {
  const PAGE = 100;
  const results: RazorpayRefundItem[] = [];
  let skip = 0;

  for (;;) {
    const url = new URL(`https://api.razorpay.com/v1/payments/${paymentId}/refunds`);
    url.searchParams.set('count', String(PAGE));
    url.searchParams.set('skip', String(skip));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: razorpayAuthHeader() },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Failed to list Razorpay refunds (${response.status}): ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      items?: RazorpayRefundItem[];
      count?: number;
    };

    const items = payload.items ?? [];
    results.push(...items);

    // Stop when we receive fewer items than requested (last page).
    if (items.length < PAGE) break;
    skip += PAGE;
  }

  return results;
}

async function createRazorpayRefund(params: {
  paymentId: string;
  amountMinor: number;
  bookingId: string;
}): Promise<{ id: string; status: string; receipt: string }> {
  const receipt = mentorshipRefundIdempotencyKey(params.bookingId);

  /**
   * Idempotent request body: every field must be deterministic for the same
   * bookingId so that a retry with the same X-Refund-Idempotency key sends an
   * identical body.  Do not add dynamic timestamps, random values, or
   * request-specific admin notes here.
   */
  const body = JSON.stringify({
    amount: params.amountMinor,
    receipt,
    notes: {
      booking_id: params.bookingId,
      source: 'superadmin_cancel_refund',
    },
  });

  const response = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: razorpayAuthHeader(),
      'X-Refund-Idempotency': receipt,
    },
    body,
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    // Duplicate receipt / idempotent replay — reconcile from provider list.
    if (response.status === 400 || response.status === 409) {
      const existing = await listRazorpayRefundsForPayment(params.paymentId);
      const match = matchExistingProviderRefund({
        refunds: existing,
        paymentId: params.paymentId,
        amountMinor: params.amountMinor,
        bookingId: params.bookingId,
        receipt,
      });
      if (match) return { id: match.id, status: match.status, receipt };
    }
    throw new Error(`Razorpay refund failed (${response.status}): ${responseBody.slice(0, 300)}`);
  }

  const refund = (await response.json()) as { id: string; status?: string; receipt?: string };
  return {
    id: refund.id,
    status: refund.status ?? 'processed',
    receipt: refund.receipt ?? receipt,
  };
}

/**
 * Cancel a paid mentorship booking and refund the associated successful payment.
 * Idempotent across SuperAdmin retries and provider-success/local-failure races.
 *
 * Status semantics:
 * - Provider `processed`/`completed`: persist as processed, mark order refunded, cancel booking.
 * - Provider `pending`:               persist as pending, do NOT mark order refunded.
 *                                     Booking is cancelled; a later reconciliation must
 *                                     update the order once the refund settles.
 * - Provider `failed`:                persist as failed, throw so the admin knows and
 *                                     can retry or escalate.
 */
export async function cancelBookingAndRefund(
  bookingId: string,
  reason?: string,
  initiatedBy?: string | null,
): Promise<{ refundId?: string; refundStatus?: string; reconciled?: boolean }> {
  const { createAdminClient: createAdmin } = await import('@/lib/supabase/admin');
  const admin = createAdmin();
  const refundReceipt = mentorshipRefundIdempotencyKey(bookingId);

  const { data: booking, error: fetchError } = await admin
    .from('paid_mentorship_bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!booking) throw new Error('Booking not found.');

  const bookingData = booking as PaidMentorshipBooking;

  if (bookingData.status === 'cancelled') {
    if (bookingData.order_id) {
      const { data: existingRefund } = await admin
        .from('refund_events')
        .select('gateway_refund_id, status, metadata')
        .eq('order_id', bookingData.order_id)
        .not('gateway_refund_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingRefund?.gateway_refund_id) {
        return {
          refundId: existingRefund.gateway_refund_id,
          refundStatus: String(existingRefund.status ?? 'unknown'),
          reconciled: true,
        };
      }
    }
    throw new Error('This booking has already been cancelled.');
  }

  if (bookingData.status === 'pending') {
    throw new Error(
      'This booking is unpaid and cannot be refunded. Cancel it without a refund instead.',
    );
  }

  let order: OrderRefundRow | null = null;
  if (bookingData.order_id) {
    const { data: orderData, error: orderError } = await admin
      .from('orders')
      .select('id, gateway_payment_id, gateway_order_id, status, amount_minor, currency')
      .eq('id', bookingData.order_id)
      .maybeSingle();

    if (orderError) throw new Error(orderError.message);
    order = orderData as OrderRefundRow | null;
  }

  if (!order) {
    // Confirmed booking without an order (e.g. free/admin) — cancel only.
    const { error } = await admin
      .from('paid_mentorship_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || 'Cancelled by superadmin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    if (error) throw new Error(error.message);
    return {};
  }

  if (order.status === 'refunded') {
    // Order already refunded in a prior run — reconcile booking cancel.
    await admin
      .from('paid_mentorship_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || 'Cancelled by superadmin (order already refunded)',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .neq('status', 'cancelled');

    const { data: existingRefund } = await admin
      .from('refund_events')
      .select('gateway_refund_id, status')
      .eq('order_id', order.id)
      .not('gateway_refund_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      refundId: existingRefund?.gateway_refund_id ?? undefined,
      refundStatus: existingRefund ? String(existingRefund.status ?? 'unknown') : undefined,
      reconciled: true,
    };
  }

  if (order.status !== 'paid' && (bookingData.final_amount_minor ?? 0) > 0) {
    throw new Error(
      `Booking payment is not eligible for refund (order status: ${order.status}).`,
    );
  }

  // ── Local ledger check ──────────────────────────────────────────────────────
  const { data: existingEvents, error: eventsError } = await admin
    .from('refund_events')
    .select('id, gateway_refund_id, status, amount_minor, metadata')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false });

  if (eventsError) throw new Error(eventsError.message);

  // Only treat a ledger row as "already done" when in a terminal success state.
  const successfulLocal = (existingEvents ?? []).find((e) => {
    if (!e.gateway_refund_id) return false;
    if (!['processed', 'completed'].includes(String(e.status))) return false;
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    const metaBooking = typeof meta.booking_id === 'string' ? meta.booking_id : null;
    const metaReceipt =
      typeof meta.receipt === 'string'
        ? meta.receipt
        : typeof meta.idempotency_key === 'string'
          ? meta.idempotency_key
          : null;
    if (metaBooking && metaBooking !== bookingId) return false;
    if (metaReceipt && metaReceipt !== refundReceipt) return false;
    return true;
  });

  let refundId: string | undefined = successfulLocal?.gateway_refund_id ?? undefined;
  let providerRefundStatus: string | undefined = successfulLocal ? 'processed' : undefined;
  let reconciled = Boolean(successfulLocal?.gateway_refund_id);

  const refundAmount = bookingData.final_amount_minor ?? order.amount_minor ?? 0;

  if (!refundId && order.gateway_payment_id && refundAmount > 0) {
    try {
      const providerRefunds = await listRazorpayRefundsForPayment(order.gateway_payment_id);
      const knownLocalRefundId = (existingEvents ?? []).find(
        (e) => e.gateway_refund_id,
      )?.gateway_refund_id;

      const existingProvider = matchExistingProviderRefund({
        refunds: providerRefunds,
        paymentId: order.gateway_payment_id,
        amountMinor: refundAmount,
        bookingId,
        receipt: refundReceipt,
        knownGatewayRefundId: knownLocalRefundId,
      });

      if (existingProvider) {
        refundId = existingProvider.id;
        providerRefundStatus = existingProvider.status;
        reconciled = true;

        // Provider refund that previously failed — do not suppress it; let the
        // ledger record it as failed and let the caller surface the error.
        if (existingProvider.status === 'failed') {
          await persistRefundEvent({
            admin,
            order,
            bookingId,
            refundId,
            providerStatus: 'failed',
            refundAmount,
            refundReceipt,
            initiatedBy,
            reason,
            reconciled: true,
            existingEvents,
          });
          throw new Error(
            `Provider refund ${refundId} has status 'failed'. No new refund was created. Please contact Razorpay support or retry after resolving the failed refund.`,
          );
        }
      } else {
        const created = await createRazorpayRefund({
          paymentId: order.gateway_payment_id,
          amountMinor: refundAmount,
          bookingId,
        });
        refundId = created.id;
        providerRefundStatus = created.status;

        if (created.status === 'failed') {
          await persistRefundEvent({
            admin,
            order,
            bookingId,
            refundId,
            providerStatus: 'failed',
            refundAmount,
            refundReceipt,
            initiatedBy,
            reason,
            reconciled: false,
            existingEvents,
          });
          throw new Error(
            `Razorpay returned status 'failed' for refund ${refundId}. Refund ledger updated.`,
          );
        }
      }
    } catch (refundError) {
      // Re-throw known operational errors from the blocks above.
      if (refundError instanceof Error) throw refundError;
      console.error('[paid-mentorship] Refund provider step failed', {
        bookingId,
        orderId: order.id,
        reason: String(refundError),
      });
      throw new Error('Refund provider request failed.');
    }
  }

  if (!refundId) {
    // Zero-amount confirmed booking — cancel only.
    const { error: bookingCancelError } = await admin
      .from('paid_mentorship_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || 'Cancelled by superadmin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    if (bookingCancelError) throw new Error(bookingCancelError.message);
    return {};
  }

  // ── Persist ledger entry ────────────────────────────────────────────────────
  const settled = isRefundSettled(providerRefundStatus ?? '');
  await persistRefundEvent({
    admin,
    order,
    bookingId,
    refundId,
    providerStatus: providerRefundStatus ?? 'pending',
    refundAmount,
    refundReceipt,
    initiatedBy,
    reason,
    reconciled,
    existingEvents,
  });

  // Mark order refunded only when the provider confirms the refund is settled.
  if (settled) {
    const { error: orderUpdateError } = await admin
      .from('orders')
      .update({ status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', order.id);
    if (orderUpdateError) {
      throw new Error(
        `Refund recorded (${refundId}) but order status update failed: ${orderUpdateError.message}`,
      );
    }
  }

  const { error: bookingUpdateError } = await admin
    .from('paid_mentorship_bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || 'Cancelled by superadmin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (bookingUpdateError) {
    throw new Error(
      `Refund recorded (${refundId}) but booking cancel update failed: ${bookingUpdateError.message}`,
    );
  }

  return { refundId, refundStatus: providerRefundStatus, reconciled: reconciled || undefined };
}

// ── Internal helper ──────────────────────────────────────────────────────────

async function persistRefundEvent(params: {
  admin: Awaited<ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>>;
  order: OrderRefundRow;
  bookingId: string;
  refundId: string;
  providerStatus: string;
  refundAmount: number;
  refundReceipt: string;
  initiatedBy: string | null | undefined;
  reason: string | undefined;
  reconciled: boolean;
  existingEvents: Array<{ gateway_refund_id: string | null; status: unknown }> | null;
}): Promise<void> {
  const {
    admin,
    order,
    bookingId,
    refundId,
    providerStatus,
    refundAmount,
    refundReceipt,
    initiatedBy,
    reason,
    reconciled,
    existingEvents,
  } = params;

  const alreadyRecorded = (existingEvents ?? []).some((e) => e.gateway_refund_id === refundId);
  if (alreadyRecorded) return;

  const { data: paymentRow } = await admin
    .from('payments')
    .select('id')
    .eq('order_id', order.id)
    .eq('status', 'captured')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ledgerStatus = toLedgerStatus(providerStatus);
  const nowIso = new Date().toISOString();

  const { error: insertRefundError } = await admin.from('refund_events').insert({
    order_id: order.id,
    payment_id: paymentRow?.id ?? null,
    gateway_refund_id: refundId,
    amount_minor: refundAmount,
    currency: order.currency ?? 'INR',
    status: ledgerStatus,
    initiated_by: initiatedBy ?? null,
    reason: reason || 'Cancelled by superadmin',
    processed_at: ledgerStatus === 'processed' ? nowIso : null,
    failed_at: ledgerStatus === 'failed' ? nowIso : null,
    failure_reason: ledgerStatus === 'failed' ? `Provider status: ${providerStatus}` : null,
    metadata: {
      booking_id: bookingId,
      payment_gateway_id: order.gateway_payment_id,
      receipt: refundReceipt,
      idempotency_key: refundReceipt,
      source: 'superadmin_cancel_refund',
      provider_status: providerStatus,
      reconciled,
    },
  });

  if (insertRefundError) {
    console.error('[paid-mentorship] refund_events insert failed', {
      bookingId,
      orderId: order.id,
      refundId,
      message: insertRefundError.message,
    });
    throw new Error(
      `Refund was issued at the provider (${refundId}) but local refund ledger update failed: ${insertRefundError.message}`,
    );
  }
}

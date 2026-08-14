import 'server-only';

/**
 * LMS Razorpay Payment Provider Implementation.
 *
 * Uses Razorpay REST API directly (no SDK required).
 * All credentials are read from environment variables at call time.
 *
 * FULLY ISOLATED: LMS owns this code. No shared imports.
 *
 * Security:
 * - RAZORPAY_KEY_SECRET is NEVER exposed to client bundles
 * - NEXT_PUBLIC_RAZORPAY_KEY_ID may be used in browser code
 * - All amount calculations happen server-side
 */

import {
  LmsPaymentProvider,
  LmsGatewayOrderRequest,
  LmsGatewayOrderResponse,
  LmsPaymentVerificationRequest,
  LmsPaymentVerificationResult,
  LmsWebhookVerificationRequest,
  LmsWebhookVerificationResult,
  LmsRefundRequest,
  LmsRefundResponse,
} from './provider';

import { createHmac, timingSafeEqual } from 'crypto';

// ─── Constants ──────────────────────────────────────────────────────────────────

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

// ─── Config ─────────────────────────────────────────────────────────────────────

function getLmsConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!keyId) {
    throw new LmsRazorpayConfigError('RAZORPAY_KEY_ID is not set in environment variables.');
  }
  if (!keySecret) {
    throw new LmsRazorpayConfigError('RAZORPAY_KEY_SECRET is not set in environment variables.');
  }

  return { keyId, keySecret, webhookSecret };
}

class LmsRazorpayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LmsRazorpayConfigError';
  }
}

class LmsRazorpayApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly razorpayError?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LmsRazorpayApiError';
  }
}

// ─── HTTP Client ──────────────────────────────────────────────────────────────────

async function lmsRazorpayFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const { keyId, keySecret } = getLmsConfig();
  const method = options.method ?? 'GET';
  const url = `${RAZORPAY_API_BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorData: Record<string, unknown> = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignore parse errors
    }
    throw new LmsRazorpayApiError(
      `Razorpay API error: ${response.status} ${response.statusText}`,
      response.status,
      errorData,
    );
  }

  return response.json() as Promise<T>;
}

// ─── LMS Razorpay Provider Implementation ──────────────────────────────────────────────

class LmsRazorpayProvider implements LmsPaymentProvider {
  readonly name = 'razorpay';

  /**
   * Create an order at Razorpay.
   * POST /v1/orders
   */
  async createOrder(request: LmsGatewayOrderRequest): Promise<LmsGatewayOrderResponse> {
    const response = await lmsRazorpayFetch<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      receipt?: string;
      notes?: Record<string, string>;
      created_at: number;
      [key: string]: unknown;
    }>('/orders', {
      method: 'POST',
      body: {
        amount: request.amount_minor,
        currency: request.currency ?? 'INR',
        receipt: request.receipt ?? request.order_id,
        notes: request.notes,
      },
    });

    return {
      gateway_order_id: response.id,
      amount_minor: response.amount,
      currency: response.currency,
      status: response.status,
      raw: response as Record<string, unknown>,
    };
  }

  /**
   * Verify payment signature from Razorpay checkout response.
   *
   * Signature formula:
   * HMAC-SHA256(order_id + "|" + payment_id, key_secret)
   */
  async verifyPayment(request: LmsPaymentVerificationRequest): Promise<LmsPaymentVerificationResult> {
    const { keySecret } = getLmsConfig();
    const { gateway_order_id, gateway_payment_id, gateway_signature } = request;

    // Build the signature body
    const body = `${gateway_order_id}|${gateway_payment_id}`;

    // Compute expected signature
    const expectedSignature = createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(gateway_signature),
    );

    if (!isValid) {
      return {
        verified: false,
        status: 'failed',
        amount_minor: 0,
        raw: {
          order_id: gateway_order_id,
          payment_id: gateway_payment_id,
          signature_valid: false,
        },
      };
    }

    // Fetch payment details from gateway to get amount and status
    const paymentDetails = await this.fetchPayment(gateway_payment_id);
    const amount = (paymentDetails.amount as number) ?? 0;
    const status = (paymentDetails.status as string) ?? 'unknown';
    const method = (paymentDetails.method as string) ?? undefined;

    return {
      verified: true,
      status: status === 'captured' ? 'captured' : status === 'authorized' ? 'authorized' : 'failed',
      amount_minor: amount,
      method,
      raw: paymentDetails,
    };
  }

  /**
   * Verify Razorpay webhook signature.
   *
   * X-Razorpay-Signature = HMAC-SHA256(body, webhook_secret)
   */
  async verifyWebhook(request: LmsWebhookVerificationRequest): Promise<LmsWebhookVerificationResult> {
    const { webhookSecret } = getLmsConfig();
    const { body, signature } = request;

    if (!webhookSecret) {
      throw new LmsRazorpayConfigError(
        'RAZORPAY_WEBHOOK_SECRET is not set. Cannot verify webhook signature.',
      );
    }

    // Compute expected signature
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    // Constant-time comparison
    const isValid = timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );

    if (!isValid) {
      return {
        verified: false,
        payload: {},
        event_type: '',
        event_id: '',
      };
    }

    // Parse the payload
    const payload = JSON.parse(body) as Record<string, unknown>;
    const event = (payload.event as string) ?? '';
    const eventId = (payload.id as string) ?? '';

    return {
      verified: true,
      payload,
      event_type: event,
      event_id: eventId,
    };
  }

  /**
   * Initiate a refund via Razorpay.
   * POST /v1/payments/<payment_id>/refund
   */
  async refund(request: LmsRefundRequest): Promise<LmsRefundResponse> {
    const body: Record<string, unknown> = {
      notes: request.notes,
    };

    if (request.amount_minor !== undefined) {
      body.amount = request.amount_minor;
    }

    const response = await lmsRazorpayFetch<{
      id: string;
      status: string;
      amount: number;
      [key: string]: unknown;
    }>(`/payments/${request.gateway_payment_id}/refund`, {
      method: 'POST',
      body,
    });

    return {
      gateway_refund_id: response.id,
      status: response.status,
      amount_minor: response.amount,
      raw: response as Record<string, unknown>,
    };
  }

  /**
   * Fetch payment details from Razorpay.
   * GET /v1/payments/<payment_id>
   */
  async fetchPayment(gatewayPaymentId: string): Promise<Record<string, unknown>> {
    return lmsRazorpayFetch(`/payments/${gatewayPaymentId}`);
  }

  /**
   * Fetch order details from Razorpay.
   * GET /v1/orders/<order_id>
   */
  async fetchOrder(gatewayOrderId: string): Promise<Record<string, unknown>> {
    return lmsRazorpayFetch(`/orders/${gatewayOrderId}`);
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────────

/**
 * Get the LMS Razorpay provider instance.
 * Use this throughout the LMS instead of direct Razorpay calls.
 */
export function getLmsRazorpayProvider(): LmsRazorpayProvider {
  return new LmsRazorpayProvider();
}

/**
 * Get the public LMS Razorpay key (safe for browser exposure).
 */
export function getLmsRazorpayPublicKey(): string {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new LmsRazorpayConfigError('NEXT_PUBLIC_RAZORPAY_KEY_ID is not set.');
  }
  return keyId;
}

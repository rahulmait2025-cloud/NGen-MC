import 'server-only';

/**
 * Razorpay Payment Provider Implementation.
 * Server-only: Orders API uses RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (never exposed to client).
 * Checkout uses NEXT_PUBLIC_RAZORPAY_KEY_ID via getRazorpayPublicKey().
 */

import {
  PaymentProvider,
  GatewayOrderRequest,
  GatewayOrderResponse,
  PaymentVerificationRequest,
  PaymentVerificationResult,
  WebhookVerificationRequest,
  WebhookVerificationResult,
  RefundRequest,
  RefundResponse,
} from './provider';

import { createHmac, timingSafeEqual } from 'node:crypto';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

type RazorpayServerConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
};

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly razorpayError?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RazorpayApiError';
  }
}

/** Safe env diagnostics — never logs secrets. */
export function logRazorpayEnvCheck(context = 'razorpay'): void {
  const serverKeyId = process.env.RAZORPAY_KEY_ID?.trim() ?? '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? '';
  const publicKeyId =
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || serverKeyId;
  const serverPrefix = serverKeyId.slice(0, 8);
  const publicPrefix = publicKeyId.slice(0, 8);

  console.log(`[${context} Razorpay Env Check]`, {
    serverKeyPresent: Boolean(serverKeyId),
    serverKeyPrefix: serverPrefix || undefined,
    secretPresent: Boolean(keySecret),
    secretLength: keySecret.length,
    publicKeyPresent: Boolean(publicKeyId),
    publicKeyPrefix: publicPrefix || undefined,
    sameMode:
      serverPrefix.length >= 8 &&
      publicPrefix.length >= 8 &&
      serverPrefix === publicPrefix,
  });
}

function getServerConfig(): RazorpayServerConfig {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || undefined;

  if (!keyId || !keySecret) {
    throw new Error(
      'Missing Razorpay server credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
    );
  }

  return { keyId, keySecret, webhookSecret };
}

/** Checkout key for browser — must match server key mode (rzp_test_* vs rzp_live_*). */
export function getRazorpayPublicKey(): string {
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const serverKey = process.env.RAZORPAY_KEY_ID?.trim();
  const checkoutKey = publicKey || serverKey;

  if (!checkoutKey) {
    throw new Error(
      'Missing Razorpay checkout key. Set NEXT_PUBLIC_RAZORPAY_KEY_ID (or RAZORPAY_KEY_ID for server-only setups).',
    );
  }

  if (publicKey && serverKey && publicKey.slice(0, 8) !== serverKey.slice(0, 8)) {
    console.warn(
      '[razorpay] NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_ID mode prefix mismatch (test vs live)',
    );
  }

  return checkoutKey;
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function extractRazorpayErrorDescription(errorData: Record<string, unknown>): string | undefined {
  const err = errorData.error;
  if (err && typeof err === 'object' && err !== null) {
    const desc = (err as { description?: string }).description;
    if (desc) return desc;
    const code = (err as { code?: string }).code;
    if (code) return code;
  }
  return undefined;
}

async function razorpayFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
    logContext?: string;
  } = {},
): Promise<T> {
  const { keyId, keySecret } = getServerConfig();
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
      errorData = (await response.json()) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }

    const description = extractRazorpayErrorDescription(errorData);
    const logCtx = options.logContext ?? path;

    if (response.status === 401) {
      logRazorpayEnvCheck(`${logCtx}.401`);
      console.error('[razorpay] Orders API unauthorized', {
        route: logCtx,
        statusCode: response.status,
        description,
        serverKeyPrefix: keyId.slice(0, 8),
      });
    } else {
      console.error('[razorpay] API error', {
        route: logCtx,
        statusCode: response.status,
        description,
      });
    }

    throw new RazorpayApiError(
      description
        ? `Razorpay API error: ${response.status} ${description}`
        : `Razorpay API error: ${response.status} ${response.statusText}`,
      response.status,
      errorData,
    );
  }

  return response.json() as Promise<T>;
}

class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';

  async createOrder(request: GatewayOrderRequest): Promise<GatewayOrderResponse> {
    const receipt = (request.receipt ?? request.order_id).slice(0, 40);
    const notes = request.notes
      ? Object.fromEntries(
          Object.entries(request.notes).map(([k, v]) => [k, String(v)]),
        )
      : undefined;

    const response = await razorpayFetch<{
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
      logContext: 'razorpay.createOrder',
      body: {
        amount: request.amount_minor,
        currency: request.currency ?? 'INR',
        receipt,
        notes,
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

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    const { keySecret } = getServerConfig();
    const { gateway_order_id, gateway_payment_id, gateway_signature } = request;

    const body = `${gateway_order_id}|${gateway_payment_id}`;
    const expectedSignature = createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const isValid = signaturesMatch(expectedSignature, gateway_signature);

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

  async verifyWebhook(request: WebhookVerificationRequest): Promise<WebhookVerificationResult> {
    const { webhookSecret } = getServerConfig();
    const { body, signature } = request;

    if (!webhookSecret) {
      throw new Error(
        'RAZORPAY_WEBHOOK_SECRET is not set. Cannot verify webhook signature.',
      );
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    const isValid = signaturesMatch(expectedSignature, signature);

    if (!isValid) {
      return {
        verified: false,
        payload: {},
        event_type: '',
        event_id: '',
      };
    }

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

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const body: Record<string, unknown> = {
      notes: request.notes,
    };

    if (request.amount_minor !== undefined) {
      body.amount = request.amount_minor;
    }

    const response = await razorpayFetch<{
      id: string;
      status: string;
      amount: number;
      [key: string]: unknown;
    }>(`/payments/${request.gateway_payment_id}/refund`, {
      method: 'POST',
      logContext: 'razorpay.refund',
      body,
    });

    return {
      gateway_refund_id: response.id,
      status: response.status,
      amount_minor: response.amount,
      raw: response as Record<string, unknown>,
    };
  }

  async fetchPayment(gatewayPaymentId: string): Promise<Record<string, unknown>> {
    return razorpayFetch(`/payments/${gatewayPaymentId}`, {
      logContext: 'razorpay.fetchPayment',
    });
  }

  async fetchOrder(gatewayOrderId: string): Promise<Record<string, unknown>> {
    return razorpayFetch(`/orders/${gatewayOrderId}`, {
      logContext: 'razorpay.fetchOrder',
    });
  }
}

export function getRazorpayProvider(): RazorpayProvider {
  return new RazorpayProvider();
}

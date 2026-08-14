import 'server-only';

/**
 * CollegeAdmin Payment Provider Interface.
 *
 * Defines the interface all payment providers must implement
 * for the CollegeAdmin commerce system.
 *
 * FULLY ISOLATED — no imports from shared lib/payments/.
 */

export interface CollegeGatewayOrderRequest {
  /** Unique order reference (your system's order ID). */
  order_id: string;
  /** Amount in smallest currency unit (paise for INR). */
  amount_minor: number;
  /** Currency code (default: INR). */
  currency?: string;
  /** Receipt/reference for this order. */
  receipt?: string;
  /** Key-value notes for the gateway. */
  notes?: Record<string, string>;
}

export interface CollegeGatewayOrderResponse {
  /** Gateway's order ID. */
  gateway_order_id: string;
  /** Amount in minor units. */
  amount_minor: number;
  /** Currency code. */
  currency: string;
  /** Order status at gateway. */
  status: string;
  /** Raw gateway response for audit. */
  raw: Record<string, unknown>;
}

export interface CollegePaymentVerificationRequest {
  /** Razorpay order ID. */
  gateway_order_id: string;
  /** Razorpay payment ID. */
  gateway_payment_id: string;
  /** Razorpay signature from checkout response. */
  gateway_signature: string;
}

export interface CollegePaymentVerificationResult {
  /** Whether the signature is valid. */
  verified: boolean;
  /** Payment status from gateway. */
  status: 'captured' | 'authorized' | 'failed';
  /** Amount captured in minor units. */
  amount_minor: number;
  /** Payment method (card, upi, netbanking, wallet). */
  method?: string;
  /** Raw gateway payload for audit. */
  raw: Record<string, unknown>;
}

export interface CollegeWebhookVerificationRequest {
  /** Raw webhook body string. */
  body: string;
  /** X-Razorpay-Signature header value. */
  signature: string;
  /** Webhook secret from dashboard. */
  webhook_secret: string;
}

export interface CollegeWebhookVerificationResult {
  /** Whether the webhook signature is valid. */
  verified: boolean;
  /** Parsed event payload. */
  payload: Record<string, unknown>;
  /** Event type string (e.g., 'payment.captured'). */
  event_type: string;
  /** Unique event ID from gateway. */
  event_id: string;
}

export interface CollegeRefundRequest {
  /** Gateway payment ID to refund. */
  gateway_payment_id: string;
  /** Refund amount in minor units (full refund if omitted). */
  amount_minor?: number;
  /** Reason for the refund. */
  notes?: Record<string, string>;
}

export interface CollegeRefundResponse {
  /** Gateway refund ID. */
  gateway_refund_id: string;
  /** Refund status. */
  status: string;
  /** Amount refunded in minor units. */
  amount_minor: number;
  /** Raw gateway response. */
  raw: Record<string, unknown>;
}

/**
 * CollegeAdmin payment provider interface.
 * All providers must implement these methods.
 */
export interface CollegePaymentProvider {
  /** Provider name (e.g., 'razorpay', 'stripe'). */
  readonly name: string;

  /**
   * Create an order at the payment gateway.
   * Does NOT charge the customer — only reserves the order.
   */
  createOrder(request: CollegeGatewayOrderRequest): Promise<CollegeGatewayOrderResponse>;

  /**
   * Verify a payment signature returned by the gateway checkout.
   * Returns verification result with status and raw payload.
   */
  verifyPayment(request: CollegePaymentVerificationRequest): Promise<CollegePaymentVerificationResult>;

  /**
   * Verify an incoming webhook signature.
   * Returns parsed event details for downstream processing.
   */
  verifyWebhook(request: CollegeWebhookVerificationRequest): Promise<CollegeWebhookVerificationResult>;

  /**
   * Initiate a refund for a previously captured payment.
   */
  refund(request: CollegeRefundRequest): Promise<CollegeRefundResponse>;

  /**
   * Fetch payment details from the gateway by payment ID.
   */
  fetchPayment(gatewayPaymentId: string): Promise<Record<string, unknown>>;

  /**
   * Fetch order details from the gateway by order ID.
   */
  fetchOrder(gatewayOrderId: string): Promise<Record<string, unknown>>;
}

/**
 * Shared Razorpay Checkout script loader.
 * LMS-local only — no cross-app sharing.
 *
 * Reuses the same Promise across all checkout components.
 * If script already exists in DOM, resolves immediately.
 * Prevents duplicate script injection.
 */

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let razorpayScriptPromise: Promise<void> | null = null;

function onScriptLoad(script: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout script.')), { once: true });
  });
}

/**
 * Preload the Razorpay Checkout script.
 * Safe to call multiple times — returns the same Promise.
 * No-op on server.
 */
export function preloadRazorpayCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // Already loaded
  if (window.Razorpay) return Promise.resolve();

  // Already loading
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    // Check if script tag already exists in DOM
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_URL}"]`,
    );

    if (existing) {
      // Script tag exists — wait for it to load
      onScriptLoad(existing).then(resolve, reject);
      return;
    }

    // Create new script tag
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;

    onScriptLoad(script).then(resolve, reject);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

/**
 * Check if Razorpay is already available.
 */
export function isRazorpayReady(): boolean {
  return typeof window !== 'undefined' && !!window.Razorpay;
}

export interface RazorpayPaymentFailedResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

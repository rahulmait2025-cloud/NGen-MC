declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// ── helpers ──────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';

function gtagReady(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function' && GA_ID !== '';
}

function debugLog(action: string, detail?: Record<string, unknown>) {
  if (!isDev) return;
  console.debug(
    `%c[GA4 Debug]%c ${action}`,
    'color:#f97316;font-weight:bold',
    'color:inherit',
    detail ?? '',
  );
}

// ── core ─────────────────────────────────────────────────────────────
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (!gtagReady()) {
    debugLog(`SKIP ${eventName} — gtag not ready`, params);
    return;
  }
  const payload = { ...params, send_to: GA_ID };
  window.gtag!('event', eventName, payload);
  debugLog(`EVENT ${eventName}`, payload);
}

export function trackPageView(path: string, title?: string): void {
  if (!gtagReady()) {
    debugLog('SKIP page_view — gtag not ready', { path });
    return;
  }
  const payload = {
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : '',
    page_title: title ?? '',
    send_to: GA_ID,
  };
  window.gtag!('event', 'page_view', payload);
  debugLog('PAGE_VIEW', payload);
}

// ── section tracking ─────────────────────────────────────────────────
export function trackSectionView(params: {
  section_name: string;
  page_name?: string;
  current_path?: string;
  referrer?: string;
}): void {
  trackEvent('section_view', params as Record<string, string | undefined>);
}

export function trackSectionEngaged(params: {
  section_name: string;
  page_name?: string;
  current_path?: string;
  referrer?: string;
}): void {
  trackEvent('section_engaged', params as Record<string, string | undefined>);
}

export function trackSectionCtaClick(params: {
  section_name: string;
  cta_name: string;
  cta_location?: string;
  page_name?: string;
  current_path?: string;
}): void {
  trackEvent('section_cta_click', params as Record<string, string | undefined>);
}

// ── scroll depth ─────────────────────────────────────────────────────
export function trackScrollDepth(percent: number): void {
  trackEvent('scroll_depth', { depth_percent: percent });
}

// ── CTA clicks ───────────────────────────────────────────────────────
export function trackCtaClick(params: {
  cta_name: string;
  cta_location: string;
  page_name?: string;
  current_path?: string;
}): void {
  trackEvent('cta_click', params as Record<string, string | undefined>);
}

// ── form events ──────────────────────────────────────────────────────
export function trackFormOpen(formName: string, formLocation?: string): void {
  trackEvent('form_open', { form_name: formName, form_location: formLocation });
}

export function trackFormSubmit(formName: string, formLocation?: string): void {
  trackEvent('form_submit', { form_name: formName, form_location: formLocation });
}

export function trackFormSuccess(formName: string, formLocation?: string): void {
  trackEvent('form_success', { form_name: formName, form_location: formLocation });
}

export function trackFormFailure(formName: string, formLocation?: string, errorMessage?: string): void {
  trackEvent('form_failure', {
    form_name: formName,
    form_location: formLocation,
    error_message: errorMessage,
  });
}

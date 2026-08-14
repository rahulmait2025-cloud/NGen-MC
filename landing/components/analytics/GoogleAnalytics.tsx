'use client';

import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';

/**
 * Loads the GA4 gtag.js script and initialises the dataLayer.
 * - send_page_view is disabled; page views are sent manually by AnalyticsInit.
 * - debug_mode is enabled only in development so events appear in GA4 DebugView.
 * - Renders nothing when GA_ID is missing (safe for local dev without env).
 */
export function GoogleAnalytics() {
  if (!GA_ID) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GA4] NEXT_PUBLIC_GA_MEASUREMENT_ID is not set — analytics disabled.');
    }
    return null;
  }

  return (
    <>
      <Script
        id="ga4-gtag-js"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            send_page_view: false,
            ${process.env.NODE_ENV === 'development' ? "debug_mode: true," : ''}
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}

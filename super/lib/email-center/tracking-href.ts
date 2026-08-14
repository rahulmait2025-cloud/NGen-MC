/**
 * Pure helpers for click-tracking URL rewrites (no DB / server-only).
 * Only rewrite href attribute values — never visible link text or other attributes.
 */

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Collect unique absolute http(s) hrefs from HTML, excluding tracking/unsubscribe/anchors.
 */
export function collectTrackableHrefs(
  html: string,
  options: { baseUrl: string; unsubscribeUrl?: string },
): string[] {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const uniqueUrls = new Set<string>();

  for (const match of html.matchAll(linkRegex)) {
    const url = match[1].trim();
    const isHttp = url.startsWith('http://') || url.startsWith('https://');
    if (!isHttp) continue;
    if (url.startsWith(baseUrl)) continue;
    if (options.unsubscribeUrl && url === options.unsubscribeUrl) continue;
    if (url === '#') continue;
    uniqueUrls.add(url);
  }

  // Longer URLs first so a short URL is not a prefix of a longer one during rewrite.
  return Array.from(uniqueUrls).sort((a, b) => b.length - a.length);
}

/**
 * Replace href="original" / href='original' with the tracking URL.
 * Does not rewrite link text, img src, or other attribute values.
 */
export function rewriteHrefToTrackingUrl(
  html: string,
  originalUrl: string,
  trackingUrl: string,
): string {
  const escaped = escapeRegExp(originalUrl);
  const hrefPattern = new RegExp(`(href\\s*=\\s*["'])${escaped}(["'])`, 'gi');
  return html.replace(hrefPattern, `$1${trackingUrl}$2`);
}

export function applyClickTrackingRewrites(
  html: string,
  entries: ReadonlyArray<{ originalUrl: string; trackingUrl: string }>,
): string {
  let processed = html;
  const ordered = [...entries].sort((a, b) => b.originalUrl.length - a.originalUrl.length);
  for (const { originalUrl, trackingUrl } of ordered) {
    processed = rewriteHrefToTrackingUrl(processed, originalUrl, trackingUrl);
  }
  return processed;
}

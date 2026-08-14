import createDOMPurify from 'dompurify';
import { HTML_PREVIEW_SANITIZE_OPTIONS } from './sanitize-html-config';

/** Client-safe HTML sanitizer for compose preview (no server-only / no jsdom). */
export function sanitizeHtmlForPreview(html: string): string {
  if (typeof window === 'undefined') {
    return html;
  }
  return createDOMPurify(window).sanitize(html, HTML_PREVIEW_SANITIZE_OPTIONS);
}

import type DOMPurify from 'dompurify';
import { COMPOSER_BODY_SANITIZE_OPTIONS, HTML_PREVIEW_SANITIZE_OPTIONS } from './sanitize-html-config';
import { MAX_COMPOSER_BODY_HTML_CHARS } from './custom-composer';

let DOMPurifyInstance: ReturnType<typeof DOMPurify> | null = null;

async function getDOMPurify() {
  if (DOMPurifyInstance) return DOMPurifyInstance;
  const createDOMPurify = (await import('dompurify')).default;
  const { JSDOM } = await import('jsdom');
  const window = new JSDOM('').window;
  // jsdom Window satisfies DOMPurify's WindowLike at runtime; cast avoids DOM lib mismatch.
  DOMPurifyInstance = createDOMPurify(window as unknown as Parameters<typeof createDOMPurify>[0]);
  return DOMPurifyInstance;
}

function hardenAnchorAttributes(node: Element) {
  if (node.tagName !== 'A') return;
  const href = node.getAttribute('href') ?? '';
  const lower = href.trim().toLowerCase();
  const isMerge = /^\{\{\w+\}\}$/.test(href.trim());
  const isHttps = /^https:\/\//i.test(href.trim());
  const isMailto = /^mailto:/i.test(href.trim());
  const isHash = href.trim().startsWith('#');
  if (!isMerge && !isHttps && !isMailto && !isHash) {
    node.removeAttribute('href');
  }
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    node.removeAttribute('href');
  }
  if (node.getAttribute('href')) {
    node.setAttribute('rel', 'noopener noreferrer');
    if (!node.getAttribute('target')) {
      node.setAttribute('target', '_blank');
    }
  }
}

export async function sanitizeHtmlForPreview(html: string): Promise<string> {
  const purify = await getDOMPurify();
  return purify.sanitize(html, HTML_PREVIEW_SANITIZE_OPTIONS);
}

export async function sanitizeHtml(html: string): Promise<string> {
  const purify = await getDOMPurify();
  return purify.sanitize(html, HTML_PREVIEW_SANITIZE_OPTIONS);
}

/** Server-side sanitisation for Custom Email body fragments (security boundary). */
export async function sanitizeComposerBodyHtml(html: string): Promise<string> {
  if (html.length > MAX_COMPOSER_BODY_HTML_CHARS) {
    throw new Error(`Email body exceeds maximum size of ${MAX_COMPOSER_BODY_HTML_CHARS} characters`);
  }
  const purify = await getDOMPurify();
  purify.addHook('afterSanitizeAttributes', hardenAnchorAttributes);
  try {
    return purify.sanitize(html, COMPOSER_BODY_SANITIZE_OPTIONS);
  } finally {
    purify.removeHook('afterSanitizeAttributes');
  }
}

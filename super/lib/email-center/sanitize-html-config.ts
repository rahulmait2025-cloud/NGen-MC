/** Shared DOMPurify options for Email Center HTML preview (client + server). */

export const HTML_PREVIEW_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'hr', 'sup', 'sub', 's', 'strike',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
};

/**
 * Stricter allowlist for Custom Email body fragments (inside branded shell).
 * No scripts, forms, iframes, or event handlers. Links restricted via hook.
 */
export const COMPOSER_BODY_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'hr', 'span', 'div',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: [
    'script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed',
    'svg', 'math', 'link', 'meta', 'base', 'video', 'audio', 'source',
  ],
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onmouseenter', 'onmouseleave',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|{{[\w]+}}|#)/i,
};

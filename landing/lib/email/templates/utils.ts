export type EmailTemplateResult = {
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(value: unknown): string {
  const input = String(value ?? '');
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeText(value: unknown, fallback = ''): string {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

export function safeUrl(value: unknown, fallback = ''): string {
  const nextValue = normalizeText(value, fallback);
  if (!nextValue) return fallback;
  if (/^https?:\/\//i.test(nextValue) || /^mailto:/i.test(nextValue)) {
    return nextValue;
  }
  return fallback;
}

export function formatLeadValue(value: unknown, fallback = 'N/A'): string {
  return normalizeText(value, fallback);
}

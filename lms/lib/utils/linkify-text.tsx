import type { ReactNode } from 'react';

/** Match http(s) URLs; stop before common trailing punctuation. */
const URL_PATTERN =
  /https?:\/\/[^\s<>"')\]]+/gi;

function trimTrailingPunctuation(url: string): { href: string; trailing: string } {
  let href = url;
  let trailing = '';
  while (/[.,;:!?)]$/.test(href)) {
    trailing = href.slice(-1) + trailing;
    href = href.slice(0, -1);
  }
  return { href, trailing };
}

/**
 * Turn plain-text http(s) URLs into clickable anchors.
 * Safe for untrusted description strings (no HTML parsing).
 */
export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const { href, trailing } = trimTrailingPunctuation(raw);
    nodes.push(
      <a
        key={`link-${start}-${href}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-semibold text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
      >
        {href}
      </a>,
    );
    if (trailing) {
      nodes.push(trailing);
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

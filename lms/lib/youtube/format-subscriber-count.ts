export const SUBSCRIBER_FALLBACK_DISPLAY = '100K+';

/** Parse compact display strings like `125K+` or `1.2M+` for fallback animation targets. */
export function parseCompactCountDisplay(display: string): number | null {
  const match = display.trim().match(/^([\d.]+)\s*(K|M)\+?$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2]?.toUpperCase();
  if (unit === 'M') return Math.round(value * 1_000_000);
  if (unit === 'K') return Math.round(value * 1_000);
  return Math.round(value);
}

export function formatSubscriberCountCompact(count: number): string {
  if (!Number.isFinite(count) || count < 0) return SUBSCRIBER_FALLBACK_DISPLAY;
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    if (millions >= 10) return `${Math.floor(millions)}M+`;
    const rounded = Math.round(millions * 10) / 10;
    return `${rounded % 1 === 0 ? Math.floor(rounded) : rounded}M+`;
  }
  if (count >= 1_000) {
    const thousands = count / 1_000;
    if (thousands >= 100) return `${Math.floor(thousands)}K+`;
    const rounded = Math.round(thousands * 10) / 10;
    return `${rounded % 1 === 0 ? Math.floor(rounded) : rounded}K+`;
  }
  return `${count}+`;
}

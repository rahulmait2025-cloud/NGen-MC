/** Display helpers for Learning Analytics UI (no DB access). */

export function formatWatchHours(hours: number): string {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return '0h';
  return `${h.toLocaleString('en-IN', { maximumFractionDigits: 1 })}h`;
}

export function formatPercent(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
}

export function formatActivityDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDurationSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function formatLearningTimeCompact(seconds: number): string {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  if (safeSeconds === 0) return '0m';
  if (safeSeconds < 60) return '<1m';
  if (safeSeconds < 3600) return `${Math.round(safeSeconds / 60)}m`;

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.round((safeSeconds % 3600) / 60);
  if (minutes === 60) return `${hours + 1}h`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDecimalHours(seconds: number, decimals = 1): string {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return (safeSeconds / 3600).toFixed(decimals);
}

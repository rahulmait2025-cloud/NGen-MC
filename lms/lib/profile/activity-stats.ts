function dayBefore(isoDay: string): string {
  const d = new Date(`${isoDay}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Current streak ending today or yesterday; best consecutive run in history. */
export function computeStreaks(daySet: Set<string>): { current: number; best: number } {
  if (daySet.size === 0) return { current: 0, best: 0 };

  const sorted = Array.from(daySet).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T12:00:00.000Z`);
    const cur = new Date(`${sorted[i]}T12:00:00.000Z`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
      best = Math.max(best, run);
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = dayBefore(today);
  let anchor: string | null = null;
  if (daySet.has(today)) anchor = today;
  else if (daySet.has(yesterday)) anchor = yesterday;

  let current = 0;
  if (anchor) {
    let cursor = anchor;
    while (daySet.has(cursor)) {
      current++;
      cursor = dayBefore(cursor);
    }
  }

  return { current, best: Math.max(best, current) };
}

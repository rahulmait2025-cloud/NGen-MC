import 'server-only';

export function getCurrentYearInIndia(): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
    }).format(new Date()),
  );
}

import 'server-only';

export const APPLICATION_TIMEZONE = process.env.STREAK_TIMEZONE?.trim() || 'Asia/Kolkata';

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dateFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone });
    dateFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function getDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dateTimeFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    dateTimeFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function toApplicationLocalDate(date: Date, timeZone = APPLICATION_TIMEZONE): string {
  return getDateFormatter(timeZone).format(date);
}

export function getTodayApplicationLocalDate(timeZone = APPLICATION_TIMEZONE): string {
  return toApplicationLocalDate(new Date(), timeZone);
}

function parseLocalDate(localDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = localDate.split('-').map(Number);
  return { year, month, day };
}

export function addLocalDays(localDate: string, days: number): string {
  const { year, month, day } = parseLocalDate(localDate);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function startOfLocalMonth(localDate: string): string {
  return `${localDate.slice(0, 7)}-01`;
}

export function startOfNextLocalMonth(localDate: string): string {
  const { year, month } = parseLocalDate(localDate);
  const date = new Date(Date.UTC(year, month, 1, 12, 0, 0));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function getMondayOnOrBefore(localDate: string): string {
  const { year, month, day } = parseLocalDate(localDate);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = date.getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return addLocalDays(localDate, -daysSinceMonday);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getDateTimeFormatter(timeZone).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(values.get('year'));
  const month = Number(values.get('month'));
  const day = Number(values.get('day'));
  const hour = Number(values.get('hour')) % 24;
  const minute = Number(values.get('minute'));
  const second = Number(values.get('second'));
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

export function localDateTimeToUtc(
  localDate: string,
  timeZone = APPLICATION_TIMEZONE,
  time: { hour?: number; minute?: number; second?: number; millisecond?: number } = {},
): Date {
  const { year, month, day } = parseLocalDate(localDate);
  const utcGuess = new Date(Date.UTC(
    year,
    month - 1,
    day,
    time.hour ?? 0,
    time.minute ?? 0,
    time.second ?? 0,
    time.millisecond ?? 0,
  ));
  const firstOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const firstPass = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstPass, timeZone);
  return new Date(utcGuess.getTime() - secondOffset);
}

export function getLocalWeekBoundsUtc(localDate = getTodayApplicationLocalDate(), timeZone = APPLICATION_TIMEZONE) {
  const weekStartLocalDate = getMondayOnOrBefore(localDate);
  const nextWeekStartLocalDate = addLocalDays(weekStartLocalDate, 7);
  return {
    weekStartLocalDate,
    nextWeekStartLocalDate,
    weekStartUtc: localDateTimeToUtc(weekStartLocalDate, timeZone),
    nextWeekStartUtc: localDateTimeToUtc(nextWeekStartLocalDate, timeZone),
  };
}

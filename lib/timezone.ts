import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { addDays, parseISO } from 'date-fns';

// All business logic (today/tomorrow, booking deadlines, occurrence dates,
// attendance) uses this fixed timezone — never the visiting browser's
// timezone. See ARCHITECTURE.md §7.
export const APP_TIMEZONE = 'Asia/Dhaka';

/** Current instant converted to the app timezone. */
export function dhakaNow(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/** Today's calendar date (Asia/Dhaka) at midnight, as a plain Date usable for DB date columns. */
export function dhakaToday(): Date {
  return dhakaDateOnly(new Date());
}

/** Tomorrow's calendar date (Asia/Dhaka) at midnight. */
export function dhakaTomorrow(): Date {
  return addDays(dhakaToday(), 1);
}

/** Truncate an instant to its Asia/Dhaka calendar date (stored as UTC midnight for that date). */
export function dhakaDateOnly(instant: Date): Date {
  const zoned = toZonedTime(instant, APP_TIMEZONE);
  const y = zoned.getFullYear();
  const m = zoned.getMonth();
  const d = zoned.getDate();
  // Store as a UTC-midnight Date representing the Dhaka calendar date, so
  // Postgres `date`/`timestamp` comparisons stay purely calendar-based.
  return new Date(Date.UTC(y, m, d));
}

/** Format a stored calendar-date column for display, e.g. "Sun, 23 Aug 2026". */
export function formatDhakaDate(date: Date): string {
  return format(date, 'EEE, d MMM yyyy', { timeZone: 'UTC' });
}

/** Parse a "yyyy-MM-dd" string into a Dhaka calendar-date Date. */
export function parseDhakaDateString(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

/** ISO "yyyy-MM-dd" for a stored calendar-date column. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd', { timeZone: 'UTC' });
}

export function isFutureCalendarDate(date: Date, referenceToday = dhakaToday()): boolean {
  return date.getTime() > referenceToday.getTime();
}

/** JS getDay() index (0=Sun) is not used anywhere for business logic — see Weekday enum ordering. */
export const WEEKDAY_JS_INDEX: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const JS_INDEX_WEEKDAY = Object.fromEntries(
  Object.entries(WEEKDAY_JS_INDEX).map(([k, v]) => [v, k])
) as Record<number, string>;

/** Weekday (Prisma enum string) of a Dhaka calendar-date Date. */
export function dhakaWeekdayOf(date: Date): string {
  // date is stored as UTC-midnight representing the Dhaka calendar date, so
  // UTC getDay() gives the correct weekday directly.
  return JS_INDEX_WEEKDAY[date.getUTCDay()]!;
}

export { parseISO };

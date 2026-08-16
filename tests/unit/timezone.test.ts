import { describe, it, expect } from 'vitest';
import { dhakaToday, dhakaTomorrow, dhakaWeekdayOf, toDateKey, isFutureCalendarDate, parseDhakaDateString } from '@/lib/timezone';
import { addDays } from 'date-fns';

describe('timezone helpers (Asia/Dhaka, calendar-day based)', () => {
  it('dhakaTomorrow is exactly one calendar day after dhakaToday', () => {
    const today = dhakaToday();
    const tomorrow = dhakaTomorrow();
    expect(tomorrow.getTime() - today.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('isFutureCalendarDate rejects today (calendar-day rule, not rolling 24h)', () => {
    const today = dhakaToday();
    expect(isFutureCalendarDate(today, today)).toBe(false);
  });

  it('isFutureCalendarDate accepts tomorrow', () => {
    const today = dhakaToday();
    const tomorrow = addDays(today, 1);
    expect(isFutureCalendarDate(tomorrow, today)).toBe(true);
  });

  it('toDateKey/parseDhakaDateString round-trip', () => {
    const date = parseDhakaDateString('2026-08-23');
    expect(toDateKey(date)).toBe('2026-08-23');
  });

  it('dhakaWeekdayOf maps known dates to the correct weekday', () => {
    // 2026-08-23 is a Sunday.
    const date = parseDhakaDateString('2026-08-23');
    expect(dhakaWeekdayOf(date)).toBe('SUNDAY');
  });
});

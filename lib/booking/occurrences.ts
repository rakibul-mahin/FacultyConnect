import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { addDays } from 'date-fns';
import { dhakaTomorrow, dhakaWeekdayOf } from '@/lib/timezone';

/**
 * By product decision, students (and faculty) never browse or book far into
 * the future — only the single next upcoming occurrence of each weekly
 * consultation slot is ever visible. A 7-calendar-day span starting
 * tomorrow always contains every weekday exactly once, so it always
 * materializes exactly the next occurrence per slot, no more.
 */
export const BOOKING_WINDOW_DAYS = 7;

function bookingWindow() {
  const start = dhakaTomorrow();
  const end = addDays(start, BOOKING_WINDOW_DAYS - 1);
  return { start, end };
}

/**
 * Lazily/idempotently materializes ConsultationOccurrence rows for every
 * CONSULTATION RoutineEntry of a faculty member across [tomorrow,
 * tomorrow+6] — i.e. only ever the next occurrence per weekly slot. No cron
 * required — see ARCHITECTURE.md §4. Safe to call on every relevant page
 * load; upsert on the (routineEntryId, date) unique constraint makes repeat
 * calls a no-op for dates that already exist. Because this window rolls
 * forward by exactly one day on every call, "tomorrow" is always captured
 * before it becomes "today", so nothing is ever missed.
 */
export async function ensureOccurrences(facultyId: string) {
  const consultationEntries = await prisma.routineEntry.findMany({
    where: { facultyId, type: 'CONSULTATION' },
  });

  const { start, end } = bookingWindow();

  if (consultationEntries.length > 0) {
    const dates: Date[] = [];
    for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) dates.push(addDays(start, i));

    const entriesByDay = new Map<string, typeof consultationEntries>();
    for (const entry of consultationEntries) {
      const arr = entriesByDay.get(entry.day) ?? [];
      arr.push(entry);
      entriesByDay.set(entry.day, arr);
    }

    const ops = [];
    for (const date of dates) {
      const weekday = dhakaWeekdayOf(date);
      const entries = entriesByDay.get(weekday);
      if (!entries) continue;
      for (const entry of entries) {
        ops.push(
          prisma.consultationOccurrence.upsert({
            where: { routineEntryId_date: { routineEntryId: entry.id, date } },
            update: {},
            create: {
              routineEntryId: entry.id,
              facultyId,
              date,
              startSlot: entry.startSlot,
              capacity: entry.capacity ?? 1,
            },
          })
        );
      }
    }

    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }
  }

  // Self-healing: remove any previously over-generated far-future
  // occurrences beyond the near-term window that nobody has booked, so a
  // narrower window takes effect immediately instead of only for newly
  // created rows. Never touches occurrences with a confirmed booking.
  await prisma.consultationOccurrence.deleteMany({
    where: {
      facultyId,
      status: 'OPEN',
      date: { gt: end },
      bookings: { none: { status: 'CONFIRMED' } },
    },
  });
}

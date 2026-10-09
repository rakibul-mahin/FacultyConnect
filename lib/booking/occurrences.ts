import 'server-only';
import { prisma } from '@/lib/db/prisma';
import type { Prisma, RoutineEntry } from '@prisma/client';
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
export async function ensureOccurrences(
  facultyId: string,
  /** Pass the faculty's routine entries when the caller already loaded them, to skip a round trip. */
  routineEntries?: RoutineEntry[]
) {
  const consultationEntries = (
    routineEntries ?? (await prisma.routineEntry.findMany({ where: { facultyId, type: 'CONSULTATION' } }))
  ).filter((entry) => entry.type === 'CONSULTATION');

  const { start, end } = bookingWindow();

  const rows: Prisma.ConsultationOccurrenceCreateManyInput[] = [];
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const date = addDays(start, i);
    const weekday = dhakaWeekdayOf(date);
    for (const entry of consultationEntries) {
      if (entry.day !== weekday) continue;
      rows.push({
        routineEntryId: entry.id,
        facultyId,
        date,
        startSlot: entry.startSlot,
        capacity: entry.capacity ?? 1,
      });
    }
  }

  // One INSERT for the whole window; rows that already exist hit the
  // (routineEntryId, date) unique constraint and are skipped, leaving them
  // untouched. Runs alongside the cleanup below — the two never touch the
  // same rows (inside vs. beyond the window).
  await Promise.all([
    rows.length > 0 ? prisma.consultationOccurrence.createMany({ data: rows, skipDuplicates: true }) : null,
    // Self-healing: remove any previously over-generated far-future
    // occurrences beyond the near-term window that nobody has booked, so a
    // narrower window takes effect immediately instead of only for newly
    // created rows. Never touches occurrences with a confirmed booking.
    prisma.consultationOccurrence.deleteMany({
      where: {
        facultyId,
        status: 'OPEN',
        date: { gt: end },
        bookings: { none: { status: 'CONFIRMED' } },
      },
    }),
  ]);
}
